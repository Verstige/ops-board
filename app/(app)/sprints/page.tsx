"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";

const STATUS_META: Record<string, { color: string; label: string }> = {
  PLANNING:  { color: "var(--priority-high)",    label: "Planning" },
  ACTIVE:    { color: "var(--status-progress-fg)", label: "Active" },
  COMPLETED: { color: "var(--status-done-fg)",     label: "Completed" },
};

const TASK_COLS = [
  { key: "TODO", label: "To Do" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "DONE", label: "Done" },
  { key: "BLOCKED", label: "Blocked" },
];

export default function SprintsPage() {
  const { status } = useSession();
  const [sprints, setSprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch("/api/sprints").then((r) => r.json());
    setSprints(data);
    if (data.length > 0 && !activeTab) setActiveTab(data[0].id);
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { if (status === "authenticated") load(); }, [status, load]);

  const active = sprints.find((s) => s.id === activeTab);

  const velocity = (sprint: any) => {
    const done = sprint.tasks.filter((t: any) => t.status === "DONE").reduce((a: number, t: any) => a + (t.storyPoints || 1), 0);
    const total = sprint.tasks.reduce((a: number, t: any) => a + (t.storyPoints || 1), 0);
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
          .04 — Sprints
        </div>
        <h1 className="section-title">Sprints</h1>
        <p className="section-subtitle">Track velocity and ship work in cycles.</p>
      </div>

      {/* Sprint tabs */}
      {sprints.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 24, overflowX: "auto" }} className="scroll-hide">
          {sprints.map((s) => {
            const meta = STATUS_META[s.status] || STATUS_META.PLANNING;
            const active = activeTab === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveTab(s.id)}
                style={{
                  background: active ? "color-mix(in srgb, var(--brand-500) 14%, transparent)" : "var(--glass-bg)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  color: active ? "var(--brand-600)" : "var(--text-secondary)",
                  border: `1px solid ${active ? "color-mix(in srgb, var(--brand-500) 30%, transparent)" : "var(--line-strong)"}`,
                  borderRadius: 12,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  whiteSpace: "nowrap",
                  transition: "all 0.15s",
                }}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 60 }}>Loading…</div>
      ) : active ? (
        <>
          {/* Sprint header card */}
          <div className="card" style={{ marginBottom: 20, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{active.name}</span>
                  {(() => {
                    const meta = STATUS_META[active.status] || STATUS_META.PLANNING;
                    return (
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                        background: "color-mix(in srgb, currentColor 14%, transparent)",
                        color: meta.color,
                        padding: "3px 10px", borderRadius: 999,
                      }}>
                        {meta.label}
                      </span>
                    );
                  })()}
                </div>
                {active.goal && (
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Goal: {active.goal}</div>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {format(new Date(active.startDate), "MMM d")} – {format(new Date(active.endDate), "MMM d, yyyy")}
              </div>
            </div>

            {/* Velocity bar */}
            {(() => {
              const v = velocity(active);
              return (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                    <span style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Velocity</span>
                    <span style={{ fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                      {v.done}/{v.total} pts · {v.pct}%
                    </span>
                  </div>
                  <div style={{ height: 8, background: "var(--line)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${v.pct}%`,
                      background: "linear-gradient(90deg, var(--brand-400), var(--brand-600))",
                      borderRadius: 999,
                      transition: "width 0.4s",
                    }} />
                  </div>
                </div>
              );
            })()}

            {/* Members */}
            {active.members.length > 0 && (
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {active.members.map((m: any) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--brand-300), var(--brand-600))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontSize: 11, fontWeight: 700,
                    }}>
                      {m.user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{m.user.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sprint task grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
            className="scroll-hide"
          >
            {TASK_COLS.map((col) => {
              const colTasks = active.tasks.filter((t: any) => t.status === col.key);
              return (
                <div key={col.key} style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "4px 4px 0" }}>
                    <span className={`status-dot dot-${col.key}`} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{col.label}</span>
                    <span style={{
                      marginLeft: "auto", fontSize: 10, fontWeight: 700,
                      background: "var(--glass-bg)", color: "var(--text-muted)",
                      border: "1px solid var(--line)", borderRadius: 999, padding: "2px 7px",
                    }}>{colTasks.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {colTasks.map((task: any) => (
                      <div key={task.id} className="card" style={{ padding: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.4 }}>
                          {task.title}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                          {task.artifact && (
                            <span style={{
                              fontSize: 10, fontWeight: 700,
                              background: `${task.artifact.color}22`,
                              color: task.artifact.color,
                              padding: "2px 7px", borderRadius: 999,
                            }}>
                              {task.artifact.name}
                            </span>
                          )}
                          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                          {task.storyPoints && (
                            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{task.storyPoints}pt</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{task.assignee.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 60 }}>
          No sprints yet. Run the seed to populate.
        </div>
      )}
    </div>
  );
}