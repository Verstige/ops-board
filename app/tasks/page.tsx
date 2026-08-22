"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

const COLUMNS = [
  { key: "TODO", label: "To Do", color: "#7c7f8e" },
  { key: "IN_PROGRESS", label: "In Progress", color: "#3b82f6" },
  { key: "DONE", label: "Done", color: "#22c55e" },
  { key: "BLOCKED", label: "Blocked", color: "#ef4444" },
];

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#9ca3af",
  MEDIUM: "#93c5fd",
  HIGH: "#fbbf24",
  URGENT: "#fca5a5",
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee: { id: string; name: string };
  project: { id: string; name: string; color: string };
};

type Project = { id: string; name: string; color: string };

export default function TasksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [filterProject, setFilterProject] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newDue, setNewDue] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

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
    setLoading(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, description: newDesc, projectId: newProject, assigneeId: newAssignee, priority: newPriority, dueDate: newDue || null }),
    });
    setLoading(false);
    setShowNew(false);
    setNewTitle(""); setNewDesc(""); setNewProject(""); setNewAssignee(""); setNewDue("");
    load();
  }

  async function moveTask(task: Task, newStatus: string) {
    // Optimistic update
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

  if (status === "loading") return null;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <aside style={{ width: "220px", background: "var(--color-surface)", borderRight: "1px solid var(--color-border)", padding: "20px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ fontSize: "16px", fontWeight: "700", padding: "8px 12px", marginBottom: "16px" }}>Ops Board</div>
        {[
          { href: "/dashboard", label: "Dashboard", icon: "⌂" },
          { href: "/tasks", label: "Tasks", icon: "◎" },
          { href: "/calendar", label: "Calendar", icon: "◷" },
          { href: "/notes", label: "Notes", icon: "▤" },
          { href: "/credentials", label: "Credentials", icon: "🔑" },
          { href: "/github", label: "GitHub", icon: "⌥" },
        ].map((n) => (
          <a key={n.href} href={n.href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "6px", color: n.href === "/tasks" ? "var(--color-text)" : "var(--color-muted)", fontSize: "14px", fontWeight: n.href === "/tasks" ? "600" : "400", background: n.href === "/tasks" ? "rgba(92,124,250,0.1)" : "transparent" }}>
            <span>{n.icon}</span> {n.label}
          </a>
        ))}
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <h1 style={{ fontSize: "18px", fontWeight: "700" }}>Tasks</h1>
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} style={{ width: "auto", maxWidth: "200px", fontSize: "13px" }}>
            <option value="">All Projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
            <button onClick={() => setShowNew(true)} className="btn-primary">+ New Task</button>
          </div>
        </div>

        {/* Kanban board */}
        <div style={{ flex: 1, display: "flex", gap: "16px", padding: "20px 28px", overflowX: "auto" }}>
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} style={{ minWidth: "280px", flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span className={`status-dot dot-${col.key}`} style={{ background: col.color }}></span>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--color-muted)" }}>{col.label}</span>
                  <span style={{ fontSize: "12px", background: "var(--color-surface)", color: "var(--color-muted)", borderRadius: "999px", padding: "1px 7px" }}>{colTasks.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {colTasks.map((task) => (
                    <div key={task.id} className="card" style={{ cursor: "pointer", borderLeft: `3px solid ${task.project.color}`, padding: "12px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                        <span className={`badge badge-${task.priority}`} style={{ fontSize: "10px", background: `${PRIORITY_COLORS[task.priority]}22`, color: PRIORITY_COLORS[task.priority] }}>{task.priority}</span>
                        <span style={{ fontSize: "11px", color: task.project.color, fontWeight: "600" }}>{task.project.name}</span>
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "6px", lineHeight: "1.4" }}>{task.title}</div>
                      {task.description && <div style={{ fontSize: "12px", color: "var(--color-muted)", marginBottom: "8px", lineHeight: "1.5" }}>{task.description}</div>}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "11px", color: "var(--color-muted)" }}>{task.assignee.name}</span>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {COLUMNS.filter((c) => c.key !== task.status).map((c) => (
                            <button key={c.key} onClick={() => moveTask(task, c.key)} title={`Move to ${c.label}`} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "var(--color-muted)", padding: "2px 4px", borderRadius: "4px" }}>{c.label.split(" ")[0]}</button>
                          ))}
                          <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "#ef4444", padding: "2px 4px" }}>✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* New task modal */}
      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "700" }}>New Task</h2>
              <button onClick={() => setShowNew(false)} style={{ background: "none", border: "none", color: "var(--color-muted)", cursor: "pointer", fontSize: "18px" }}>✕</button>
            </div>
            <form onSubmit={createTask} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "500", marginBottom: "6px", display: "block", color: "var(--color-muted)" }}>Title *</label>
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Task title" required autoFocus />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "500", marginBottom: "6px", display: "block", color: "var(--color-muted)" }}>Description</label>
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional description..." rows={3} style={{ resize: "vertical" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "500", marginBottom: "6px", display: "block", color: "var(--color-muted)" }}>Project *</label>
                  <select value={newProject} onChange={(e) => setNewProject(e.target.value)} required>
                    <option value="">Select project</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "500", marginBottom: "6px", display: "block", color: "var(--color-muted)" }}>Assignee *</label>
                  <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} required>
                    <option value="">Select user</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "500", marginBottom: "6px", display: "block", color: "var(--color-muted)" }}>Priority</label>
                  <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} style={{ width: "auto" }}>
                    {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "500", marginBottom: "6px", display: "block", color: "var(--color-muted)" }}>Due date</label>
                  <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "8px" }}>
                {loading ? "Creating..." : "Create Task"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
