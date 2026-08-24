"use client";

import { useEffect, useState, useCallback } from "react";

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  TECHNICAL:    { label: "Technical Leadership",  color: "var(--status-progress-fg)" },
  OPERATIONAL: { label: "Operational Leadership", color: "var(--status-done-fg)" },
  EXECUTIVE:   { label: "Executive Leadership",  color: "var(--priority-high)" },
  GROWTH:      { label: "Growth",                color: "#f472b6" },
};

const STATUS_META: Record<string, { color: string; label: string }> = {
  NOT_STARTED: { color: "var(--status-todo-fg)",     label: "Not Started" },
  IN_PROGRESS: { color: "var(--status-progress-fg)", label: "In Progress" },
  COMPLETED:   { color: "var(--status-done-fg)",     label: "Completed" },
  AT_RISK:     { color: "var(--status-blocked-fg)",  label: "At Risk" },
};

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  targetDate: string | null;
  completedAt: string | null;
  notes: string | null;
  _count: { tasks: number };
  tasks: { id: string; title: string; status: string; priority: string; assignee: { name: string } }[];
};

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Milestone | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch("/api/milestones").then((r) => r.json());
    setMilestones(data);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, newStatus: string) {
    await fetch(`/api/milestones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
    if (selected?.id === id) setSelected((s) => s ? { ...s, status: newStatus } : null);
  }

  const completedCount = milestones.filter((m) => m.status === "COMPLETED").length;
  const inProgressCount = milestones.filter((m) => m.status === "IN_PROGRESS").length;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
          .05 — Milestones
        </div>
        <h1 className="section-title">90-Day Evaluation</h1>
        <p className="section-subtitle">CTO equity gates & leadership milestones</p>
      </div>

      {/* Summary strip */}
      <div className="card" style={{ marginBottom: 24, padding: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {[
            { label: "Total",       value: milestones.length,                       color: "var(--text-primary)" },
            { label: "In Progress", value: inProgressCount,                          color: "var(--status-progress-fg)" },
            { label: "Completed",   value: completedCount,                            color: "var(--status-done-fg)" },
            { label: "Not Started", value: milestones.length - inProgressCount - completedCount, color: "var(--status-todo-fg)" },
          ].map((s) => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.035em", color: s.color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 60 }}>Loading…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {milestones.map((m) => {
            const meta = CATEGORY_META[m.category] || CATEGORY_META.TECHNICAL;
            const statusMeta = STATUS_META[m.status] || STATUS_META.NOT_STARTED;
            const doneTasks = m.tasks.filter((t) => t.status === "DONE").length;
            const pct = m.tasks.length > 0 ? Math.round((doneTasks / m.tasks.length) * 100) : 0;
            const isSelected = selected?.id === m.id;

            return (
              <div
                key={m.id}
                className="card glass-fade"
                onClick={() => setSelected(isSelected ? null : m)}
                style={{
                  cursor: "pointer",
                  borderLeft: `3px solid ${meta.color}`,
                  padding: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                        background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                        color: meta.color,
                        padding: "3px 9px", borderRadius: 999,
                      }}>
                        {meta.label}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                        background: `color-mix(in srgb, ${statusMeta.color} 14%, transparent)`,
                        color: statusMeta.color,
                        padding: "3px 9px", borderRadius: 999,
                      }}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em", marginBottom: 4 }}>
                      {m.title}
                    </div>
                    {m.description && (
                      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>{m.description}</div>
                    )}
                    <div style={{ height: 4, background: "var(--line)", borderRadius: 999, marginTop: 12, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${pct}%`,
                        background: `linear-gradient(90deg, ${meta.color}, var(--brand-500))`,
                        borderRadius: 999, transition: "width 0.4s",
                      }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                      {doneTasks}/{m.tasks.length}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>tasks done</div>
                    {m.targetDate && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                        Due {new Date(m.targetDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                      {["NOT_STARTED", "IN_PROGRESS", "AT_RISK", "COMPLETED"].map((s) => {
                        const sm = STATUS_META[s];
                        const active = m.status === s;
                        return (
                          <button
                            key={s}
                            onClick={(e) => { e.stopPropagation(); updateStatus(m.id, s); }}
                            style={{
                              fontSize: 11, fontWeight: active ? 700 : 500,
                              padding: "5px 12px", borderRadius: 999,
                              border: `1px solid ${active ? sm.color : "var(--line-strong)"}`,
                              background: active ? `color-mix(in srgb, ${sm.color} 14%, transparent)` : "transparent",
                              color: active ? sm.color : "var(--text-muted)",
                              cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em",
                            }}
                          >
                            {sm.label}
                          </button>
                        );
                      })}
                    </div>
                    {m.tasks.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {m.tasks.map((t) => (
                          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                            <span className={`status-dot dot-${t.status === "DONE" ? "DONE" : t.status === "IN_PROGRESS" ? "IN_PROGRESS" : "TODO"}`} />
                            <span style={{
                              flex: 1,
                              textDecoration: t.status === "DONE" ? "line-through" : "none",
                              color: t.status === "DONE" ? "var(--text-muted)" : "var(--text-primary)",
                            }}>
                              {t.title}
                            </span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.assignee.name}</span>
                            <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No tasks linked yet</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}