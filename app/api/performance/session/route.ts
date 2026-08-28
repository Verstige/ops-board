import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// GET /api/performance/session — get active session
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await prisma.workSession.findFirst({
    where: { authorId: session.user.id, isActive: true },
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json(active || null);
}

// POST /api/performance/session — start or end session
// body: { action: "start", description?, taskId? }
// body: { action: "end", id, description? }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, id, description, taskId } = body;

  if (action === "start") {
    // End any currently active sessions first
    await prisma.workSession.updateMany({
      where: { authorId: session.user.id, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });

    const workSession = await prisma.workSession.create({
      data: {
        authorId: session.user.id,
        description: description || null,
        taskId: taskId || null,
      },
    });
    return NextResponse.json(workSession, { status: 201 });
  }

  if (action === "end") {
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const sess = await prisma.workSession.findUnique({ where: { id } });
    if (!sess || sess.authorId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const endedAt = new Date();
    const minutes = Math.round((endedAt.getTime() - sess.startedAt.getTime()) / 60000);

    const updated = await prisma.workSession.update({
      where: { id },
      data: { endedAt, isActive: false, minutes },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action. Use 'start' or 'end'." }, { status: 400 });
}
