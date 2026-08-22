"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

export default function CredentialsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [creds, setCreds] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [filterProject, setFilterProject] = useState("");
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ name: "", category: "OTHER", url: "", username: "", password: "", notes: "", projectId: "" });

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  const load = useCallback(async () => {
    const qs = filterProject ? `?projectId=${filterProject}` : "";
    const [c, p] = await Promise.all([
      fetch("/api/credentials" + qs).then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]);
    setCreds(c); setProjects(p);
  }, [filterProject]);
  useEffect(() => { if (status === "authenticated") load(); }, [status, load]);

  async function createCred(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/credentials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setLoading(false); setShowNew(false);
    setForm({ name: "", category: "OTHER", url: "", username: "", password: "", notes: "", projectId: "" });
    load();
  }

  const CATEGORY_COLORS: Record<string, string> = { CLOUD: "#3b82f6", DATABASE: "#22c55e", API: "#f59e0b", OTHER: "#7c7f8e" };

  if (status === "loading") return null;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: "220px", background: "var(--color-surface)", borderRight: "1px solid var(--color-border)", padding: "20px 12px" }}>
        <div style={{ fontSize: "16px", fontWeight: "700", padding: "8px 12px", marginBottom: "16px" }}>Ops Board</div>
        {[{ href: "/dashboard", label: "Dashboard", icon: "⌂" }, { href: "/tasks", label: "Tasks", icon: "◎" }, { href: "/calendar", label: "Calendar", icon: "◷" }, { href: "/notes", label: "Notes", icon: "▤" }, { href: "/credentials", label: "Credentials", icon: "🔑" }].map((n) => (
          <a key={n.href} href={n.href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "6px", color: n.href === "/credentials" ? "var(--color-text)" : "var(--color-muted)", fontSize: "14px", fontWeight: n.href === "/credentials" ? "600" : "400", background: n.href === "/credentials" ? "rgba(92,124,250,0.1)" : "transparent" }}><span>{n.icon}</span> {n.label}</a>
        ))}
      </aside>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: "700" }}>Credentials</h1>
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} style={{ width: "auto", maxWidth: "200px", fontSize: "13px" }}><option value="">All Projects</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <div style={{ marginLeft: "auto" }}><button onClick={() => setShowNew(true)} className="btn-primary">+ Add Credential</button></div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
          {creds.length === 0 && <div style={{ textAlign: "center", color: "var(--color-muted)", paddingTop: "60px", fontSize: "14px" }}>No credentials stored yet</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
            {creds.map((cred) => (
              <div key={cred.id} className="card" style={{ borderTop: `3px solid ${CATEGORY_COLORS[cred.category] || "#7c7f8e"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", background: `${CATEGORY_COLORS[cred.category] || "#7c7f8e"}22`, color: CATEGORY_COLORS[cred.category] || "#7c7f8e", padding: "2px 8px", borderRadius: "999px", textTransform: "uppercase" }}>{cred.category}</span>
                  <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>{cred.project?.name || "No project"}</span>
                </div>
                <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "10px" }}>{cred.name}</div>
                {cred.url && <div style={{ fontSize: "13px", color: "var(--color-muted)", marginBottom: "6px" }}>🔗 <a href={cred.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-brand)" }}>{cred.url}</a></div>}
                {cred.username && <div style={{ fontSize: "13px", marginBottom: "4px" }}>👤 {cred.username}</div>}
                {cred.password && (
                  <div style={{ fontSize: "13px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                    🔑 {revealed[cred.id] ? cred.password : "••••••••••"}
                    <button onClick={() => setRevealed((p) => ({ ...p, [cred.id]: !p[cred.id] }))} style={{ background: "none", border: "none", color: "var(--color-muted)", cursor: "pointer", fontSize: "11px" }}>{revealed[cred.id] ? "Hide" : "Reveal"}</button>
                  </div>
                )}
                {cred.notes && <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "8px", borderTop: "1px solid var(--color-border)", paddingTop: "8px" }}>{cred.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      </main>
      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "480px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}><h2 style={{ fontSize: "16px", fontWeight: "700" }}>Add Credential</h2><button onClick={() => setShowNew(false)} style={{ background: "none", border: "none", color: "var(--color-muted)", cursor: "pointer", fontSize: "18px" }}>✕</button></div>
            <form onSubmit={createCred} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name (e.g. Railway Production)" required autoFocus />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div><label style={{ fontSize: "12px", color: "var(--color-muted)", display: "block", marginBottom: "4px" }}>Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: "auto" }}>{["CLOUD","DATABASE","API","OTHER"].map((c) => <option key={c}>{c}</option>)}</select></div>
                <div><label style={{ fontSize: "12px", color: "var(--color-muted)", display: "block", marginBottom: "4px" }}>Project</label><select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} style={{ width: "auto" }}><option value="">No project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              </div>
              <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="URL (e.g. https://railway.com)" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Username / email" />
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password / token" />
              </div>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optional)" rows={2} />
              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "8px" }}>{loading ? "Saving..." : "Save Credential"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
