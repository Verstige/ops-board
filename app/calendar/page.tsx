"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns";

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newForm, setNewForm] = useState({ title: "", description: "", start: "", end: "", allDay: false, location: "", meetingUrl: "", projectId: "" });

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  const load = useCallback(async () => {
    const m = format(currentMonth, "yyyy-MM");
    const [ev, pr] = await Promise.all([
      fetch(`/api/calendar?month=${m}`).then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]);
    setEvents(ev);
    setProjects(pr);
  }, [currentMonth]);
  useEffect(() => { if (status === "authenticated") load(); }, [status, load]);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newForm) });
    setLoading(false); setShowNew(false);
    setNewForm({ title: "", description: "", start: "", end: "", allDay: false, location: "", meetingUrl: "", projectId: "" });
    load();
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startPad = startOfMonth(currentMonth).getDay();

  if (status === "loading") return null;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: "220px", background: "var(--color-surface)", borderRight: "1px solid var(--color-border)", padding: "20px 12px" }}>
        <div style={{ fontSize: "16px", fontWeight: "700", padding: "8px 12px", marginBottom: "16px" }}>Ops Board</div>
        {[{ href: "/dashboard", label: "Dashboard", icon: "⌂" }, { href: "/tasks", label: "Tasks", icon: "◎" }, { href: "/calendar", label: "Calendar", icon: "◷" }, { href: "/notes", label: "Notes", icon: "▤" }, { href: "/credentials", label: "Credentials", icon: "🔑" }].map((n) => (
          <a key={n.href} href={n.href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "6px", color: n.href === "/calendar" ? "var(--color-text)" : "var(--color-muted)", fontSize: "14px", fontWeight: n.href === "/calendar" ? "600" : "400", background: n.href === "/calendar" ? "rgba(92,124,250,0.1)" : "transparent" }}><span>{n.icon}</span> {n.label}</a>
        ))}
      </aside>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "16px" }}>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="btn-ghost" style={{ padding: "6px 12px" }}>←</button>
          <h1 style={{ fontSize: "18px", fontWeight: "700", minWidth: "160px", textAlign: "center" }}>{format(currentMonth, "MMMM yyyy")}</h1>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="btn-ghost" style={{ padding: "6px 12px" }}>→</button>
          <div style={{ marginLeft: "auto" }}><button onClick={() => setShowNew(true)} className="btn-primary">+ New Event</button></div>
        </div>
        <div style={{ flex: 1, padding: "20px 28px", overflow: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "4px" }}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} style={{ textAlign: "center", fontSize: "12px", fontWeight: "600", color: "var(--color-muted)", padding: "6px" }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
            {Array(startPad).fill(null).map((_, i) => <div key={"pad"+i} />)}
            {days.map((day) => {
              const dayEvents = events.filter((e) => isSameDay(new Date(e.start), day));
              return (
                <div key={day.toISOString()} style={{ minHeight: "80px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "6px", padding: "6px", opacity: isToday(day) ? 1 : 0.8 }}>
                  <div style={{ fontSize: "12px", fontWeight: isToday(day) ? "700" : "400", color: isToday(day) ? "var(--color-brand)" : "var(--color-muted)", marginBottom: "4px" }}>{format(day, "d")}</div>
                  {dayEvents.slice(0, 2).map((ev) => (
                    <div key={ev.id} style={{ fontSize: "11px", background: ev.project?.color ? `${ev.project.color}33` : "rgba(92,124,250,0.2)", color: ev.project?.color || "var(--color-brand)", borderRadius: "3px", padding: "2px 4px", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }} title={ev.title}>{ev.title}</div>
                  ))}
                  {dayEvents.length > 2 && <div style={{ fontSize: "10px", color: "var(--color-muted)" }}>+{dayEvents.length - 2} more</div>}
                </div>
              );
            })}
          </div>
        </div>
      </main>
      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "480px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}><h2 style={{ fontSize: "16px", fontWeight: "700" }}>New Event</h2><button onClick={() => setShowNew(false)} style={{ background: "none", border: "none", color: "var(--color-muted)", cursor: "pointer", fontSize: "18px" }}>✕</button></div>
            <form onSubmit={createEvent} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input value={newForm.title} onChange={(e) => setNewForm({ ...newForm, title: e.target.value })} placeholder="Event title" required autoFocus />
              <textarea value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} placeholder="Description (optional)" rows={2} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div><label style={{ fontSize: "12px", color: "var(--color-muted)", display: "block", marginBottom: "4px" }}>Start *</label><input type="datetime-local" value={newForm.start} onChange={(e) => setNewForm({ ...newForm, start: e.target.value })} required /></div>
                <div><label style={{ fontSize: "12px", color: "var(--color-muted)", display: "block", marginBottom: "4px" }}>End</label><input type="datetime-local" value={newForm.end} onChange={(e) => setNewForm({ ...newForm, end: e.target.value })} /></div>
              </div>
              <div><label style={{ fontSize: "12px", color: "var(--color-muted)", display: "block", marginBottom: "4px" }}>Meeting URL</label><input value={newForm.meetingUrl} onChange={(e) => setNewForm({ ...newForm, meetingUrl: e.target.value })} placeholder="https://meet.google.com/..." /></div>
              <div><label style={{ fontSize: "12px", color: "var(--color-muted)", display: "block", marginBottom: "4px" }}>Project</label>
                <select value={newForm.projectId} onChange={(e) => setNewForm({ ...newForm, projectId: e.target.value })} style={{ width: "auto" }}><option value="">No project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              </div>
              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "8px" }}>{loading ? "Creating..." : "Create Event"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
