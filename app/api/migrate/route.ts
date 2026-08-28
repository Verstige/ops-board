import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [logs, entries, sessions] = await Promise.all([
    prisma.$queryRaw`SELECT to_regclass('public.performance_logs') as tbl`,
    prisma.$queryRaw`SELECT to_regclass('public.performance_entries') as tbl`,
    prisma.$queryRaw`SELECT to_regclass('public.work_sessions') as tbl`,
  ]);

  const hasLogs = (logs as any)[0]?.tbl;
  const hasEntries = (entries as any)[0]?.tbl;
  const hasSessions = (sessions as any)[0]?.tbl;

  if (hasLogs && hasEntries && hasSessions) {
    return NextResponse.json({ status: "already_applied", logs: hasLogs, entries: hasEntries, sessions: hasSessions });
  }

  // Run migration with raw SQL
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "performance_logs" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "date" TEXT NOT NULL,
      "summary" TEXT,
      "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
      "totalMinutes" INTEGER NOT NULL DEFAULT 0,
      "highlights" TEXT,
      "blockers" TEXT,
      "nextDayPlan" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "authorId" TEXT NOT NULL,
      CONSTRAINT "performance_logs_authorId_date_unique" UNIQUE("authorId", "date")
    );

    CREATE TABLE IF NOT EXISTS "performance_entries" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "taskId" TEXT,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "minutes" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'in_progress',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "logId" TEXT NOT NULL,
      CONSTRAINT "performance_entries_logId_fkey" FOREIGN KEY ("logId") REFERENCES "performance_logs"("id") ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "work_sessions" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "startedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "endedAt" TIMESTAMPTZ,
      "minutes" INTEGER NOT NULL DEFAULT 0,
      "taskId" TEXT,
      "description" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "authorId" TEXT NOT NULL
    );
  `);

  await prisma.$disconnect();

  return NextResponse.json({ status: "migrated" });
}
