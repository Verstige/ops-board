"use client";

import { useEffect, useState, useCallback } from "react";
import { IconPlus, IconClose } from "@/components/Icons";

const CATEGORY_COLORS: Record<string, string> = {
  CLOUD:    "var(--status-progress-fg)",
  DATABASE: "var(--status-done-fg)",
  API:      "var(--priority-high)",
  OTHER:    "var(--text-muted)",
};

export default function CredentialsPage() {
  const [creds, setCreds] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [filterProject, setFilterProject] = useState("");
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ name: "", category: "OTHER", url: "", username: "", password: "", notes: "", projectId: "" });

  const load = useCallback(async () => {
    const qs = filterProject ? `?projectId=${filterProject}` : "";
    const [c, p] = await Promise.all([
      fetch("/api/credentials" + qs).then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]);
    setCreds(c); setProjects(p);
  }, [filterProject]);
  useEffect(() => { load(); }, [load]);

  async function createCred(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/credentials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setLoading(false); setShowNew(false);
    setForm({ name: "", category: "OTHER", url: "", username: "", password: "", notes: "", projectId: "" });
    load();
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
            .09 — Credentials
          </div>
          <h1 className="section-title">Vault</h1>
          <p className="section-subtitle">Encrypted credential store for the team.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} style={{ width: "auto", minWidth: 160, fontSize: 13 }}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => setShowNew(true)} className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <IconPlus size={16} /> Add Credential
          </button>
        </div>
      </div>

      {creds.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          No credentials stored yet
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        {creds.map((cred) => {
          const color = CATEGORY_COLORS[cred.category] || CATEGORY_COLORS.OTHER;
          return (
            <div key={cred.id} className="card glass-fade" style={{ borderTop: `2px solid ${color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                  background: `color-mix(in srgb, ${color} 14%, transparent)`,
                  color: color,
                  padding: "3px 9px", borderRadius: 999,
                }}>
                  {cred.category}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{cred.project?.name || "No project"}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em", marginBottom: 12 }}>
                {cred.name}
              </div>
              {cred.url && (
                <div style={{ fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: "var(--text-muted)", marginRight: 6 }}>URL</span>
                  <a href={cred.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-600)" }}>{cred.url}</a>
                </div>
              )}
              {cred.username && (
                <div style={{ fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: "var(--text-muted)", marginRight: 6 }}>User</span>
                  <span style={{ color: "var(--text-secondary)" }}>{cred.username}</span>
                </div>
              )}
              {cred.password && (
                <div style={{ fontSize: 13, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--text-muted)" }}>Pass</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                    {revealed[cred.id] ? cred.password : "••••••••••"}
                  </span>
                  <button
                    onClick={() => setRevealed((p) => ({ ...p, [cred.id]: !p[cred.id] }))}
                    className="btn-ghost"
                    style={{ fontSize: 11, padding: "4px 10px", marginLeft: "auto" }}
                  >
                    {revealed[cred.id] ? "Hide" : "Reveal"}
                  </button>
                </div>
              )}
              {cred.notes && (
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                  {cred.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="card glass-strong modal-panel glass-fade" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>New credential</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Add credential</h2>
              </div>
              <button onClick={() => setShowNew(false)} className="btn-icon" aria-label="Close"><IconClose size={16} /></button>
            </div>
            <form onSubmit={createCred} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name (e.g. Railway Production)" required autoFocus />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {["CLOUD","DATABASE","API","OTHER"].map((c) => <option key={c}>{c}</option>)}
                </select>
                <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                  <option value="">No project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="URL (optional)" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Username / email" />
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password / token" />
              </div>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optional)" rows={2} />
              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 6 }}>{loading ? "Saving…" : "Save credential"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}