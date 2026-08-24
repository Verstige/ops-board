import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { notifyOthers } from "@/lib/notify";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_HEADERS = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "ops-board/1.0",
};

// Auto-create a GitHub issue when a task is filed under the special Issues project.
// Returns the issue number + html_url on success, or null on failure (the task is
// still created so the user never loses work — we just log the GH failure).
async function createGitHubIssue(opts: {
  owner: string;
  repo: string;
  title: string;
  body: string;
  labels?: string[];
}): Promise<{ number: number; html_url: string } | null> {
  if (!GITHUB_TOKEN) {
    console.warn("[tasks] GITHUB_TOKEN not set — skipping GitHub issue creation");
    return null;
  }
  try {
    const res = await fetch(
      `https://api.github.com/repos/${opts.owner}/${opts.repo}/issues`,
      {
        method: "POST",
        headers: { ...GITHUB_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: opts.title,
          body: opts.body,
          labels: opts.labels ?? [],
        }),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      console.error(`[tasks] GitHub issue create failed: ${res.status} ${text}`);
      return null;
    }
    const issue = await res.json();
    return { number: issue.number, html_url: issue.html_url };
  } catch (e) {
    console.error(`[tasks] GitHub issue create threw: ${e}`);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");

  const tasks = await prisma.task.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(status ? { status } : {}),
    },
    include: { assignee: { select: { id: true, name: true, email: true } }, project: { select: { id: true, name: true, color: true } } },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, status, priority, dueDate, assigneeId, projectId } = body;

  if (!title || !projectId || !assigneeId) {
    return NextResponse.json({ error: "title, projectId, assigneeId required" }, { status: 400 });
  }

  // Resolve the project to learn if it's the special Issues project + the GH repo target.
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Compose the task data — we'll fill in GH issue linkage below if applicable.
  const taskData: any = {
    title,
    description: description ?? null,
    status: status || "TODO",
    priority: priority || "MEDIUM",
    dueDate: dueDate ? new Date(dueDate) : null,
    assigneeId,
    projectId,
  };

  // Auto-create GitHub issue when filing under the Issues project.
  // PR/label is mapped from the priority so URGENT → 'urgent' label etc.
  let ghWarning: string | null = null;
  if (projectId === "open-local-issues" && project.repoOwner && project.repoName) {
    const ghLabels =
      priority === "URGENT" ? ["urgent", "bug"]
        : priority === "HIGH" ? ["high-priority"]
        : priority === "LOW" ? ["low-priority"]
        : [];
    const ghBody =
      `${description ?? ""}\n\n---\nFiled from Ops Board by ${session.user.name || "Ops Board"} on ${new Date().toISOString()}\n`;
    const issue = await createGitHubIssue({
      owner: project.repoOwner,
      repo: project.repoName,
      title,
      body: ghBody,
      labels: ghLabels,
    });
    if (issue) {
      taskData.githubIssueNumber = issue.number;
      taskData.githubIssueUrl = issue.html_url;
      taskData.description =
        `${description ?? ""}\n\n---\nGitHub Issue: ${issue.html_url}`;
    } else {
      ghWarning = "Task created but GitHub issue creation failed. Check GITHUB_TOKEN.";
    }
  }

  const task = await prisma.task.create({
    data: taskData,
    include: { assignee: { select: { id: true, name: true } }, project: { select: { id: true, name: true, color: true } } },
  });

  // Fire-and-forget notification
  void notifyOthers({
    actorUserId: session.user.id,
    actorName: session.user.name || "Someone",
    type: "task.created",
    title: ghWarning
      ? `${task.project.name} (⚠ GitHub issue not created)`
      : `New task in ${task.project.name}`,
    body: taskData.githubIssueNumber
      ? `${task.title} · #${taskData.githubIssueNumber} on GitHub · assigned to ${task.assignee.name}`
      : `${task.title} · assigned to ${task.assignee.name}`,
    link: `/tasks?focus=${task.id}`,
    entityId: task.id,
  }).catch(() => {});

  const response = ghWarning ? { ...task, _warning: ghWarning } : task;
  return NextResponse.json(response, { status: 201 });
}
