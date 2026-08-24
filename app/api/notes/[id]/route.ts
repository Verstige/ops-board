import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function authedSession() {
  const session = await auth();
  if (!session?.user) return null;
  return session;
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authedSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Look up the note first so we can authorize ownership.
  // Authors can delete their own notes; users viewing shared notes can't delete
  // someone else's.
  const note = await prisma.note.findUnique({ where: { id }, select: { authorId: true } });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  if (note.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ ok: true, id });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authedSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const note = await prisma.note.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  if (note.authorId !== session.user.id && !note.isShared) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(note);
}