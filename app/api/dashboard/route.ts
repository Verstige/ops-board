import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [tasks, projects, events, notes] = await Promise.all([
    prisma.task.count({ where: { status: { not: "DONE" } } }),
    prisma.project.count(),
    prisma.calendarEvent.count({ where: { start: { gte: new Date() } } }),
    prisma.note.count({ where: { OR: [{ authorId: (session.user as any).id }, { isShared: true }] } }),
  ]);

  return NextResponse.json({ tasks, projects, events, notes });
}
