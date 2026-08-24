"use client";

import { useEffect, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay } from "date-fns";
import { IconPlus, IconClose } from "@/components/Icons";

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newForm, setNewForm] = useState({ title: "", description: "", start: "", end: "", allDay: false, location: "", meetingUrl: "", projectId: "" });

  const load = useCallback(async () => {
    const m = format(currentMonth, "yyyy-MM");
    const [ev, pr] = await Promise.all([
      fetch(`/api/calendar?month=${m}`).then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]);
    setEvents(ev);
    setProjects(pr);
  }, [currentMonth]);
  useEffect(() => { load(); }, [load]);

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

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
            .03 — Calendar
          </div>
          <h1 className="section-title">{format(currentMonth, "MMMM yyyy")}</h1>
          <p className="section-subtitle">Schedule events, meetings, and milestones.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="btn-icon" aria-label="Previous month">‹</button>
          <button onClick={() => setCurrentMonth(new Date())} className="btn-ghost" style={{ fontSize: 13 }}>Today</button>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="btn-icon" aria-label="Next month">›</button>
          <button onClick={() => setShowNew(true)} className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
            <IconPlus size={16} /> New Event
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 10 }}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", padding: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {Array(startPad).fill(null).map((_, i) => <div key={"pad"+i} />)}
          {days.map((day) => {
            const dayEvents = events.filter((e) => isSameDay(new Date(e.start), day));
            const isCurrent = isToday(day);
            return (
              <div
                key={day.toISOString()}
                style={{
                  minHeight: 96,
                  background: isCurrent ? "color-mix(in srgb, var(--brand-500) 10%, transparent)" : "var(--glass-bg)",
                  border: `1px solid ${isCurrent ? "color-mix(in srgb, var(--brand-500) 35%, transparent)" : "var(--line)"}`,
                  borderRadius: 12,
                  padding: 8,
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? "var(--brand-600)" : "var(--text-primary)", marginBottom: 6 }}>{format(day, "d")}</div>
                {dayEvents.slice(0, 2).map((ev) => (
                  <div
                    key={ev.id}
                    title={ev.title}
                    style={{
                      fontSize: 11,
                      background: ev.project?.color ? `color-mix(in srgb, ${ev.project.color} 18%, transparent)` : "color-mix(in srgb, var(--brand-500) 14%, transparent)",
                      color: ev.project?.color || "var(--brand-600)",
                      borderRadius: 6,
                      padding: "3px 6px",
                      marginBottom: 3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: 600,
                    }}
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>+{dayEvents.length - 2} more</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="card glass-strong modal-panel glass-fade" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>New event</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Create event</h2>
              </div>
              <button onClick={() => setShowNew(false)} className="btn-icon" aria-label="Close"><IconClose size={16} /></button>
            </div>
            <form onSubmit={createEvent} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input value={newForm.title} onChange={(e) => setNewForm({ ...newForm, title: e.target.value })} placeholder="Event title" required autoFocus />
              <textarea value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} placeholder="Description (optional)" rows={2} style={{ resize: "vertical" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, display: "block", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Start *</label>
                  <input type="datetime-local" value={newForm.start} onChange={(e) => setNewForm({ ...newForm, start: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, display: "block", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>End</label>
                  <input type="datetime-local" value={newForm.end} onChange={(e) => setNewForm({ ...newForm, end: e.target.value })} />
                </div>
              </div>
              <input value={newForm.meetingUrl} onChange={(e) => setNewForm({ ...newForm, meetingUrl: e.target.value })} placeholder="Meeting URL (optional)" />
              <select value={newForm.projectId} onChange={(e) => setNewForm({ ...newForm, projectId: e.target.value })}>
                <option value="">No project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 6 }}>{loading ? "Creating…" : "Create event"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}