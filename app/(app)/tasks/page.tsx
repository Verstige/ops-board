"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { IconPlus, IconClose } from "@/components/Icons";

const COLUMNS = [
  { key: "TODO", label: "To Do" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "DONE", label: "Done" },
  { key: "BLOCKED", label: "Blocked" },
];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  githubIssueNumber: number | null;
  githubIssueUrl: string | null;
  assignee: { id: string; name: string };
  project: { id: string; name: string; color: string };
};

type Project = { id: string; name: string; color: string };
type User = { id: string; name: string };

export default function TasksPage() {
  const { status } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filterProject, setFilterProject] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newDue, setNewDue] = useState("");
  const [creating, setCreating] = useState(false);
  const [createWarning, setCreateWarning] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = filterProject ? `?projectId=${filterProject}` : "";
    const [t, p, u] = await Promise.all([
      fetch("/api/tasks" + qs).then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]);
    setTasks(t);
    setProjects(p);
    setUsers(u);
  }, [filterProject]);

  useEffect(() => { if (status === "authenticated") load(); }, [status, load]);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateWarning(null);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle, description: newDesc,
        projectId: newProject, assigneeId: newAssignee,
        priority: newPriority, dueDate: newDue || null,
      }),
    });
    const data = await res.json().catch(() => null);
    setCreating(false);
    if (data?._warning) setCreateWarning(data._warning);
    setShowNew(false);
    setNewTitle(""); setNewDesc(""); setNewProject(""); setNewAssignee(""); setNewDue("");
    load();
  }

  async function moveTask(task: Task, newStatus: string) {
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t));
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
            .02 — Tasks
          </div>
          <h1 className="section-title">Board</h1>
          <p className="section-subtitle">Drag tasks across columns or use the move buttons.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            style={{ width: "auto", minWidth: 180, fontSize: 13 }}
          >
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => setShowNew(true)} className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <IconPlus size={16} /> New Task
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
          overflowX: "auto",
          paddingBottom: 4,
        }}
        className="scroll-hide"
      >
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 4px 0" }}>
                <span className={`status-dot dot-${col.key}`} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{col.label}</span>
                <span style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  fontWeight: 700,
                  background: "var(--glass-bg)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--line)",
                  borderRadius: 999,
                  padding: "2px 8px",
                }}>{colTasks.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {colTasks.length === 0 && (
                  <div style={{
                    fontSize: 12, color: "var(--text-muted)",
                    padding: "20px 12px", textAlign: "center",
                    border: "1px dashed var(--line)",
                    borderRadius: 14,
                  }}>
                    No tasks
                  </div>
                )}
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className="card glass-fade"
                    style={{
                      padding: 14,
                      borderLeft: `3px solid ${task.project.color}`,
                      animationDelay: "0ms",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                      <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                      <span style={{ fontSize: 10, color: task.project.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {task.project.name}
                      </span>
                      {task.githubIssueNumber && task.githubIssueUrl && (
                        <a
                          href={task.githubIssueUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Open linked GitHub issue"
                          style={{
                            fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)",
                            background: "color-mix(in srgb, var(--brand-500) 14%, transparent)",
                            color: "var(--brand-600)",
                            padding: "2px 8px", borderRadius: 999,
                            textDecoration: "none",
                            border: "1px solid color-mix(in srgb, var(--brand-500) 30%, transparent)",
                          }}
                        >
                          ↗ #{task.githubIssueNumber}
                        </a>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: 6 }}>
                      {task.title}
                    </div>
                    {task.description && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
                        {task.description}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div
                          style={{
                            width: 22, height: 22, borderRadius: "50%",
                            background: "linear-gradient(135deg, var(--brand-300), var(--brand-600))",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "white", fontSize: 10, fontWeight: 700,
                          }}
                        >
                          {task.assignee.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{task.assignee.name.split(" ")[0]}</span>
                      </div>
                      <div style={{ display: "flex", gap: 2 }}>
                        {COLUMNS.filter((c) => c.key !== task.status).map((c) => (
                          <button
                            key={c.key}
                            onClick={() => moveTask(task, c.key)}
                            title={`Move to ${c.label}`}
                            className="btn-icon"
                            style={{ width: 24, height: 24, borderRadius: 7, fontSize: 10, padding: 0 }}
                          >
                            <span style={{ fontSize: 9, fontWeight: 700 }}>{c.label[0]}</span>
                          </button>
                        ))}
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="btn-icon"
                          style={{ width: 24, height: 24, borderRadius: 7, color: "var(--status-blocked-fg)" }}
                          aria-label="Delete"
                        >
                          <IconClose size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* New task modal */}
      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="card glass-strong modal-panel glass-fade" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                  New task
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
                  Create a task
                </h2>
              </div>
              <button onClick={() => setShowNew(false)} className="btn-icon" aria-label="Close">
                <IconClose size={16} />
              </button>
            </div>
            <form onSubmit={createTask} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {createWarning && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "color-mix(in srgb, #f97316 14%, transparent)",
                  border: "1px solid color-mix(in srgb, #f97316 30%, transparent)",
                  color: "#f97316", fontSize: 12, fontWeight: 600,
                }}>
                  ⚠ {createWarning}
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, display: "block", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Title *</label>
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Task title" required autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, display: "block", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Description</label>
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional…" rows={3} style={{ resize: "vertical" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, display: "block", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Project *</label>
                  <select value={newProject} onChange={(e) => setNewProject(e.target.value)} required>
                    <option value="">Select…</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {newProject === "open-local-issues" && (
                    <div style={{ fontSize: 11, color: "#f97316", marginTop: 6, lineHeight: 1.4 }}>
                      ⓘ This will also open a GitHub issue on mscartiles-lab/open-local using GITHUB_TOKEN.
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, display: "block", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Assignee *</label>
                  <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} required>
                    <option value="">Select…</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, display: "block", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Priority</label>
                  <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, display: "block", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Due date</label>
                  <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={creating} style={{ marginTop: 8, padding: "12px" }}>
                {creating ? (newProject === "open-local-issues" ? "Creating task + GitHub issue…" : "Creating…") : (newProject === "open-local-issues" ? "Create task + open issue →" : "Create task")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}