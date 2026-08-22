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

  const updates = await prisma.investorUpdate.findMany({
    include: {
      author: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(updates);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, content, type, metrics, projectId } = body;

  if (!title || !content) return NextResponse.json({ error: "title and content required" }, { status: 400 });

  const update = await prisma.investorUpdate.create({
    data: {
      title,
      content,
      type: type || "PROGRESS",
      metrics: metrics || undefined,
      projectId: projectId || null,
      authorId: (session.user as any).id,
    },
  });

  return NextResponse.json(update, { status: 201 });
}
