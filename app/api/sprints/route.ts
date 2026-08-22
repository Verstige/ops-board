import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../../../app/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const sprints = await prisma.sprint.findMany({
    where: { ...(projectId ? { projectId } : {}) },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true } },
          artifact: { select: { id: true, name: true, color: true } },
        },
      },
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(sprints);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, goal, startDate, endDate, projectId, memberIds } = body;

  if (!name || !startDate || !endDate || !projectId) {
    return NextResponse.json({ error: "name, startDate, endDate, projectId required" }, { status: 400 });
  }

  const sprint = await prisma.sprint.create({
    data: {
      name,
      goal,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      projectId,
      members: memberIds ? { create: memberIds.map((uid: string) => ({ userId: uid })) } : {},
    },
    include: { members: { include: { user: { select: { id: true, name: true } } } } },
  });

  return NextResponse.json(sprint, { status: 201 });
}
