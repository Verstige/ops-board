"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { IconGithub } from "@/components/Icons";

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

type IssueTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  githubIssueNumber: number | null;
  githubIssueUrl: string | null;
  createdAt: string;
  assignee: { id: string; name: string };
};

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
  "artifact-api-server": "var(--priority-high)",
  "artifact-open-local": "var(--status-progress-fg)",
  "artifact-mobile": "var(--status-done-fg)",
  "artifact-db": "#f472b6",
};

export default function GitHubPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<"commits" | "issues" | "workflow">("commits");
  const [commits, setCommits] = useState<Commit[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueTasks, setIssueTasks] = useState<IssueTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importingIssue, setImportingIssue] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [cData, iData, tData] = await Promise.all([
      fetch("/api/github?type=commits").then((r) => r.json()),
      fetch("/api/github?type=issues").then((r) => r.json()),
      fetch("/api/github?type=issue-tasks").then((r) => r.json()).catch(() => ({ tasks: [] })),
    ]);
    setCommits(cData.commits || []);
    setIssues(iData.issues || []);
    setIssueTasks(tData.tasks || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

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

  const allCommits = [...commits].sort((a, b) => new Date(b.committedAt).getTime() - new Date(a.committedAt).getTime());

  const byArtifact: Record<string, Commit[]> = {};
  for (const c of allCommits) {
    const key = c.artifact?.name || "Untagged";
    if (!byArtifact[key]) byArtifact[key] = [];
    byArtifact[key].push(c);
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
            .08 — GitHub
          </div>
          <h1 className="section-title">Repository</h1>
          <p className="section-subtitle">Live commits and issues from your forks.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div className="theme-toggle" style={{ padding: 3 }}>
            {(["commits", "issues", "workflow"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={tab === t ? "active" : ""}
                style={{ width: "auto", padding: "0 14px", textTransform: "capitalize", fontSize: 13, fontWeight: 500 }}
              >
                {t}
              </button>
            ))}
          </div>
          <button onClick={handleSync} disabled={syncing} className="btn-ghost" style={{ fontSize: 13 }}>
            {syncing ? "⟳ Syncing…" : "⟳ Sync"}
          </button>
          <a href="https://github.com/mscartiles-lab/open-local" target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: 13 }}>
            mscartiles-lab ↗
          </a>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", padding: 60 }}>
          Loading GitHub data…
        </div>
      ) : tab === "commits" ? (
        <div>
          {/* Stats */}
          {Object.keys(byArtifact).length > 0 && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}>
              {Object.entries(byArtifact).map(([name, list]) => {
                const color = ARTIFACT_COLORS[name] || "var(--text-muted)";
                return (
                  <div key={name} className="card glass-fade" style={{ borderTop: `2px solid ${color}`, padding: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: color, marginBottom: 6 }}>{name}</div>
                    <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.03em", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{list.length}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginTop: 4 }}>commits</div>
                  </div>
                );
              })}
            </div>
          )}

          {allCommits.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "color-mix(in srgb, var(--brand-500) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: "var(--brand-600)" }}>
                <IconGithub size={28} />
              </div>
              No commits found. Make sure <code style={{ background: "var(--line)", padding: "2px 6px", borderRadius: 4 }}>GITHUB_TOKEN</code> is set in Railway env vars.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {allCommits.map((commit) => (
                <div key={commit.sha} className="card glass-fade" style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 18px" }}>
                  <img
                    src={commit.avatarUrl || `https://github.com/${commit.authorLogin || "ghost"}.png`}
                    alt=""
                    width={36}
                    height={36}
                    style={{ borderRadius: "50%", flexShrink: 0, marginTop: 2 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{commit.authorName}</span>
                      {commit.artifact && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                          background: `color-mix(in srgb, ${ARTIFACT_COLORS[commit.artifact.id] || "var(--text-muted)"} 14%, transparent)`,
                          color: ARTIFACT_COLORS[commit.artifact.id] || "var(--text-muted)",
                          padding: "2px 8px", borderRadius: 999,
                        }}>
                          {commit.artifact.name}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(commit.committedAt)}</span>
                      {commit.linkedTasks.length > 0 && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          background: "color-mix(in srgb, var(--brand-500) 14%, transparent)",
                          color: "var(--brand-600)",
                          padding: "2px 8px", borderRadius: 999,
                        }}>
                          → {commit.linkedTasks.length} task(s)
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, color: "var(--text-primary)", marginBottom: 8, wordBreak: "break-word", lineHeight: 1.5 }}>
                      {commit.message.split("\n")[0]}
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <a href={commit.htmlUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--brand-600)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        {commit.sha.slice(0, 7)}
                      </a>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {commit.repoUrl.replace("https://github.com/", "").split("/")[1] || commit.repoUrl}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : tab === "issues" ? (
        <div>
          {/* Workflow callout */}
          <div className="card" style={{ marginBottom: 16, padding: 18, borderLeft: "3px solid #f97316" }}>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--text-primary)" }}>New:</strong> when creating a task on the Board, pick project{" "}
              <span className="badge badge-URGENT" style={{ background: "color-mix(in srgb, #f97316 14%, transparent)", color: "#f97316" }}>Issues (GitHub)</span>{" "}
              to auto-open a GitHub issue on <strong style={{ color: "var(--text-primary)" }}>mscartiles-lab/open-local</strong>. The task
              keeps the issue number, the GitHub issue links back to the task description. Tasks filed this way appear below;
              sync status is shown per row.
            </div>
          </div>

          {/* Tasks filed from the board (board → GitHub bridge) */}
          {issueTasks.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em", marginBottom: 12 }}>
                Filed from Board <span style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>({issueTasks.length})</span>
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {issueTasks.map((t) => {
                  const synced = t.githubIssueNumber && t.githubIssueUrl;
                  return (
                    <div key={t.id} className="card glass-fade" style={{ padding: 14, borderLeft: `3px solid ${synced ? "#22c55e" : "#f97316"}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        {synced ? (
                          <a
                            href={t.githubIssueUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 12, color: "var(--brand-600)", fontFamily: "var(--font-mono)", fontWeight: 700 }}
                          >
                            #{t.githubIssueNumber}
                          </a>
                        ) : (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                            background: "color-mix(in srgb, #f97316 14%, transparent)",
                            color: "#f97316",
                          }}>
                            ⚠ NOT SYNCED
                          </span>
                        )}
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", flex: 1, minWidth: 0 }}>
                          {t.title}
                        </span>
                        <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                        <span className={`status-dot dot-${t.status}`} />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <span>→ {t.assignee?.name || "Unassigned"}</span>
                        <span>·</span>
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                        {synced && (
                          <>
                            <span>·</span>
                            <a href={`/tasks?focus=${t.id}`} style={{ color: "var(--brand-600)", fontWeight: 600 }}>
                              Open task →
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Raw GH issues (existing flow) */}
          <div className="card" style={{ marginBottom: 20, padding: 18 }}>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Open issues from <strong style={{ color: "var(--text-primary)" }}>mscartiles-lab/open-local</strong>.
              Click <strong style={{ color: "var(--brand-600)" }}>Import as Task</strong> to add any issue directly to your board.
            </div>
          </div>

          {issues.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
              No open issues or token not set. Add GITHUB_TOKEN to env vars.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {issues.map((issue) => (
                <div key={issue.id} className="card glass-fade" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <img src={issue.user.avatar_url} alt="" width={32} height={32} style={{ borderRadius: "50%", flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>#{issue.number}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{issue.title}</span>
                      </div>
                      {issue.labels.length > 0 && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                          {issue.labels.map((label) => (
                            <span key={label.name} style={{
                              fontSize: 10, fontWeight: 700,
                              background: `#${label.color}22`,
                              color: `#${label.color}`,
                              padding: "2px 8px", borderRadius: 999,
                            }}>
                              {label.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <a href={issue.html_url} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }}>
                          View on GitHub ↗
                        </a>
                        <button
                          onClick={() => importIssue(issue)}
                          disabled={importingIssue === issue.id}
                          className="btn-primary"
                          style={{ fontSize: 12, padding: "5px 12px" }}
                        >
                          {importingIssue === issue.id ? "Importing…" : "Import as Task →"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em", marginBottom: 16 }}>Your Fork Workflow</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { step: "1", title: "Work on your fork", desc: "git checkout -b feature/my-change → make changes → git push origin feature/my-change", color: "var(--status-progress-fg)" },
                { step: "2", title: "Open Pull Request", desc: "Go to github.com/Verstige/open-local → New Pull Request → compare your branch into mscartiles-lab:main", color: "#a78bfa" },
                { step: "3", title: "Chrissy Reviews", desc: "She reviews on GitHub, requests changes or approves. Iterate in your fork — PR updates automatically.", color: "var(--priority-high)" },
                { step: "4", title: "Merge to Main", desc: "Once approved, Chrissy merges the PR. Commits now appear in the upstream commit log.", color: "var(--status-done-fg)" },
              ].map((item) => (
                <div key={item.step} style={{ display: "flex", gap: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: `color-mix(in srgb, ${item.color} 14%, transparent)`,
                    color: item.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, flexShrink: 0,
                  }}>
                    {item.step}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-mono)", lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em", marginBottom: 14 }}>Tracked Repositories</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
              {[
                { name: "mscartiles-lab/open-local", label: "Main Repo", desc: "Chrissy's canonical repo — where PRs merge", color: "var(--status-done-fg)" },
                { name: "Verstige/open-local",      label: "Your Fork",  desc: "Your copy — all your work goes here first",   color: "var(--status-progress-fg)" },
              ].map((r) => (
                <div key={r.name} style={{ padding: 16, background: "var(--glass-bg)", borderRadius: 14, borderLeft: `3px solid ${r.color}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: r.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{r.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, fontFamily: "var(--font-mono)" }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>{r.desc}</div>
                  <a href={`https://github.com/${r.name}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--brand-600)", fontWeight: 600 }}>
                    Open ↗
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em", marginBottom: 14 }}>Connecting GitHub Token</h2>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
              <p style={{ marginBottom: 12 }}>To see live commits and issues, add your GitHub Personal Access Token to Railway:</p>
              <ol style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                <li>Go to <strong style={{ color: "var(--text-primary)" }}>github.com → Settings → Developer Settings → Personal Access Tokens</strong></li>
                <li>Generate new token (classic) — check <code style={{ background: "var(--line)", padding: "2px 6px", borderRadius: 4 }}>repo</code> scope</li>
                <li>Copy the token</li>
                <li>In Railway, go to your Ops Board project → Variables → add <code style={{ background: "var(--line)", padding: "2px 6px", borderRadius: 4 }}>GITHUB_TOKEN=ghp_…</code></li>
                <li>Redeploy — commits will start flowing in automatically</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}