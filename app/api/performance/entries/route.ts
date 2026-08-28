import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function today() {
  return new Date().toISOString().slice(0, 10);
}

// POST /api/performance/entries — add an entry to today's log
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, minutes, status = "in_progress", taskId, date = today() } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  // Upsert today's log
  const log = await prisma.performanceLog.upsert({
    where: { authorId_date: { authorId: session.user.id, date } },
    create: { authorId: session.user.id, date },
    update: {},
  });

  const entry = await prisma.performanceEntry.create({
    data: {
      logId: log.id,
      title: title.trim(),
      description: description?.trim() || null,
      minutes: minutes ?? 0,
      status,
      taskId: taskId || null,
    },
  });

  // Update log totals
  await recalcLog(log.id);

  return NextResponse.json(entry, { status: 201 });
}

// DELETE /api/performance/entries?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const entry = await prisma.performanceEntry.delete({ where: { id } });
  await recalcLog(entry.logId);

  return NextResponse.json({ ok: true });
}

async function recalcLog(logId: string) {
  const entries = await prisma.performanceEntry.findMany({
    where: { logId },
    select: { minutes: true, status: true },
  });
  const totalMinutes = entries.reduce((s, e) => s + (e.minutes || 0), 0);
  const tasksCompleted = entries.filter((e) => e.status === "done").length;
  await prisma.performanceLog.update({
    where: { id: logId },
    data: { totalMinutes, tasksCompleted },
  });
}
