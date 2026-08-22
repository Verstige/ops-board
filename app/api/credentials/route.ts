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

  const creds = await prisma.credential.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ownerId: (session.user as any).id,
    },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(creds);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, category, url, username, password, notes, projectId } = body;

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const cred = await prisma.credential.create({
    data: {
      name, category: category || "OTHER", url, username, password, notes,
      ownerId: (session.user as any).id,
      projectId: projectId || null,
    },
  });

  return NextResponse.json(cred, { status: 201 });
}
