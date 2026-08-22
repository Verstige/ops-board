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

  const notes = await prisma.note.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      OR: [{ authorId: (session.user as any).id }, { isShared: true }],
    },
    include: { author: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, content, isShared, projectId } = body;

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const note = await prisma.note.create({
    data: {
      title, content, isShared: isShared || false,
      authorId: (session.user as any).id,
      projectId: projectId || null,
    },
  });

  return NextResponse.json(note, { status: 201 });
}
