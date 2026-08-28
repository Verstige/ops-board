"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback, useRef } from "react";
import { IconPlus, IconClose, IconCheck } from "@/components/Icons";

type Entry = {
  id: string;
  title: string;
  description: string | null;
  minutes: number;
  status: string;
  taskId: string | null;
  createdAt: string;
};

type Log = {
  id: string;
  date: string;
  summary: string | null;
  tasksCompleted: number;
  totalMinutes: number;
  highlights: string | null;
  blockers: string | null;
  nextDayPlan: string | null;
  createdAt: string;
  updatedAt: string;
  entries: Entry[];
};

type WorkSession = {
  id: string;
  description: string | null;
  taskId: string | null;
  startedAt: string;
  isActive: boolean;
  minutes: number;
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatElapsed(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const m = Math.floor(ms / 60000);
  return formatDuration(m);
}

function formatDate(date: string): string {
  const d = new Date(date + "T00:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date === today.toISOString().slice(0, 10)) return "Today";
  if (date === yesterday.toISOString().slice(0, 10)) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function PerformancePage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<Log[]>([]);
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // New entry form
  const [showEntry, setShowEntry] = useState(false);
  const [entryTitle, setEntryTitle] = useState("");
  const [entryDesc, setEntryDesc] = useState("");
  const [entryMinutes, setEntryMinutes] = useState("");
  const [entryStatus, setEntryStatus] = useState("in_progress");
  const [addingEntry, setAddingEntry] = useState(false);

  // Log editing
  const [editHighlights, setEditHighlights] = useState("");
  const [editBlockers, setEditBlockers] = useState("");
  const [editNextPlan, setEditNextPlan] = useState("");
  const [editSummary, setEditSummary] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const todayLog = logs.find((l) => l.date === today);
  const recentLogs = logs.filter((l) => l.date !== today);

  // Reset elapsed when session changes or component re-mounts
  const load = useCallback(async () => {
    setElapsed(0);
    const [logRes, sessionRes] = await Promise.all([
      fetch("/api/performance").then((r) => r.json()),
      fetch("/api/performance/session").then((r) => r.json()),
    ]);
    setLogs(logRes.logs || []);
    setActiveSession(sessionRes);
    if (sessionRes) {
      setElapsed(sessionRes.isActive ? Date.now() - new Date(sessionRes.startedAt).getTime() : (sessionRes.minutes || 0) * 60000);
    }
    if (logRes.logs?.[0]) {
      const t = logRes.logs.find((l: Log) => l.date === today);
      if (t) {
        setEditHighlights(t.highlights || "");
        setEditBlockers(t.blockers || "");
        setEditNextPlan(t.nextDayPlan || "");
        setEditSummary(t.summary || "");
      }
    }
    setLoading(false);
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  // Live timer for active session
  useEffect(() => {
    if (activeSession?.isActive) {
      setElapsed(Date.now() - new Date(activeSession.startedAt).getTime());
      timerRef.current = setInterval(() => {
        setElapsed((e) => e + 1000);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession?.isActive, activeSession?.startedAt, activeSession?.id]);

  async function startSession() {
    const res = await fetch("/api/performance/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    const s = await res.json();
    setActiveSession(s);
  }

  async function endSession() {
    if (!activeSession) return;
    const res = await fetch("/api/performance/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end", id: activeSession.id }),
    });
    await res.json();
    setActiveSession(null);
    load();
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!entryTitle.trim()) return;
    setAddingEntry(true);
    await fetch("/api/performance/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: entryTitle,
        description: entryDesc || null,
        minutes: parseInt(entryMinutes) || 0,
        status: entryStatus,
      }),
    });
    setAddingEntry(false);
    setShowEntry(false);
    setEntryTitle("");
    setEntryDesc("");
    setEntryMinutes("");
    setEntryStatus("in_progress");
    load();
  }

  async function saveLog() {
    setSaving(true);
    await fetch("/api/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: today,
        highlights: editHighlights,
        blockers: editBlockers,
        nextDayPlan: editNextPlan,
        summary: editSummary,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this entry?")) return;
    await fetch(`/api/performance/entries?id=${id}`, { method: "DELETE" });
    load();
  }

  const elapsedStr = activeSession?.isActive
    ? formatDuration(Math.floor(elapsed / 60000))
    : activeSession
    ? formatDuration(activeSession.minutes || 0)
    : null;

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 0" }}>
        <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>.02 — Productivity</div>
        <h1 className="section-title" style={{ marginBottom: 32 }}>Performance</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card glass-fade" style={{ height: 80, animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
          .02 — Productivity
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 className="section-title">Performance</h1>
            <p className="section-subtitle">Track your work, log accomplishments, plan your next day.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {activeSession?.isActive ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--brand-600)" }}>
                  {formatDuration(Math.floor(elapsed / 60000))}
                </div>
                <button
                  onClick={endSession}
                  style={{
                    padding: "8px 18px", borderRadius: 8, border: "none",
                    background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Stop Session
                </button>
              </div>
            ) : (
              <button
                onClick={startSession}
                style={{
                  padding: "8px 18px", borderRadius: 8, border: "1px solid var(--brand-600)",
                  background: "transparent", color: "var(--brand-600)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                ▶ Start Work Session
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Today's log */}
        <div className="card glass-fade">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Today</div>
              <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>
                {todayLog ? `${todayLog.tasksCompleted} tasks · ${formatDuration(todayLog.totalMinutes)} tracked` : "No log yet"}
              </h2>
            </div>
            <button
              onClick={() => setShowEntry(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8,
                background: "var(--brand-600)", color: "#fff",
                border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              <IconPlus size={14} /> Add Entry
            </button>
          </div>

          {/* Entries */}
          {todayLog && todayLog.entries.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {todayLog.entries.map((entry) => (
                <div key={entry.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "var(--glass-bg)", borderRadius: 10, border: "1px solid var(--line)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: entry.status === "done" ? 13 : 13, fontWeight: 600, color: "var(--text-primary)", textDecoration: entry.status === "done" ? "line-through" : "none", opacity: entry.status === "done" ? 0.6 : 1 }}>
                        {entry.title}
                      </span>
                      {entry.status === "done" && <span style={{ fontSize: 10, background: "#22c55e22", color: "#22c55e", padding: "1px 6px", borderRadius: 999 }}>done</span>}
                      {entry.status === "blocked" && <span style={{ fontSize: 10, background: "#ef444422", color: "#ef4444", padding: "1px 6px", borderRadius: 999 }}>blocked</span>}
                    </div>
                    {entry.description && <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{entry.description}</p>}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-muted)" }}>
                      {entry.minutes > 0 && <span>{formatDuration(entry.minutes)}</span>}
                      <span>·</span>
                      <span>{new Date(entry.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  <button onClick={() => deleteEntry(entry.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}>
                    <IconClose size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {(!todayLog || todayLog.entries.length === 0) && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 13 }}>
              No entries yet. Click "Add Entry" to log what you're working on.
            </div>
          )}
        </div>

        {/* Daily Summary Editor */}
        <div className="card glass-fade">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Daily Summary</div>
              <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>End-of-day report</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {saved && <span style={{ fontSize: 12, color: "#22c55e" }}>✓ Saved</span>}
              <button
                onClick={saveLog}
                disabled={saving}
                style={{
                  padding: "7px 14px", borderRadius: 8, border: "none",
                  background: saving ? "var(--glass-bg)" : "var(--brand-600)",
                  color: saving ? "var(--text-muted)" : "#fff",
                  fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving…" : "Save Summary"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Highlights ✦</label>
              <textarea
                value={editHighlights}
                onChange={(e) => setEditHighlights(e.target.value)}
                placeholder="Key accomplishments today…"
                rows={3}
                style={{
                  width: "100%", background: "var(--color-bg)", border: "1px solid var(--line)",
                  borderRadius: 10, padding: "10px 12px", fontSize: 13, lineHeight: 1.6,
                  color: "var(--text-primary)", resize: "vertical", fontFamily: "inherit",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Blockers ⚠</label>
              <textarea
                value={editBlockers}
                onChange={(e) => setEditBlockers(e.target.value)}
                placeholder="What slowed you down today…"
                rows={2}
                style={{
                  width: "100%", background: "var(--color-bg)", border: "1px solid var(--line)",
                  borderRadius: 10, padding: "10px 12px", fontSize: 13, lineHeight: 1.6,
                  color: "var(--text-primary)", resize: "vertical", fontFamily: "inherit",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Next Day Plan →</label>
              <textarea
                value={editNextPlan}
                onChange={(e) => setEditNextPlan(e.target.value)}
                placeholder="What to focus on tomorrow…"
                rows={2}
                style={{
                  width: "100%", background: "var(--color-bg)", border: "1px solid var(--line)",
                  borderRadius: 10, padding: "10px 12px", fontSize: 13, lineHeight: 1.6,
                  color: "var(--text-primary)", resize: "vertical", fontFamily: "inherit",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Full Summary (auto-saved)</label>
              <textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                placeholder="Write a comprehensive summary of everything accomplished today…"
                rows={4}
                style={{
                  width: "100%", background: "var(--color-bg)", border: "1px solid var(--line)",
                  borderRadius: 10, padding: "10px 12px", fontSize: 13, lineHeight: 1.6,
                  color: "var(--text-primary)", resize: "vertical", fontFamily: "inherit",
                }}
              />
            </div>
          </div>
        </div>

        {/* Recent logs */}
        {recentLogs.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Recent Days</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {recentLogs.slice(0, 14).map((log) => (
                <details key={log.id} className="card glass-fade" style={{ padding: "14px 16px" }}>
                  <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 600, fontSize: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span>{formatDate(log.date)}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {log.tasksCompleted} tasks · {formatDuration(log.totalMinutes)}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>▶</span>
                  </summary>
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                    {log.entries.map((e) => (
                      <div key={e.id} style={{ fontSize: 13, color: "var(--text-primary)", display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ color: e.status === "done" ? "#22c55e" : e.status === "blocked" ? "#ef4444" : "var(--text-muted)", marginTop: 2 }}>
                          {e.status === "done" ? "✓" : e.status === "blocked" ? "✗" : "·"}
                        </span>
                        <span style={{ opacity: e.status === "done" ? 0.7 : 1 }}>{e.title}</span>
                        {e.minutes > 0 && <span style={{ color: "var(--text-muted)", fontSize: 11 }}>({formatDuration(e.minutes)})</span>}
                      </div>
                    ))}
                    {log.highlights && (
                      <div style={{ fontSize: 12, color: "#22c55e", fontStyle: "italic", borderLeft: "2px solid #22c55e40", paddingLeft: 10 }}>
                        ✦ {log.highlights}
                      </div>
                    )}
                    {log.blockers && (
                      <div style={{ fontSize: 12, color: "#ef4444", fontStyle: "italic", borderLeft: "2px solid #ef444440", paddingLeft: 10 }}>
                        ⚠ {log.blockers}
                      </div>
                    )}
                    {log.nextDayPlan && (
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic", borderLeft: "2px solid var(--line)", paddingLeft: 10 }}>
                        → {log.nextDayPlan}
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      {showEntry && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 300 }} onClick={() => setShowEntry(false)} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            width: "100%", maxWidth: 500, background: "var(--glass-bg)", border: "1px solid var(--line)",
            borderRadius: 16, zIndex: 301, overflowY: "auto", maxHeight: "88vh",
            backdropFilter: "blur(20px)", boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
          }}>
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Add Entry</h2>
              <button onClick={() => setShowEntry(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <IconClose size={16} />
              </button>
            </div>
            <form onSubmit={addEntry} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>What did you work on? *</label>
                <input
                  value={entryTitle}
                  onChange={(e) => setEntryTitle(e.target.value)}
                  placeholder="e.g. Completed task: Fix login bug"
                  required
                  autoFocus
                  style={{ width: "100%", background: "var(--color-bg)", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px", fontSize: 13, color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Details</label>
                <textarea
                  value={entryDesc}
                  onChange={(e) => setEntryDesc(e.target.value)}
                  placeholder="Optional notes…"
                  rows={2}
                  style={{ width: "100%", background: "var(--color-bg)", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px", fontSize: 13, color: "var(--text-primary)", resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Minutes</label>
                  <input
                    type="number"
                    value={entryMinutes}
                    onChange={(e) => setEntryMinutes(e.target.value)}
                    placeholder="30"
                    min="0"
                    style={{ width: "100%", background: "var(--color-bg)", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px", fontSize: 13, color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Status</label>
                  <select
                    value={entryStatus}
                    onChange={(e) => setEntryStatus(e.target.value)}
                    style={{ width: "100%", background: "var(--color-bg)", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px", fontSize: 13, color: "var(--text-primary)" }}
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done ✓</option>
                    <option value="blocked">Blocked ✗</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={addingEntry} style={{
                padding: "10px", borderRadius: 10, border: "none",
                background: addingEntry ? "var(--glass-bg)" : "var(--brand-600)",
                color: addingEntry ? "var(--text-muted)" : "#fff",
                fontSize: 14, fontWeight: 600, cursor: addingEntry ? "default" : "pointer", opacity: addingEntry ? 0.6 : 1,
              }}>
                {addingEntry ? "Adding…" : "Add Entry"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
