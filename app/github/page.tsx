"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

type Commit = {
  sha: string;
  message: string;
  authorName: string;
  authorLogin: string | null;
  avatarUrl: string | null;
  repoUrl: string;
  htmlUrl: string;
  committedAt: string;
  linkedTasks: string[];
  artifact: { id: string; name: string; color: string } | null;
};

type Issue = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  labels: { name: string; color: string }[];
  created_at: string;
  updated_at: string;
  user: { login: string; avatar_url: string };
};

type RepoResult = { owner: string; repo: string; label: string; fork: boolean; data: any[] };

function timeAgo(date: string) {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const ARTIFACT_COLORS: Record<string, string> = {
  "artifact-api-server": "#f59e0b",
  "artifact-open-local": "#60a5fa",
  "artifact-mobile": "#34d399",
  "artifact-db": "#f472b6",
};

export default function GitHubPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<"commits" | "issues" | "workflow">("commits");
  const [commits, setCommits] = useState<Commit[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importingIssue, setImportingIssue] = useState<number | null>(null);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  const load = useCallback(async () => {
    setLoading(true);
    const [cData, iData] = await Promise.all([
      fetch("/api/github?type=commits").then((r) => r.json()),
      fetch("/api/github?type=issues").then((r) => r.json()),
    ]);
    setCommits(cData.commits || []);
    setIssues(iData.issues || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (status === "authenticated") load(); }, [status, load]);

  async function handleSync() {
    setSyncing(true);
    await fetch("/api/github?type=commits&sync=1");
    await load();
    setSyncing(false);
  }

  async function importIssue(issue: Issue) {
    setImportingIssue(issue.id);
    const res = await fetch("/api/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueNumber: issue.number,
        repoOwner: "mscartiles-lab",
        repoName: "open-local",
        projectId: "open-local-platform",
        assigneeId: (session?.user as any)?.id,
      }),
    });
    setImportingIssue(null);
    if (res.ok) {
      alert(`✅ Imported "#${issue.number} ${issue.title}" as a task!`);
    } else {
      alert("❌ Import failed — do you have a GitHub token set?");
    }
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", color: "var(--color-muted)" }}>
        Loading GitHub data...
      </div>
    );
  }

  const allCommits = [...commits].sort((a, b) => new Date(b.committedAt).getTime() - new Date(a.committedAt).getTime());

  // Group commits by artifact
  const byArtifact: Record<string, Commit[]> = {};
  for (const c of allCommits) {
    const key = c.artifact?.name || "Untagged";
    if (!byArtifact[key]) byArtifact[key] = [];
    byArtifact[key].push(c);
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <aside style={{ width: "220px", background: "var(--color-surface)", borderRight: "1px solid var(--color-border)", padding: "20px 12px" }}>
        <div style={{ fontSize: "16px", fontWeight: "700", padding: "8px 12px", marginBottom: "16px" }}>Ops Board</div>
        {[
          { href: "/dashboard", label: "Dashboard", icon: "⌂" },
          { href: "/tasks", label: "Tasks", icon: "◎" },
          { href: "/sprints", label: "Sprints", icon: "⚡" },
          { href: "/milestones", label: "Milestones", icon: "🏁" },
          { href: "/github", label: "GitHub", icon: "⌥", active: true },
          { href: "/investors", label: "Investors", icon: "📈" },
          { href: "/calendar", label: "Calendar", icon: "◷" },
        ].map((n) => (
          <a key={n.href} href={n.href} style={{
            display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "6px",
            color: n.active ? "var(--color-text)" : "var(--color-muted)",
            fontSize: "14px", fontWeight: n.active ? "600" : "400",
            background: n.active ? "rgba(92,124,250,0.1)" : "transparent",
          }}>
            <span>{n.icon}</span> {n.label}
          </a>
        ))}
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: "700" }}>GitHub</h1>
          <div style={{ display: "flex", gap: "4px", background: "var(--color-surface)", borderRadius: "8px", padding: "3px" }}>
            {(["commits", "issues", "workflow"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: tab === t ? "var(--color-brand)" : "transparent",
                color: tab === t ? "white" : "var(--color-muted)",
                border: "none", borderRadius: "5px", padding: "5px 14px",
                fontSize: "13px", cursor: "pointer", textTransform: "capitalize",
              }}>{t}</button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
            <button onClick={handleSync} disabled={syncing} className="btn-ghost" style={{ fontSize: "13px", padding: "6px 12px" }}>
              {syncing ? "⟳ Syncing..." : "⟳ Sync Now"}
            </button>
            <a href="https://github.com/mscartiles-lab/open-local" target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: "13px", padding: "6px 12px" }}>
              mscartiles-lab ↗
            </a>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>

          {/* ─── COMMITS TAB ──────────────────────────────────────── */}
          {tab === "commits" && (
            <div>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
                {Object.entries(byArtifact).map(([name, commits]) => (
                  <div key={name} className="card" style={{ borderTop: `3px solid ${ARTIFACT_COLORS[name] || "#7c7f8e"}` }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: ARTIFACT_COLORS[name] || "var(--color-muted)", marginBottom: "6px" }}>{name}</div>
                    <div style={{ fontSize: "24px", fontWeight: "700" }}>{commits.length}</div>
                    <div style={{ fontSize: "11px", color: "var(--color-muted)" }}>commits</div>
                  </div>
                ))}
              </div>

              {allCommits.length === 0 && (
                <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--color-muted)" }}>
                  No commits found. Make sure <code>GITHUB_TOKEN</code> is set in your Railway env vars.
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {allCommits.map((commit) => (
                  <div key={commit.sha} className="card" style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "12px 16px" }}>
                    <img
                      src={commit.avatarUrl || `https://github.com/${commit.authorLogin || "ghost"}.png`}
                      alt=""
                      width={32} height={32}
                      style={{ borderRadius: "50%", flexShrink: 0, marginTop: "2px" }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "12px", fontWeight: "500", color: "var(--color-muted)" }}>{commit.authorName}</span>
                        {commit.artifact && (
                          <span style={{ fontSize: "10px", background: `${ARTIFACT_COLORS[commit.artifact.id] || "#7c7f8e"}22`, color: ARTIFACT_COLORS[commit.artifact.id] || "#7c7f8e", padding: "1px 7px", borderRadius: "999px", fontWeight: "600" }}>
                            {commit.artifact.name}
                          </span>
                        )}
                        <span style={{ fontSize: "11px", color: "var(--color-muted)" }}>{timeAgo(commit.committedAt)}</span>
                        {commit.linkedTasks.length > 0 && (
                          <span style={{ fontSize: "10px", background: "rgba(92,124,250,0.15)", color: "#5c7cfa", padding: "1px 7px", borderRadius: "999px" }}>
                            → #{commit.linkedTasks.length} task(s)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--color-text)", marginBottom: "6px", wordBreak: "break-word", lineHeight: "1.5" }}>
                        {commit.message.split("\n")[0]}
                      </div>
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <a href={commit.htmlUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "var(--color-brand)", fontFamily: "monospace" }}>
                          {commit.sha.slice(0, 7)}
                        </a>
                        <span style={{ fontSize: "11px", color: "var(--color-muted)" }}>
                          {commit.repoUrl.replace("https://github.com/", "").split("/")[1] || commit.repoUrl}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── ISSUES TAB ───────────────────────────────────────── */}
          {tab === "issues" && (
            <div>
              <div style={{ marginBottom: "20px", padding: "14px", background: "var(--color-surface)", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                <div style={{ fontSize: "13px", color: "var(--color-muted)" }}>
                  Open issues from <strong style={{ color: "var(--color-text)" }}>mscartiles-lab/open-local</strong>.
                  Click <strong style={{ color: "var(--color-brand)" }}>Import as Task</strong> to add any issue directly to your task board.
                </div>
              </div>

              {issues.length === 0 && (
                <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--color-muted)" }}>
                  No open issues or token not set. Add GITHUB_TOKEN to env vars.
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {issues.map((issue) => (
                  <div key={issue.id} className="card" style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <img src={issue.user.avatar_url} alt="" width={28} height={28} style={{ borderRadius: "50%", flexShrink: 0, marginTop: "2px" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>#{issue.number}</span>
                          <span style={{ fontSize: "14px", fontWeight: "600" }}>{issue.title}</span>
                        </div>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                          {issue.labels.map((label) => (
                            <span key={label.name} style={{ fontSize: "10px", background: `#${label.color}22`, color: `#${label.color}`, padding: "1px 7px", borderRadius: "999px", fontWeight: "600" }}>
                              {label.name}
                            </span>
                          ))}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <a href={issue.html_url} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: "12px", padding: "4px 10px" }}>
                            View on GitHub ↗
                          </a>
                          <button
                            onClick={() => importIssue(issue)}
                            disabled={importingIssue === issue.id}
                            className="btn-primary"
                            style={{ fontSize: "12px", padding: "4px 12px" }}
                          >
                            {importingIssue === issue.id ? "Importing..." : "Import as Task →"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── WORKFLOW TAB ─────────────────────────────────────── */}
          {tab === "workflow" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="card" style={{ padding: "24px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "16px" }}>Your Fork Workflow</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {[
                    { step: "1", icon: "🍴", title: "Work on your fork", desc: "git checkout -b feature/my-change → make changes → git push origin feature/my-change", color: "#5c7cfa" },
                    { step: "2", icon: "🔀", title: "Open Pull Request", desc: "Go to github.com/Verstige/open-local → New Pull Request → compare your branch into mscartiles-lab:main", color: "#a78bfa" },
                    { step: "3", icon: "👀", title: "Chrissy Reviews", desc: "She reviews on GitHub, requests changes or approves. Iterate in your fork — PR updates automatically.", color: "#fbbf24" },
                    { step: "4", icon: "🚀", title: "Merge to Main", desc: "Once approved, Chrissy merges the PR. Commits now appear in the upstream commit log.", color: "#22c55e" },
                  ].map((item) => (
                    <div key={item.step} style={{ display: "flex", gap: "16px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: `${item.color}22`, color: item.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                        {item.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "2px" }}>{item.title}</div>
                        <div style={{ fontSize: "13px", color: "var(--color-muted)", fontFamily: "monospace" }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: "24px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "12px" }}>Tracked Repositories</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {[
                    { name: "mscartiles-lab/open-local", label: "Main Repo", desc: "Chrissy's canonical repo — where PRs merge", color: "#22c55e" },
                    { name: "Verstige/open-local", label: "Your Fork", desc: "Your copy — all your work goes here first", color: "#5c7cfa" },
                  ].map((r) => (
                    <div key={r.name} style={{ padding: "16px", background: "var(--color-bg)", borderRadius: "8px", borderLeft: `3px solid ${r.color}` }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: r.color, textTransform: "uppercase", marginBottom: "4px" }}>{r.label}</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>{r.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--color-muted)" }}>{r.desc}</div>
                      <a href={`https://github.com/${r.name}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "var(--color-brand)", display: "inline-block", marginTop: "6px" }}>
                        Open ↗
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: "24px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "12px" }}>Connecting GitHub Token</h2>
                <div style={{ fontSize: "13px", color: "var(--color-muted)", lineHeight: "1.7" }}>
                  <p style={{ marginBottom: "12px" }}>To see live commits and issues, add your GitHub Personal Access Token to Railway:</p>
                  <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <li>Go to <strong style={{ color: "var(--color-text)" }}>github.com → Settings → Developer Settings → Personal Access Tokens</strong></li>
                    <li>Generate new token (classic) — check <code>repo</code> scope</li>
                    <li>Copy the token</li>
                    <li>In Railway, go to your Ops Board project → Variables → add <code>GITHUB_TOKEN=ghp_...</code></li>
                    <li>Redeploy — commits will start flowing in automatically</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
