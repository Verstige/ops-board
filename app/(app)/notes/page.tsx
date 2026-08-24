"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { IconPlus, IconClose } from "@/components/Icons";

export default function NotesPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [notes, setNotes] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filterProject, setFilterProject] = useState("");
  const [form, setForm] = useState({ title: "", content: "", isShared: false, projectId: "" });

  const load = useCallback(async () => {
    const qs = filterProject ? `?projectId=${filterProject}` : "";
    const [n, p] = await Promise.all([
      fetch("/api/notes" + qs).then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]);
    setNotes(n); setProjects(p);
  }, [filterProject]);
  useEffect(() => { load(); }, [load]);

  async function createNote(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setLoading(false); setShowNew(false);
    setForm({ title: "", content: "", isShared: false, projectId: "" });
    load();
  }

  async function deleteNote(id: string) {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    // Optimistic update — drop from list immediately
    const previous = notes;
    const previousSelected = selected;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selected?.id === id) setSelected(null);
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
    } catch (err) {
      // Roll back on failure
      setNotes(previous);
      setSelected(previousSelected);
      alert("Failed to delete note. Please try again.");
    }
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
            .06 — Notes
          </div>
          <h1 className="section-title">Vault</h1>
          <p className="section-subtitle">Quick thoughts, meeting notes, decisions.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <IconPlus size={16} /> New Note
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 320px) 1fr", minHeight: 520 }}>
          {/* List */}
          <div style={{ borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: 14, borderBottom: "1px solid var(--line)" }}>
              <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} style={{ fontSize: 13 }}>
                <option value="">All projects</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {notes.map((note) => {
                const canDelete = currentUserId && note.author?.id === currentUserId;
                return (
                  <div
                    key={note.id}
                    onClick={() => setSelected(note)}
                    style={{
                      display: "flex", alignItems: "center",
                      padding: "0 8px 0 0",
                      borderBottom: "1px solid var(--line)",
                      background: selected?.id === note.id ? "color-mix(in srgb, var(--brand-500) 10%, transparent)" : "transparent",
                      borderLeft: selected?.id === note.id ? "3px solid var(--brand-500)" : "3px solid transparent",
                      cursor: "pointer",
                      color: "var(--text-primary)",
                    }}
                  >
                    <button
                      onClick={() => setSelected(note)}
                      style={{
                        flex: 1, textAlign: "left",
                        padding: "14px 12px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-primary)",
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {note.author.name} · {note.isShared ? "Shared" : "Private"}
                      </div>
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                        aria-label="Delete note"
                        title="Delete"
                        className="btn-icon"
                        style={{ width: 28, height: 28, borderRadius: 8, marginRight: 6, color: "var(--status-blocked-fg)", flexShrink: 0 }}
                      >
                        <IconClose size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
              {notes.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No notes yet</div>
              )}
            </div>
          </div>

          {/* Detail */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {selected ? (
              <>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: 6 }}>
                      {selected.title}
                    </h2>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {selected.author.name} · {selected.project?.name || "No project"} · {selected.isShared ? "Shared" : "Private"}
                    </div>
                  </div>
                  {currentUserId && selected.author?.id === currentUserId && (
                    <button
                      type="button"
                      onClick={() => deleteNote(selected.id)}
                      className="btn-ghost"
                      style={{ fontSize: 12, color: "var(--status-blocked-fg)", flexShrink: 0 }}
                    >
                      Delete
                    </button>
                  )}
                </div>
                <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
                  <pre style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit", color: "var(--text-primary)", margin: 0 }}>
                    {selected.content || "No content"}
                  </pre>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>
                Select a note to view
              </div>
            )}
          </div>
        </div>
      </div>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="card glass-strong modal-panel glass-fade" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>New note</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Capture a thought</h2>
              </div>
              <button onClick={() => setShowNew(false)} className="btn-icon" aria-label="Close"><IconClose size={16} /></button>
            </div>
            <form onSubmit={createNote} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Note title" required autoFocus />
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write your note…" rows={8} style={{ resize: "vertical" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "flex-end" }}>
                <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                  <option value="">No project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                  <input type="checkbox" checked={form.isShared} onChange={(e) => setForm({ ...form, isShared: e.target.checked })} style={{ width: "auto" }} />
                  Shared with project
                </label>
              </div>
              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 6 }}>{loading ? "Creating…" : "Create note"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}