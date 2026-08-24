import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { notifyOthers } from "@/lib/notify";

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

  void notifyOthers({
    actorUserId: session.user.id,
    actorName: session.user.name || "Someone",
    type: "investor_update.created",
    title: `Investor update · ${update.type}`,
    body: update.title,
    link: `/investors?focus=${update.id}`,
    entityId: update.id,
  }).catch(() => {});

  return NextResponse.json(update, { status: 201 });
}
