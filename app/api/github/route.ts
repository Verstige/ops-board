/**
 * GitHub Sync API
 * GET  ?type=commits      → fetch + cache commits from tracked repos
 * GET  ?type=issues       → fetch open issues from mscartiles-lab/open-local
 * POST ?action=import     → import an issue as a task
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const HEADERS = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "ops-board/1.0",
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TRACKED_REPOS = [
  { owner: "mscartiles-lab", repo: "open-local", label: "Main Repo", fork: false },
  { owner: "Verstige", repo: "open-local", label: "Your Fork", fork: true },
];

// ─── Fetch + cache commits ─────────────────────────────────────────────────────
async function syncCommits() {
  const results = [];
  for (const { owner, repo } of TRACKED_REPOS) {
    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=30`;
      const res = await fetch(url, {
        headers: HEADERS,
        next: { revalidate: 0 }, // always fresh
      });
      if (!res.ok) continue;
      const commits = await res.json();

      for (const commit of commits) {
        const msg = commit.commit.message.split("\n")[0];
        // Find linked artifact by repo path heuristics
        let artifactId = null;
        const apiServerPaths = ["api-server", "lib/api", "routes", "controllers"];
        const webPaths = ["open-local", "web", "frontend", "pages", "components"];
        const mobilePaths = ["mobile", "react-native", "rn-"];

        if (apiServerPaths.some((p) => msg.toLowerCase().includes(p))) artifactId = "artifact-api-server";
        else if (webPaths.some((p) => msg.toLowerCase().includes(p))) artifactId = "artifact-open-local";
        else if (mobilePaths.some((p) => msg.toLowerCase().includes(p))) artifactId = "artifact-mobile";
        else if (msg.includes("db") || msg.includes("schema") || msg.includes("migration")) artifactId = "artifact-db";

        // Parse task IDs from commit message
        const taskIdMatches = msg.match(/task[_-]?([a-z0-9-]+)/gi) || [];
        const linkedTasks = taskIdMatches.map((m: string) => m.replace(/task[_-]?/gi, "task-"));

        await prisma.gitHubCommit.upsert({
          where: { sha: commit.sha },
          update: {},
          create: {
            sha: commit.sha,
            message: commit.commit.message,
            authorName: commit.commit.author.name,
            authorEmail: commit.commit.author.email,
            authorLogin: commit.author?.login || null,
            avatarUrl: commit.author?.avatar_url || null,
            repoUrl: `https://github.com/${owner}/${repo}`,
            htmlUrl: commit.html_url,
            committedAt: new Date(commit.commit.author.date),
            artifactId: artifactId || null,
            linkedTasks,
          },
        });
      }
      results.push({ owner, repo, synced: commits.length });
    } catch (e) {
      results.push({ owner, repo, error: String(e) });
    }
  }
  return results;
}

// ─── Fetch open issues ─────────────────────────────────────────────────────────
async function fetchIssues(owner: string, repo: string) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=50`;
  const res = await fetch(url, { headers: HEADERS, next: { revalidate: 60 } });
  if (!res.ok) return [];
  return await res.json();
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "commits";
  const sync = searchParams.get("sync") === "1";

  if (type === "issues") {
    const issues = await fetchIssues("mscartiles-lab", "open-local");
    return NextResponse.json({ issues });
  }

  if (type === "commits") {
    if (sync) {
      const results = await syncCommits();
      return NextResponse.json({ synced: true, results });
    }
    // Return cached commits
    const commits = await prisma.gitHubCommit.findMany({
      include: { artifact: { select: { id: true, name: true, color: true } } },
      orderBy: { committedAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ commits, source: "cache" });
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}

// ─── Import issue as task ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { issueNumber, repoOwner, repoName, projectId, milestoneId, assigneeId } = body;

  if (!issueNumber || !projectId || !assigneeId) {
    return NextResponse.json({ error: "issueNumber, projectId, assigneeId required" }, { status: 400 });
  }

  // Fetch the issue from GitHub
  const owner = repoOwner || "mscartiles-lab";
  const repo = repoName || "open-local";
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;
  const res = await fetch(url, { headers: HEADERS });

  if (!res.ok) return NextResponse.json({ error: "Issue not found on GitHub" }, { status: 404 });

  const issue = await res.json();

  const task = await prisma.task.create({
    data: {
      title: issue.title,
      description: `${issue.body || ""}\n\n---\nGitHub Issue: ${issue.html_url}`,
      status: "TODO",
      priority: issue.labels?.some((l: any) => l.name === "urgent" || l.name === "high") ? "HIGH" : "MEDIUM",
      projectId,
      milestoneId: milestoneId || null,
      assigneeId,
      githubIssueNumber: issue.number,
      githubIssueUrl: issue.html_url,
    },
    include: { assignee: { select: { id: true, name: true } } },
  });

  return NextResponse.json(task, { status: 201 });
}
