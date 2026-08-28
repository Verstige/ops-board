"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { IconPlus, IconClose, IconEdit, IconCheck } from "@/components/Icons";

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
  notes: string | null;
  completedAt: string | null;
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

  // Per-task inline-edit state. Map<taskId, EditDraft>
  const [edits, setEdits] = useState<Record<string, {
    title: string; description: string; priority: string;
    dueDate: string; assigneeId: string; projectId: string;
    saving: boolean; error: string | null;
  }>>({});

  // Detail modal
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailNotes, setDetailNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

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

  function startEdit(task: Task) {
    setEdits((prev) => ({
      ...prev,
      [task.id]: {
        title: task.title,
        description: task.description ?? "",
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
        assigneeId: task.assignee.id,
        projectId: task.project.id,
        saving: false,
        error: null,
      },
    }));
  }

  function cancelEdit(taskId: string) {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  }

  function updateEdit(taskId: string, patch: Partial<NonNullable<typeof edits[string]>>) {
    setEdits((prev) => ({ ...prev, [taskId]: { ...prev[taskId], ...patch, error: null } }));
  }

  async function saveEdit(taskId: string) {
    const draft = edits[taskId];
    if (!draft) return;
    if (!draft.title.trim()) {
      updateEdit(taskId, { error: "Title is required" });
      return;
    }
    updateEdit(taskId, { saving: true });
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        priority: draft.priority,
        dueDate: draft.dueDate || null,
        assigneeId: draft.assigneeId,
      }),
    });
    if (!res.ok) {
      updateEdit(taskId, { saving: false, error: `Save failed (HTTP ${res.status})` });
      return;
    }
    // Optimistic local update from the server response
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, ...updated } : t));
    cancelEdit(taskId);
    // Re-fetch to pick up the project color / assignee ref if project changed
    load();
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  function openDetail(task: Task) {
    setDetailTask(task);
    setDetailNotes(task.notes ?? "");
    setNotesSaved(false);
  }

  async function saveDetailNotes() {
    if (!detailTask) return;
    setSavingNotes(true);
    await fetch(`/api/tasks/${detailTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: detailNotes }),
    });
    setSavingNotes(false);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
    setTasks((prev) => prev.map((t) => t.id === detailTask.id ? { ...t, notes: detailNotes } : t));
    setDetailTask({ ...detailTask, notes: detailNotes });
  }

  async function moveFromDetail(newStatus: string) {
    if (!detailTask) return;
    await moveTask(detailTask, newStatus);
    setDetailTask(null);
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
                {colTasks.map((task) => {
                  const edit = edits[task.id];
                  const isEditing = !!edit;
                  return (
                    <div
                      key={task.id}
                      className="card glass-fade"
                      onClick={() => openDetail(task)}
                      style={{
                        padding: 14,
                        borderLeft: `3px solid ${task.project.color}`,
                        animationDelay: "0ms",
                        cursor: "pointer",
                      }}
                    >
                      {!isEditing ? (
                        // ─── View mode ──────────────────────────────────────────
                        <>
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
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                              {task.description}
                            </div>
                          )}
                          {task.dueDate && (
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
                              Due {new Date(task.dueDate).toLocaleDateString()}
                            </div>
                          )}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                            {task.status === "DONE" && task.notes && (
                            <div style={{
                              fontSize: 11, color: "#22c55e", marginBottom: 8,
                              fontStyle: "italic", lineHeight: 1.4,
                              borderLeft: "2px solid #22c55e40", paddingLeft: 8,
                            }}>
                              {task.notes.length > 80 ? task.notes.slice(0, 80) + "…" : task.notes}
                            </div>
                          )}
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
                                onClick={() => startEdit(task)}
                                title="Edit task"
                                className="btn-icon"
                                style={{ width: 24, height: 24, borderRadius: 7 }}
                                aria-label="Edit"
                              >
                                <IconEdit size={12} />
                              </button>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="btn-icon"
                                style={{ width: 24, height: 24, borderRadius: 7, color: "var(--status-blocked-fg)" }}
                                aria-label="Delete"
                                title="Delete task"
                              >
                                <IconClose size={11} />
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        // ─── Edit mode ──────────────────────────────────────────
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {edit.error && (
                            <div style={{
                              padding: "6px 10px", borderRadius: 8,
                              background: "color-mix(in srgb, var(--status-blocked-fg) 14%, transparent)",
                              border: "1px solid color-mix(in srgb, var(--status-blocked-fg) 30%, transparent)",
                              color: "var(--status-blocked-fg)", fontSize: 11, fontWeight: 600,
                            }}>
                              ⚠ {edit.error}
                            </div>
                          )}
                          <input
                            value={edit.title}
                            onChange={(e) => updateEdit(task.id, { title: e.target.value })}
                            placeholder="Title"
                            disabled={edit.saving}
                            autoFocus
                            style={{ fontSize: 14, fontWeight: 600, padding: "6px 10px" }}
                          />
                          <textarea
                            value={edit.description}
                            onChange={(e) => updateEdit(task.id, { description: e.target.value })}
                            placeholder="Description (optional)"
                            disabled={edit.saving}
                            rows={2}
                            style={{ fontSize: 12, padding: "6px 10px", resize: "vertical" }}
                          />
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                            <select
                              value={edit.priority}
                              onChange={(e) => updateEdit(task.id, { priority: e.target.value })}
                              disabled={edit.saving}
                              style={{ fontSize: 11, padding: "5px 8px" }}
                              title="Priority"
                            >
                              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <input
                              type="date"
                              value={edit.dueDate}
                              onChange={(e) => updateEdit(task.id, { dueDate: e.target.value })}
                              disabled={edit.saving}
                              style={{ fontSize: 11, padding: "5px 8px" }}
                              title="Due date"
                            />
                          </div>
                          <select
                            value={edit.assigneeId}
                            onChange={(e) => updateEdit(task.id, { assigneeId: e.target.value })}
                            disabled={edit.saving}
                            style={{ fontSize: 11, padding: "5px 8px" }}
                            title="Assignee"
                          >
                            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 2 }}>
                            <button
                              onClick={() => cancelEdit(task.id)}
                              disabled={edit.saving}
                              className="btn-ghost"
                              style={{ fontSize: 11, padding: "6px 10px" }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEdit(task.id)}
                              disabled={edit.saving}
                              className="btn-primary"
                              style={{ fontSize: 11, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 4 }}
                            >
                              <IconCheck size={12} />
                              {edit.saving ? "Saving…" : "Save"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Detail Modal ── */}
      {detailTask && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 300 }}
            onClick={() => setDetailTask(null)}
          />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            width: "100%", maxWidth: 580, maxHeight: "88vh",
            background: "var(--glass-bg)", border: "1px solid var(--line)",
            borderRadius: 16, zIndex: 301,
            overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
            backdropFilter: "blur(20px)",
          }}>
            {/* Modal header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <span className={`badge badge-${detailTask.priority}`}>{detailTask.priority}</span>
                  <span style={{ fontSize: 11, color: detailTask.project.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{detailTask.project.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{detailTask.assignee.name}</span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3, letterSpacing: "-0.02em" }}>{detailTask.title}</h2>
              </div>
              <button onClick={() => setDetailTask(null)} className="btn-icon" aria-label="Close" style={{ width: 32, height: 32, borderRadius: 8 }}>
                <IconClose size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
              {detailTask.description && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", marginBottom: 6 }}>Description</div>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>{detailTask.description}</p>
                </div>
              )}

              {detailTask.dueDate && (
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  <strong>Due:</strong> {new Date(detailTask.dueDate).toLocaleDateString()}
                </div>
              )}

              {/* Status buttons */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", marginBottom: 8 }}>Status</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {COLUMNS.map((col) => {
                    const colColors: Record<string, string> = { TODO: "#7c7f8e", IN_PROGRESS: "#3b82f6", DONE: "#22c55e", BLOCKED: "#ef4444" };
                    const colColor = colColors[col.key];
                    const active = detailTask.status === col.key;
                    return (
                      <button
                        key={col.key}
                        onClick={() => moveFromDetail(col.key)}
                        style={{
                          padding: "6px 14px", borderRadius: 8,
                          border: `1px solid ${active ? colColor : "var(--line)"}`,
                          background: active ? `${colColor}20` : "transparent",
                          color: active ? colColor : "var(--text-muted)",
                          cursor: "pointer", fontSize: 12, fontWeight: active ? 600 : 400,
                          transition: "all 0.15s",
                        }}
                      >
                        {col.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Completion Notes */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
                    {detailTask.status === "DONE" ? "✓ Completion Notes" : "Notes / Plan"}
                  </div>
                  {notesSaved && <span style={{ fontSize: 11, color: "#22c55e" }}>✓ Saved</span>}
                </div>
                <textarea
                  value={detailNotes}
                  onChange={(e) => { setDetailNotes(e.target.value); setNotesSaved(false); }}
                  placeholder={detailTask.status === "DONE" ? "What was completed? Add outcomes, links, results…" : "Notes, context, or plan for this task…"}
                  style={{
                    width: "100%", minHeight: 120,
                    background: "var(--color-bg)", border: "1px solid var(--line)",
                    borderRadius: 10, padding: "10px 12px",
                    fontSize: 13, lineHeight: 1.6, color: "var(--text-primary)",
                    resize: "vertical", fontFamily: "inherit",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button
                    onClick={saveDetailNotes}
                    disabled={savingNotes || detailNotes === detailTask.notes}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 16px",
                      background: savingNotes || detailNotes === detailTask.notes ? "var(--glass-bg)" : "var(--brand-600)",
                      color: savingNotes || detailNotes === detailTask.notes ? "var(--text-muted)" : "#fff",
                      border: "none", borderRadius: 8, cursor: "pointer",
                      fontSize: 13, fontWeight: 600, opacity: savingNotes || detailNotes === detailTask.notes ? 0.5 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    {savingNotes ? "Saving…" : "Save Notes"}
                  </button>
                </div>
              </div>

              {detailTask.completedAt && (
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Completed {new Date(detailTask.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

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