import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");

  const tasks = await prisma.task.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(status ? { status } : {}),
    },
    include: { assignee: { select: { id: true, name: true, email: true } }, project: { select: { id: true, name: true, color: true } } },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, status, priority, dueDate, assigneeId, projectId } = body;

  if (!title || !projectId || !assigneeId) {
    return NextResponse.json({ error: "title, projectId, assigneeId required" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: { title, description, status: status || "TODO", priority: priority || "MEDIUM", dueDate: dueDate ? new Date(dueDate) : null, assigneeId, projectId },
    include: { assignee: { select: { id: true, name: true } }, project: { select: { id: true, name: true, color: true } } },
  });

  return NextResponse.json(task, { status: 201 });
}
