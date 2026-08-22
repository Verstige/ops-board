/**
 * Ops Board — Database Seed
 * Run: npx tsx prisma/seed.ts
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding ops-board...");

  // Create Julylan (CTO)
  const julylan = await prisma.user.upsert({
    where: { email: "julylan@openlocal.com" },
    update: {},
    create: {
      name: "Julylan Johnson",
      email: "julylan@openlocal.com",
      passwordHash: await bcrypt.hash("julylan888", 12),
      role: "ADMIN",
    },
  });

  // Create Chrissy (CEO)
  const chrissy = await prisma.user.upsert({
    where: { email: "chrissy@openlocal.com" },
    update: {},
    create: {
      name: "Christian Artiles",
      email: "chrissy@openlocal.com",
      passwordHash: await bcrypt.hash("chrissy888", 12),
      role: "ADMIN",
    },
  });

  console.log(`✅ Users created: julylan + chrissy`);

  // Create Open Local Platform project
  const openLocal = await prisma.project.upsert({
    where: { id: "open-local-platform" },
    update: {},
    create: {
      id: "open-local-platform",
      name: "Open Local Platform",
      description: "Core marketplace platform — farmers, vendors, consumers",
      repoUrl: "https://github.com/open-local/platform",
      color: "#22c55e",
    },
  });

  // Create Ops Board itself as a project
  const opsBoard = await prisma.project.upsert({
    where: { id: "ops-board" },
    update: {},
    create: {
      id: "ops-board",
      name: "Ops Board",
      description: "Internal project management tool for CTO + CEO",
      repoUrl: "https://github.com/Verstige/ops-board",
      color: "#5c7cfa",
    },
  });

  console.log(`✅ Projects created`);

  // Seed some sample tasks
  const tasks = [
    {
      title: "Set up Railway Postgres for Ops Board",
      description: "Deploy PostgreSQL instance on Railway for ops-board app",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assigneeId: julylan.id,
      projectId: opsBoard.id,
    },
    {
      title: "Build kanban task board UI",
      description: "Drag-and-drop kanban: TODO / IN_PROGRESS / DONE / BLOCKED",
      status: "TODO",
      priority: "HIGH",
      assigneeId: julylan.id,
      projectId: opsBoard.id,
    },
    {
      title: "GitHub commit integration",
      description: "Pull commits, issues, PRs via Octokit and display per project",
      status: "TODO",
      priority: "MEDIUM",
      assigneeId: julylan.id,
      projectId: opsBoard.id,
    },
    {
      title: "CEO onboarding — Chrissy access",
      description: "Add Chrissy as ADMIN, share credentials, walkthrough demo",
      status: "TODO",
      priority: "HIGH",
      assigneeId: chrissy.id,
      projectId: opsBoard.id,
    },
    {
      title: "Platform tech stack review",
      description: "Audit existing Open Local codebase — tech stack, architecture, debt",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assigneeId: julylan.id,
      projectId: openLocal.id,
    },
    {
      title: "90-day milestone plan",
      description: "Draft milestones for CTO evaluation period per Section IX of framework",
      status: "TODO",
      priority: "URGENT",
      assigneeId: chrissy.id,
      projectId: openLocal.id,
    },
  ];

  for (const task of tasks) {
    await prisma.task.create({ data: task });
  }

  console.log(`✅ Sample tasks created`);

  // Seed a calendar event
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 5);

  await prisma.calendarEvent.create({
    data: {
      title: "CTO 90-Day Kickoff",
      description: "Review evaluation period milestones, role expectations, first sprint plan",
      start: nextWeek,
      end: new Date(nextWeek.getTime() + 60 * 60 * 1000),
      allDay: false,
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      projectId: openLocal.id,
      organizerId: chrissy.id,
    },
  });

  console.log(`✅ Calendar event created`);

  // Seed a note
  await prisma.note.create({
    data: {
      title: "Ops Board — Tech Decisions",
      content:
        "## Decisions\n\n- NextAuth v4 (same as HW888 — consistent pattern)\n- Prisma 7 + pg pool\n- Railway for hosting\n- Tailwind + shadcn-style components\n- GitHub integration via Octokit\n\n## Future\n- Linear API for issue sync\n- Slack notifications",
      isShared: true,
      projectId: opsBoard.id,
      authorId: julylan.id,
    },
  });

  console.log(`✅ Notes created`);
  console.log("\n🎉 Seed complete!");
  console.log("\n📋 Login credentials:");
  console.log("  Julylan: julylan@openlocal.com / julylan888");
  console.log("  Chrissy:  chrissy@openlocal.com / chrissy888");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
