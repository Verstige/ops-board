import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { notifyOthers } from "@/lib/notify";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const milestone = await prisma.milestone.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.status !== undefined && {
        status: body.status,
        completedAt: body.status === "COMPLETED" ? new Date() : null,
      }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });

  if (body.status !== undefined && (body.status === "AT_RISK" || body.status === "COMPLETED")) {
    void notifyOthers({
      actorUserId: session.user.id,
      actorName: session.user.name || "Someone",
      type: "milestone.status_changed",
      title: `Milestone · ${body.status === "COMPLETED" ? "completed" : "at risk"}`,
      body: milestone.title,
      link: `/milestones?focus=${milestone.id}`,
      entityId: milestone.id,
    }).catch(() => {});
  }

  return NextResponse.json(milestone);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.milestone.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
