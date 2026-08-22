"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  TECHNICAL:    { label: "Technical Leadership",  color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  OPERATIONAL: { label: "Operational Leadership", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  EXECUTIVE:   { label: "Executive Leadership",  color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  GROWTH:      { label: "Growth",                color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
};

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  NOT_STARTED: { color: "#7c7f8e", bg: "#2a2d3a", label: "Not Started" },
  IN_PROGRESS: { color: "#60a5fa", bg: "rgba(96,165,250,0.15)", label: "In Progress" },
  COMPLETED:   { color: "#22c55e", bg: "rgba(34,197,94,0.15)", label: "Completed" },
  AT_RISK:     { color: "#f87171", bg: "rgba(248,113,113,0.15)", label: "At Risk" },
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

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: "4px", background: "var(--color-border)", borderRadius: "999px", marginTop: "8px" }}>
      <div style={{ height: "4px", width: `${pct}%`, background: "#22c55e", borderRadius: "999px", transition: "width 0.3s" }} />
    </div>
  );
}

export default function MilestonesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Milestone | null>(null);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch("/api/milestones").then((r) => r.json());
    setMilestones(data);
    setLoading(false);
  }, []);

  useEffect(() => { if (status === "authenticated") load(); }, [status, load]);

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

  if (status === "loading") return null;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: "220px", background: "var(--color-surface)", borderRight: "1px solid var(--color-border)", padding: "20px 12px" }}>
        <div style={{ fontSize: "16px", fontWeight: "700", padding: "8px 12px", marginBottom: "16px" }}>Ops Board</div>
        {[
          { href: "/dashboard", label: "Dashboard", icon: "⌂" },
          { href: "/tasks", label: "Tasks", icon: "◎" },
          { href: "/sprints", label: "Sprints", icon: "⚡" },
          { href: "/milestones", label: "Milestones", icon: "🏁", active: true },
          { href: "/github", label: "GitHub", icon: "⌥" },
          { href: "/investors", label: "Investors", icon: "📈" },
          { href: "/calendar", label: "Calendar", icon: "◷" },
          { href: "/notes", label: "Notes", icon: "▤" },
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
        <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <h1 style={{ fontSize: "18px", fontWeight: "700" }}>90-Day Milestones</h1>
            <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>CTO Evaluation — Equity Gates</span>
          </div>
          {/* Summary strip */}
          <div style={{ display: "flex", gap: "24px", marginTop: "16px" }}>
            {[
              { label: "Total", value: milestones.length, color: "var(--color-text)" },
              { label: "In Progress", value: inProgressCount, color: "#60a5fa" },
              { label: "Completed", value: completedCount, color: "#22c55e" },
              { label: "Not Started", value: milestones.length - inProgressCount - completedCount, color: "#7c7f8e" },
            ].map((s) => (
              <div key={s.label}>
                <span style={{ fontSize: "20px", fontWeight: "700", color: s.color }}>{s.value}</span>
                <span style={{ fontSize: "13px", color: "var(--color-muted)", marginLeft: "6px" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
          {loading ? (
            <div style={{ color: "var(--color-muted)", padding: "40px", textAlign: "center" }}>Loading...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {milestones.map((m) => {
                const meta = CATEGORY_META[m.category] || CATEGORY_META.TECHNICAL;
                const statusMeta = STATUS_META[m.status] || STATUS_META.NOT_STARTED;
                const doneTasks = m.tasks.filter((t) => t.status === "DONE").length;
                const pct = m.tasks.length > 0 ? Math.round((doneTasks / m.tasks.length) * 100) : 0;

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelected(selected?.id === m.id ? null : m)}
                    style={{
                      background: "var(--color-surface)",
                      border: `1px solid ${selected?.id === m.id ? meta.color : "var(--color-border)"}`,
                      borderRadius: "8px",
                      padding: "16px 20px",
                      cursor: "pointer",
                      borderLeft: `4px solid ${meta.color}`,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "700", background: meta.bg, color: meta.color, padding: "2px 8px", borderRadius: "999px", textTransform: "uppercase" }}>
                            {meta.label}
                          </span>
                          <span style={{ fontSize: "11px", fontWeight: "600", background: statusMeta.bg, color: statusMeta.color, padding: "2px 8px", borderRadius: "999px" }}>
                            {statusMeta.label}
                          </span>
                        </div>
                        <div style={{ fontSize: "15px", fontWeight: "600", marginBottom: "4px" }}>{m.title}</div>
                        {m.description && <div style={{ fontSize: "13px", color: "var(--color-muted)", lineHeight: "1.5" }}>{m.description}</div>}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: "600" }}>{doneTasks}/{m.tasks.length}</div>
                        <div style={{ fontSize: "11px", color: "var(--color-muted)" }}>tasks done</div>
                        {m.targetDate && (
                          <div style={{ fontSize: "11px", color: "var(--color-muted)", marginTop: "4px" }}>
                            Due: {new Date(m.targetDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <ProgressBar pct={pct} />

                    {/* Expanded detail */}
                    {selected?.id === m.id && (
                      <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--color-border)" }}>
                        <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
                          {["NOT_STARTED", "IN_PROGRESS", "AT_RISK", "COMPLETED"].map((s) => (
                            <button
                              key={s}
                              onClick={(e) => { e.stopPropagation(); updateStatus(m.id, s); }}
                              style={{
                                fontSize: "11px",
                                padding: "4px 10px",
                                borderRadius: "999px",
                                border: "1px solid var(--color-border)",
                                background: m.status === s ? STATUS_META[s].bg : "transparent",
                                color: m.status === s ? STATUS_META[s].color : "var(--color-muted)",
                                cursor: "pointer",
                                fontWeight: m.status === s ? "600" : "400",
                              }}
                            >
                              {STATUS_META[s].label}
                            </button>
                          ))}
                        </div>
                        {m.tasks.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {m.tasks.map((t) => (
                              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                                <span className={`status-dot dot-${t.status === "DONE" ? "DONE" : t.status === "IN_PROGRESS" ? "IN_PROGRESS" : "TODO"}`} />
                                <span style={{ flex: 1, textDecoration: t.status === "DONE" ? "line-through" : "none", color: t.status === "DONE" ? "var(--color-muted)" : "var(--color-text)" }}>
                                  {t.title}
                                </span>
                                <span style={{ fontSize: "11px", color: "var(--color-muted)" }}>{t.assignee.name}</span>
                                <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: "13px", color: "var(--color-muted)" }}>No tasks linked yet</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
