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
  const month = searchParams.get("month"); // YYYY-MM

  const events = await prisma.calendarEvent.findMany({
    where: month ? { start: { gte: new Date(month + "-01"), lt: new Date(month + "-31") } } : {},
    include: { organizer: { select: { id: true, name: true } }, project: { select: { id: true, name: true, color: true } } },
    orderBy: { start: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, start, end, allDay, location, meetingUrl, projectId } = body;

  if (!title || !start) return NextResponse.json({ error: "title and start required" }, { status: 400 });

  const event = await prisma.calendarEvent.create({
    data: {
      title, description, start: new Date(start), end: end ? new Date(end) : null,
      allDay: allDay || false, location, meetingUrl, projectId: projectId || null,
      organizerId: (session.user as any).id,
    },
    include: { organizer: { select: { id: true, name: true } }, project: { select: { id: true, name: true, color: true } } },
  });

  return NextResponse.json(event, { status: 201 });
}
