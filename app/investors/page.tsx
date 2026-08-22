"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

const TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
  PROGRESS:  { icon: "📦", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  METRIC:    { icon: "📊", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  DEMO:      { icon: "🎯", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  MILESTONE: { icon: "🏁", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  PITCH:     { icon: "🚀", color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
};

export default function InvestorUpdatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", type: "PROGRESS" });

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch("/api/investor-updates").then((r) => r.json());
    setUpdates(data);
    setLoading(false);
  }, []);
  useEffect(() => { if (status === "authenticated") load(); }, [status, load]);

  async function createUpdate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/investor-updates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowNew(false);
    setForm({ title: "", content: "", type: "PROGRESS" });
    load();
  }

  if (status === "loading") return null;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: "220px", background: "var(--color-surface)", borderRight: "1px solid var(--color-border)", padding: "20px 12px" }}>
        <div style={{ fontSize: "16px", fontWeight: "700", padding: "8px 12px", marginBottom: "16px" }}>Ops Board</div>
        {[
          { href: "/dashboard", label: "Dashboard", icon: "⌂" },
          { href: "/tasks", label: "Tasks", icon: "◎" },
          { href: "/sprints", label: "Sprints", icon: "⚡" },
          { href: "/milestones", label: "Milestones", icon: "🏁" },
          { href: "/github", label: "GitHub", icon: "⌥" },
          { href: "/investors", label: "Investors", icon: "📈", active: true },
          { href: "/calendar", label: "Calendar", icon: "◷" },
        ].map((n) => (
          <a key={n.href} href={n.href} style={{
            display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "6px",
            color: n.active ? "var(--color-text)" : "var(--color-muted)",
            fontSize: "14px", fontWeight: n.active ? "600" : "400",
            background: n.active ? "rgba(92,124,250,0.1)" : "transparent",
          }}><span>{n.icon}</span> {n.label}</a>
        ))}
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: "700" }}>Investor Updates</h1>
          <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>Track progress for Chrissy to share with investors</span>
          <div style={{ marginLeft: "auto" }}>
            <button onClick={() => setShowNew(true)} className="btn-primary">+ New Update</button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
          {loading ? (
            <div style={{ color: "var(--color-muted)", textAlign: "center", padding: "60px" }}>Loading...</div>
          ) : updates.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "60px", color: "var(--color-muted)" }}>
              No investor updates yet. Log your first one.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {updates.map((u) => {
                const meta = TYPE_META[u.type] || TYPE_META.PROGRESS;
                return (
                  <div key={u.id} className="card" style={{ borderLeft: `4px solid ${meta.color}`, padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                      <span style={{ fontSize: "20px" }}>{meta.icon}</span>
                      <span style={{ fontSize: "11px", fontWeight: "700", background: meta.bg, color: meta.color, padding: "2px 10px", borderRadius: "999px", textTransform: "uppercase" }}>
                        {u.type}
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>{u.author.name}</span>
                      <span style={{ fontSize: "12px", color: "var(--color-muted)", marginLeft: "auto" }}>
                        {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>{u.title}</div>
                    <div style={{ fontSize: "14px", color: "var(--color-muted)", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>{u.content}</div>
                    {u.metrics && (
                      <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--color-border)", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                        {Object.entries(u.metrics).map(([k, v]) => (
                          <div key={k} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "20px", fontWeight: "700", color: meta.color }}>{String(v)}</div>
                            <div style={{ fontSize: "11px", color: "var(--color-muted)", textTransform: "capitalize" }}>{k.replace(/([A-Z])/g, " $1").trim()}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {u.sentAt && (
                      <div style={{ marginTop: "10px", fontSize: "12px", color: "#22c55e" }}>✓ Sent {new Date(u.sentAt).toLocaleDateString()}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showNew && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
            <div className="card" style={{ width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: "700" }}>New Investor Update</h2>
                <button onClick={() => setShowNew(false)} style={{ background: "none", border: "none", color: "var(--color-muted)", cursor: "pointer", fontSize: "18px" }}>✕</button>
              </div>
              <form onSubmit={createUpdate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "13px", color: "var(--color-muted)", display: "block", marginBottom: "6px" }}>Update Type</label>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {Object.entries(TYPE_META).map(([key, meta]) => (
                      <button key={key} type="button" onClick={() => setForm({ ...form, type: key })} style={{
                        fontSize: "12px", padding: "6px 12px", borderRadius: "8px",
                        border: `1px solid ${form.type === key ? meta.color : "var(--color-border)"}`,
                        background: form.type === key ? meta.bg : "transparent",
                        color: form.type === key ? meta.color : "var(--color-muted)",
                        cursor: "pointer", fontWeight: form.type === key ? "600" : "400",
                      }}>
                        {meta.icon} {key.charAt(0) + key.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Update title" required autoFocus />
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="What happened this update? Describe progress, demos shipped, metrics, milestones..." rows={6} style={{ resize: "vertical" }} />
                <button type="submit" className="btn-primary" style={{ marginTop: "8px" }}>Save Update</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
