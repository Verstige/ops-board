import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function today() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// GET /api/performance — fetch logs for the current user
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || today();
  const limit = parseInt(searchParams.get("limit") || "30");

  const logs = await prisma.performanceLog.findMany({
    where: { authorId: session.user.id, date: { lte: date } },
    orderBy: { date: "desc" },
    take: limit,
    include: {
      entries: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json({ logs });
}

// POST /api/performance — create or update today's log
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date = today(), summary, highlights, blockers, nextDayPlan, tasksCompleted, totalMinutes } = body;

  const log = await prisma.performanceLog.upsert({
    where: { authorId_date: { authorId: session.user.id, date } },
    create: {
      authorId: session.user.id,
      date,
      summary,
      highlights,
      blockers,
      nextDayPlan,
      tasksCompleted: tasksCompleted ?? 0,
      totalMinutes: totalMinutes ?? 0,
    },
    update: {
      ...(summary !== undefined && { summary }),
      ...(highlights !== undefined && { highlights }),
      ...(blockers !== undefined && { blockers }),
      ...(nextDayPlan !== undefined && { nextDayPlan }),
      ...(tasksCompleted !== undefined && { tasksCompleted }),
      ...(totalMinutes !== undefined && { totalMinutes }),
    },
    include: { entries: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json(log);
}
