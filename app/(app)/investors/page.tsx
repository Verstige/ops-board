"use client";

import { useEffect, useState, useCallback } from "react";
import { IconPlus, IconClose } from "@/components/Icons";

const TYPE_META: Record<string, { color: string; label: string }> = {
  PROGRESS:  { color: "var(--status-progress-fg)", label: "Progress" },
  METRIC:    { color: "var(--status-done-fg)",     label: "Metric" },
  DEMO:      { color: "#a78bfa",                    label: "Demo" },
  MILESTONE: { color: "var(--priority-high)",       label: "Milestone" },
  PITCH:     { color: "#f472b6",                    label: "Pitch" },
};

export default function InvestorUpdatesPage() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", type: "PROGRESS" });

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch("/api/investor-updates").then((r) => r.json());
    setUpdates(data);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

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

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
            .07 — Investors
          </div>
          <h1 className="section-title">Investor Updates</h1>
          <p className="section-subtitle">Track progress for Chrissy to share with investors.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <IconPlus size={16} /> New Update
        </button>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 60 }}>Loading…</div>
      ) : updates.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          No investor updates yet. Log your first one.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {updates.map((u) => {
            const meta = TYPE_META[u.type] || TYPE_META.PROGRESS;
            return (
              <div key={u.id} className="card glass-fade" style={{ borderLeft: `3px solid ${meta.color}`, padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                    background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                    color: meta.color,
                    padding: "3px 9px", borderRadius: 999,
                  }}>
                    {meta.label}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{u.author.name}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
                    {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em", marginBottom: 10 }}>
                  {u.title}
                </div>
                <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{u.content}</div>
                {u.metrics && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)", display: "flex", gap: 20, flexWrap: "wrap" }}>
                    {Object.entries(u.metrics).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: "-0.025em", color: meta.color, fontVariantNumeric: "tabular-nums" }}>{String(v)}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{k.replace(/([A-Z])/g, " $1").trim()}</div>
                      </div>
                    ))}
                  </div>
                )}
                {u.sentAt && (
                  <div style={{ marginTop: 12, fontSize: 12, color: "var(--status-done-fg)", fontWeight: 600 }}>
                    ✓ Sent {new Date(u.sentAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="card glass-strong modal-panel glass-fade" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>New investor update</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Log progress</h2>
              </div>
              <button onClick={() => setShowNew(false)} className="btn-icon" aria-label="Close"><IconClose size={16} /></button>
            </div>
            <form onSubmit={createUpdate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, display: "block", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Update type</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(TYPE_META).map(([key, m]) => {
                    const active = form.type === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm({ ...form, type: key })}
                        style={{
                          fontSize: 12, padding: "7px 14px", borderRadius: 10,
                          border: `1px solid ${active ? m.color : "var(--line-strong)"}`,
                          background: active ? `color-mix(in srgb, ${m.color} 14%, transparent)` : "transparent",
                          color: active ? m.color : "var(--text-muted)",
                          cursor: "pointer", fontWeight: active ? 600 : 500,
                        }}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Update title" required autoFocus />
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="What happened this update? Describe progress, demos shipped, metrics, milestones…"
                rows={6}
                style={{ resize: "vertical" }}
              />
              <button type="submit" className="btn-primary" style={{ marginTop: 6 }}>Save Update</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}