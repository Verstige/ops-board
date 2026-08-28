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

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
      ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.status === 'DONE' && { completedAt: new Date() }),
    },
    include: { assignee: { select: { id: true, name: true } }, project: { select: { id: true, name: true, color: true } } },
  });

  // Notify on status change (and skip notify if user moved it themselves — but we don't know the actor's intent here; just notify on every status change)
  if (body.status !== undefined) {
    void notifyOthers({
      actorUserId: session.user.id,
      actorName: session.user.name || "Someone",
      type: "task.status_changed",
      title: `Task · ${task.status.replace("_", " ")}`,
      body: `${task.title} · ${task.project.name}`,
      link: `/tasks?focus=${task.id}`,
      entityId: task.id,
    }).catch(() => {});
  }

  return NextResponse.json(task);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
