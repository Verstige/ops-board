/**
 * Add tasks to ops-board via seed script
 * Run: npx tsx prisma/seed-tasks.ts
 * 
 * These tasks are appended to the existing seed data.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const julylan = await prisma.user.findUnique({ where: { email: "julylan@openlocal.com" } });
  const opsBoard = await prisma.project.findUnique({ where: { id: "ops-board" } });

  if (!julylan || !opsBoard) {
    console.error("Julylan user or ops-board project not found. Run full seed first.");
    process.exit(1);
  }

  const tasks = [
    {
      title: "Fix notes board — shared Chrissy notes not visible",
      description: "Julylan cannot see Chrissy's shared notes from the Vault/Notes page. The notes list API uses `isShared: true` but when a projectId filter is active, shared notes with a different/null projectId are filtered out. Fix: adjust the OR condition in GET /api/notes to show shared notes regardless of projectId when filter is active, OR remove projectId constraint for shared notes.",
      status: "TODO",
      priority: "HIGH",
      assigneeId: julylan.id,
      projectId: opsBoard.id,
      notes: "Bug: GET /api/notes?projectId=X → OR constraint wrongly scopes isShared check to projectId=X. Should show own notes + ALL shared notes, then filter by projectId only for project-scoped notes.",
    },
  ];

  for (const t of tasks) {
    const existing = await prisma.task.findFirst({
      where: { title: t.title, assigneeId: t.assigneeId },
    });
    if (existing) {
      console.log(`Task already exists: ${t.title}`);
    } else {
      await prisma.task.create({ data: t as any });
      console.log(`Created: ${t.title}`);
    }
  }

  console.log("\nDone!");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
