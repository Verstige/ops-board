"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

type Commit = {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
  html_url: string;
  author: { login: string; avatar_url: string } | null;
};

type RepoResult = {
  owner: string;
  repo: string;
  label: string;
  fork: boolean;
  data: any[];
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

export default function GitHubPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [commits, setCommits] = useState<RepoResult[]>([]);
  const [prs, setPrs] = useState<RepoResult[]>([]);
  const [tab, setTab] = useState<"commits" | "prs" | "compare">("commits");
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, p] = await Promise.all([
      fetch("/api/github?type=commits").then((r) => r.json()),
      fetch("/api/github?type=prs").then((r) => r.json()),
    ]);
    setCommits(c.results || []);
    setPrs(p.results || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (status === "authenticated") load(); }, [status, load]);

  if (status === "loading" || loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", color: "var(--color-muted)" }}>
        Loading GitHub data...
      </div>
    );
  }

  const allCommits = commits.flatMap((r) =>
    (r.data as Commit[]).map((c) => ({
      ...c,
      source: r.label,
      fork: r.fork,
      shortSha: c.sha.slice(0, 7),
    }))
  ).sort((a, b) => new Date(b.commit.author.date).getTime() - new Date(a.commit.author.date).getTime());

  const upstreamCommits = allCommits.filter((c) => !c.fork);
  const forkCommits = allCommits.filter((c) => c.fork);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <aside style={{ width: "220px", background: "var(--color-surface)", borderRight: "1px solid var(--color-border)", padding: "20px 12px" }}>
        <div style={{ fontSize: "16px", fontWeight: "700", padding: "8px 12px", marginBottom: "16px" }}>Ops Board</div>
        {[
          { href: "/dashboard", label: "Dashboard", icon: "⌂" },
          { href: "/tasks", label: "Tasks", icon: "◎" },
          { href: "/calendar", label: "Calendar", icon: "◷" },
          { href: "/notes", label: "Notes", icon: "▤" },
          { href: "/github", label: "GitHub", icon: "⌥", active: true },
          { href: "/credentials", label: "Credentials", icon: "🔑" },
        ].map((n) => (
          <a key={n.href} href={n.href} style={{
            display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "6px",
            color: n.active ? "var(--color-text)" : "var(--color-muted)",
            fontSize: "14px", fontWeight: n.active ? "600" : "400",
            background: n.active ? "rgba(92,124,250,0.1)" : "transparent"
          }}>
            <span>{n.icon}</span> {n.label}
          </a>
        ))}
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: "700" }}>GitHub</h1>
          <div style={{ display: "flex", gap: "4px", background: "var(--color-surface)", borderRadius: "8px", padding: "3px" }}>
            {(["commits", "prs", "compare"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: tab === t ? "var(--color-brand)" : "transparent",
                color: tab === t ? "white" : "var(--color-muted)",
                border: "none", borderRadius: "5px", padding: "5px 14px",
                fontSize: "13px", cursor: "pointer", textTransform: "capitalize"
              }}>{t}</button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "12px" }}>
            <a href="https://github.com/mscartiles-lab/open-local" target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: "13px", padding: "6px 12px" }}>
              mscartiles-lab ↗
            </a>
            <a href="https://github.com/Verstige/open-local" target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: "13px", padding: "6px 12px" }}>
              Your Fork ↗
            </a>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>

          {/* COMMITS TAB */}
          {tab === "commits" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                <div className="card" style={{ borderTop: "3px solid #22c55e" }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#22c55e", marginBottom: "12px" }}>📦 Main Repo — mscartiles-lab</div>
                  <div style={{ fontSize: "24px", fontWeight: "700" }}>{upstreamCommits.length}</div>
                  <div style={{ fontSize: "12px", color: "var(--color-muted)" }}>total commits tracked</div>
                </div>
                <div className="card" style={{ borderTop: "3px solid #5c7cfa" }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#5c7cfa", marginBottom: "12px" }}>🍴 Your Fork — Verstige</div>
                  <div style={{ fontSize: "24px", fontWeight: "700" }}>{forkCommits.length}</div>
                  <div style={{ fontSize: "12px", color: "var(--color-muted)" }}>commits on your fork</div>
                </div>
              </div>

              {allCommits.length === 0 && (
                <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--color-muted)" }}>
                  No commits found. Make sure GITHUB_TOKEN is set in your .env
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {allCommits.map((commit) => (
                  <div key={commit.sha} className="card" style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "12px 16px" }}>
                    <img src={commit.author?.avatar_url || `https://github.com/${commit.author?.login || "ghost"}.png`} alt="" width={32} height={32} style={{ borderRadius: "50%", flexShrink: 0, marginTop: "2px" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "12px", color: "var(--color-muted)", fontWeight: "500" }}>{commit.commit.author.name}</span>
                        <span style={{ fontSize: "11px", background: commit.fork ? "rgba(92,124,250,0.15)" : "rgba(34,197,94,0.15)", color: commit.fork ? "#5c7cfa" : "#22c55e", padding: "1px 7px", borderRadius: "999px", fontWeight: "600" }}>
                          {commit.source}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--color-muted)" }}>{timeAgo(commit.commit.author.date)}</span>
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--color-text)", marginBottom: "4px", wordBreak: "break-word" }}>
                        {commit.commit.message.split("\n")[0]}
                      </div>
                      <a href={commit.html_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "var(--color-brand)", fontFamily: "monospace" }}>
                        {commit.shortSha}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PRS TAB */}
          {tab === "prs" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {prs.flatMap((r) => r.data).length === 0 && (
                <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--color-muted)" }}>No open pull requests</div>
              )}
              {prs.flatMap((r) => r.data.map((pr: any) => ({ ...pr, source: r.label }))).map((pr: any) => (
                <div key={pr.id} className="card" style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ fontSize: "16px" }}>🔀</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>{pr.title}</div>
                      <div style={{ fontSize: "12px", color: "var(--color-muted)", marginBottom: "8px" }}>
                        #{pr.number} by {pr.user?.login} · {pr.head?.ref} → {pr.base?.ref}
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <a href={pr.html_url} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: "12px", padding: "4px 10px" }}>View PR ↗</a>
                        <span style={{ fontSize: "11px", background: "rgba(34,197,94,0.15)", color: "#22c55e", padding: "4px 10px", borderRadius: "999px", display: "flex", alignItems: "center" }}>
                          {pr.state}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* COMPARE TAB */}
          {tab === "compare" && (
            <div>
              <div className="card" style={{ marginBottom: "20px", padding: "20px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "12px" }}>Upstream vs Fork</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "16px", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "var(--color-muted)", marginBottom: "4px" }}>Main Repo</div>
                    <div style={{ fontSize: "14px", fontWeight: "600" }}>mscartiles-lab/open-local</div>
                    <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "4px" }}>{upstreamCommits.length} commits</div>
                  </div>
                  <div style={{ fontSize: "20px", color: "var(--color-muted)" }}>⟷</div>
                  <div>
                    <div style={{ fontSize: "12px", color: "var(--color-muted)", marginBottom: "4px" }}>Your Fork</div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#5c7cfa" }}>Verstige/open-local</div>
                    <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "4px" }}>{forkCommits.length} commits</div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: "20px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px" }}>How the workflow works</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[
                    { step: "1", title: "Work on your fork", desc: "Clone your fork locally → make changes → push to Verstige/open-local" },
                    { step: "2", title: "Open a Pull Request", desc: "From your branch → send PR to mscartiles-lab/open-local:main" },
                    { step: "3", title: "Chrissy reviews", desc: "She reviews the PR on GitHub, requests changes or approves" },
                    { step: "4", title: "Merge to main", desc: "Once approved, PR gets merged into the main repo" },
                  ].map((item) => (
                    <div key={item.step} style={{ display: "flex", gap: "14px" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--color-brand)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", flexShrink: 0 }}>{item.step}</div>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "2px" }}>{item.title}</div>
                        <div style={{ fontSize: "12px", color: "var(--color-muted)" }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "20px", padding: "14px", background: "var(--color-bg)", borderRadius: "6px", fontSize: "13px", fontFamily: "monospace" }}>
                  <div style={{ color: "var(--color-muted)", marginBottom: "6px" }}>Local workflow:</div>
                  <div>git checkout -b feature/my-change</div>
                  <div># ... make changes ...</div>
                  <div>git push origin feature/my-change</div>
                  <div style={{ color: "var(--color-brand)" }}># Then open PR at github.com/Verstige/open-local</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
