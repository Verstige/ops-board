import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
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

  const milestones = await prisma.milestone.findMany({
    where: { ...(projectId ? { projectId } : {}) },
    include: {
      _count: { select: { tasks: true } },
      tasks: {
        select: { id: true, title: true, status: true, priority: true, dueDate: true, assignee: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(milestones);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, category, targetDate, projectId } = body;

  if (!title || !category || !projectId) {
    return NextResponse.json({ error: "title, category, projectId required" }, { status: 400 });
  }

  const milestone = await prisma.milestone.create({
    data: { title, description, category, targetDate: targetDate ? new Date(targetDate) : null, projectId },
    include: { _count: { select: { tasks: true } } },
  });

  return NextResponse.json(milestone, { status: 201 });
}
