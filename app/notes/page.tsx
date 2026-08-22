"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

export default function NotesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notes, setNotes] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filterProject, setFilterProject] = useState("");
  const [form, setForm] = useState({ title: "", content: "", isShared: false, projectId: "" });

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  const load = useCallback(async () => {
    const qs = filterProject ? `?projectId=${filterProject}` : "";
    const [n, p] = await Promise.all([
      fetch("/api/notes" + qs).then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]);
    setNotes(n); setProjects(p);
  }, [filterProject]);
  useEffect(() => { if (status === "authenticated") load(); }, [status, load]);

  async function createNote(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setLoading(false); setShowNew(false);
    setForm({ title: "", content: "", isShared: false, projectId: "" });
    load();
  }

  if (status === "loading") return null;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: "220px", background: "var(--color-surface)", borderRight: "1px solid var(--color-border)", padding: "20px 12px" }}>
        <div style={{ fontSize: "16px", fontWeight: "700", padding: "8px 12px", marginBottom: "16px" }}>Ops Board</div>
        {[{ href: "/dashboard", label: "Dashboard", icon: "⌂" }, { href: "/tasks", label: "Tasks", icon: "◎" }, { href: "/calendar", label: "Calendar", icon: "◷" }, { href: "/notes", label: "Notes", icon: "▤" }, { href: "/credentials", label: "Credentials", icon: "🔑" }].map((n) => (
          <a key={n.href} href={n.href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "6px", color: n.href === "/notes" ? "var(--color-text)" : "var(--color-muted)", fontSize: "14px", fontWeight: n.href === "/notes" ? "600" : "400", background: n.href === "/notes" ? "rgba(92,124,250,0.1)" : "transparent" }}><span>{n.icon}</span> {n.label}</a>
        ))}
      </aside>
      <main style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Notes list */}
        <div style={{ width: "300px", borderRight: "1px solid var(--color-border)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "10px" }}>
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} style={{ width: "auto", fontSize: "13px" }}><option value="">All Projects</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <button onClick={() => setShowNew(true)} className="btn-primary" style={{ marginLeft: "auto", padding: "6px 12px" }}>+ New</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {notes.map((note) => (
              <div key={note.id} onClick={() => setSelected(note)} style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", cursor: "pointer", background: selected?.id === note.id ? "rgba(92,124,250,0.08)" : "transparent" }}>
                <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "4px" }}>{note.title}</div>
                <div style={{ fontSize: "11px", color: "var(--color-muted)" }}>{note.author.name} · {note.isShared ? "Shared" : "Private"}</div>
              </div>
            ))}
            {notes.length === 0 && <div style={{ padding: "24px", textAlign: "center", color: "var(--color-muted)", fontSize: "13px" }}>No notes yet</div>}
          </div>
        </div>
        {/* Note detail */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {selected ? (
            <>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--color-border)" }}>
                <div style={{ fontSize: "18px", fontWeight: "700", marginBottom: "4px" }}>{selected.title}</div>
                <div style={{ fontSize: "12px", color: "var(--color-muted)" }}>{selected.author.name} · {selected.project?.name || "No project"} · {selected.isShared ? "Shared" : "Private"}</div>
              </div>
              <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
                <pre style={{ fontSize: "14px", lineHeight: "1.7", whiteSpace: "pre-wrap", fontFamily: "inherit", color: "var(--color-text)" }}>{selected.content || "No content"}</pre>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-muted)", fontSize: "14px" }}>Select a note to view</div>
          )}
        </div>
      </main>
      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "480px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}><h2 style={{ fontSize: "16px", fontWeight: "700" }}>New Note</h2><button onClick={() => setShowNew(false)} style={{ background: "none", border: "none", color: "var(--color-muted)", cursor: "pointer", fontSize: "18px" }}>✕</button></div>
            <form onSubmit={createNote} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Note title" required autoFocus />
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write your note..." rows={8} style={{ resize: "vertical" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div><label style={{ fontSize: "12px", color: "var(--color-muted)", display: "block", marginBottom: "4px" }}>Project</label><select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} style={{ width: "auto" }}><option value="">No project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "22px" }}><input type="checkbox" checked={form.isShared} onChange={(e) => setForm({ ...form, isShared: e.target.checked })} style={{ width: "auto" }} /><span style={{ fontSize: "13px", color: "var(--color-muted)" }}>Shared with project</span></div>
              </div>
              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "8px" }}>{loading ? "Creating..." : "Create Note"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
