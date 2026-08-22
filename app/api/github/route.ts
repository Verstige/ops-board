/**
 * GitHub API route — fetches commits from tracked repos
 * Shows both Chrissy's upstream (mscartiles-lab) and your fork (Verstige)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const HEADERS = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

const TRACKED_REPOS = [
  { owner: "mscartiles-lab", repo: "open-local", label: "Open Local (Main)", fork: false },
  { owner: "Verstige", repo: "open-local", label: "Your Fork", fork: true },
];

async function fetchCommits(owner: string, repo: string, perPage = 30) {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}`;
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchBranches(owner: string, repo: string) {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/branches`;
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 300 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchPRs(owner: string, repo: string) {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=20`;
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "commits"; // commits | prs | branches

  const results = await Promise.all(
    TRACKED_REPOS.map(async ({ owner, repo, label, fork }) => {
      let data: any[] = [];
      if (type === "commits") data = await fetchCommits(owner, repo);
      else if (type === "prs") data = await fetchPRs(owner, repo);
      else if (type === "branches") data = await fetchBranches(owner, repo);

      return { owner, repo, label, fork, data };
    })
  );

  return NextResponse.json({ type, results });
}
