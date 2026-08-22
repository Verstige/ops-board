"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  PLANNING: { color: "#fbbf24", bg: "rgba(251,191,36,0.15)", label: "Planning" },
  ACTIVE:   { color: "#60a5fa", bg: "rgba(96,165,250,0.15)",  label: "Active" },
  COMPLETED:{ color: "#22c55e", bg: "rgba(34,197,94,0.15)",  label: "Completed" },
};

export default function SprintsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sprints, setSprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch("/api/sprints").then((r) => r.json());
    setSprints(data);
    if (data.length > 0 && !activeTab) setActiveTab(data[0].id);
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { if (status === "authenticated") load(); }, [status, load]);

  const active = sprints.find((s) => s.id === activeTab);

  // Velocity: story points done vs total
  const velocity = (sprint: any) => {
    const done = sprint.tasks.filter((t: any) => t.status === "DONE").reduce((acc: number, t: any) => acc + (t.storyPoints || 1), 0);
    const total = sprint.tasks.reduce((acc: number, t: any) => acc + (t.storyPoints || 1), 0);
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  const totalVelocity = () => {
    const allDone = sprints.flatMap((s: any) => s.tasks).filter((t: any) => t.status === "DONE").reduce((acc: number, t: any) => acc + (t.storyPoints || 1), 0);
    const allTotal = sprints.flatMap((s: any) => s.tasks).reduce((acc: number, t: any) => acc + (t.storyPoints || 1), 0);
    return { done: allDone, total: allTotal };
  };

  if (status === "loading") return null;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: "220px", background: "var(--color-surface)", borderRight: "1px solid var(--color-border)", padding: "20px 12px" }}>
        <div style={{ fontSize: "16px", fontWeight: "700", padding: "8px 12px", marginBottom: "16px" }}>Ops Board</div>
        {[
          { href: "/dashboard", label: "Dashboard", icon: "⌂" },
          { href: "/tasks", label: "Tasks", icon: "◎" },
          { href: "/sprints", label: "Sprints", icon: "⚡", active: true },
          { href: "/milestones", label: "Milestones", icon: "🏁" },
          { href: "/github", label: "GitHub", icon: "⌥" },
          { href: "/investors", label: "Investors", icon: "📈" },
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
        <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <h1 style={{ fontSize: "18px", fontWeight: "700" }}>Sprints</h1>
          </div>
          {/* Sprint tabs */}
          <div style={{ display: "flex", gap: "4px" }}>
            {sprints.map((s) => {
              const meta = STATUS_META[s.status] || STATUS_META.PLANNING;
              return (
                <button key={s.id} onClick={() => setActiveTab(s.id)} style={{
                  background: activeTab === s.id ? meta.bg : "transparent",
                  color: activeTab === s.id ? meta.color : "var(--color-muted)",
                  border: `1px solid ${activeTab === s.id ? meta.color : "var(--color-border)"}`,
                  borderRadius: "8px",
                  padding: "6px 14px",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: activeTab === s.id ? "600" : "400",
                }}>
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
          {loading ? (
            <div style={{ color: "var(--color-muted)" }}>Loading...</div>
          ) : active ? (
            <>
              {/* Sprint header */}
              <div className="card" style={{ marginBottom: "20px", padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "18px", fontWeight: "700" }}>{active.name}</span>
                      <span style={{ fontSize: "11px", fontWeight: "600", background: STATUS_META[active.status]?.bg || "transparent", color: STATUS_META[active.status]?.color || "#7c7f8e", padding: "2px 8px", borderRadius: "999px" }}>
                        {STATUS_META[active.status]?.label || active.status}
                      </span>
                    </div>
                    {active.goal && <div style={{ fontSize: "13px", color: "var(--color-muted)" }}>Goal: {active.goal}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "13px", color: "var(--color-muted)" }}>
                      {format(new Date(active.startDate), "MMM d")} – {format(new Date(active.endDate), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>
                {/* Velocity bar */}
                {(() => {
                  const v = velocity(active);
                  return (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                        <span style={{ color: "var(--color-muted)" }}>Velocity</span>
                        <span style={{ fontWeight: "600" }}>{v.done}/{v.total} pts ({v.pct}%)</span>
                      </div>
                      <div style={{ height: "6px", background: "var(--color-border)", borderRadius: "999px" }}>
                        <div style={{ height: "6px", width: `${v.pct}%`, background: "#5c7cfa", borderRadius: "999px", transition: "width 0.3s" }} />
                      </div>
                    </div>
                  );
                })()}
                <div style={{ display: "flex", gap: "20px", marginTop: "14px" }}>
                  {active.members.map((m: any) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#5c7cfa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: "white" }}>
                        {m.user.name.split(" ").map((n: string) => n[0]).join("").slice(0,2)}
                      </div>
                      <span style={{ fontSize: "13px" }}>{m.user.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kanban by status */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                {["TODO", "IN_PROGRESS", "DONE", "BLOCKED"].map((col) => {
                  const colTasks = active.tasks.filter((t: any) => t.status === col);
                  const colMeta: Record<string, { color: string; label: string }> = {
                    TODO: { color: "#7c7f8e", label: "To Do" },
                    IN_PROGRESS: { color: "#60a5fa", label: "In Progress" },
                    DONE: { color: "#22c55e", label: "Done" },
                    BLOCKED: { color: "#f87171", label: "Blocked" },
                  };
                  return (
                    <div key={col}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: colMeta[col].color, display: "inline-block" }} />
                        <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--color-muted)" }}>{colMeta[col].label}</span>
                        <span style={{ fontSize: "11px", background: "var(--color-surface)", color: "var(--color-muted)", borderRadius: "999px", padding: "1px 6px" }}>{colTasks.length}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {colTasks.map((task: any) => (
                          <div key={task.id} className="card" style={{ padding: "10px 12px" }}>
                            <div style={{ fontSize: "13px", fontWeight: "500", marginBottom: "6px" }}>{task.title}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              {task.artifact && (
                                <span style={{ fontSize: "10px", background: `${task.artifact.color}22`, color: task.artifact.color, padding: "1px 6px", borderRadius: "999px" }}>
                                  {task.artifact.name}
                                </span>
                              )}
                              <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                              {task.storyPoints && <span style={{ fontSize: "10px", color: "var(--color-muted)" }}>{task.storyPoints}pt</span>}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--color-muted)", marginTop: "4px" }}>{task.assignee.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", color: "var(--color-muted)", padding: "60px" }}>
              No sprints yet. Ask Julylan to run the seed.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
