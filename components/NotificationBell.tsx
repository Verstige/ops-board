"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { IconClose } from "./Icons";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  entityId: string | null;
  actorName: string | null;
  read: boolean;
  createdAt: string;
};

const TYPE_META: Record<string, { label: string; color: string }> = {
  "task.created":             { label: "New task",        color: "var(--brand-500)" },
  "task.status_changed":      { label: "Task update",     color: "var(--status-progress-fg)" },
  "calendar.created":         { label: "New event",       color: "#a78bfa" },
  "note.created":             { label: "Note shared",     color: "var(--priority-high)" },
  "credential.created":       { label: "New credential",  color: "var(--status-blocked-fg)" },
  "milestone.status_changed": { label: "Milestone",       color: "var(--status-done-fg)" },
  "investor_update.created":  { label: "Investor update", color: "#f472b6" },
  "sprint.created":           { label: "New sprint",      color: "var(--brand-500)" },
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { headers: { Accept: "application/json" } });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(t);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleOpen() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unread > 0) {
      // Mark all read on open
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
      }).catch(() => {});
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  async function handleClickItem(n: Notification) {
    setOpen(false);
    router.push(n.link);
  }

  async function handleRefresh() {
    setLoading(true);
    await fetchNotifications();
    setLoading(false);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className="btn-icon"
        style={{ position: "relative", width: 38, height: 38 }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span
            aria-label={`${unread} unread`}
            style={{
              position: "absolute",
              top: 4, right: 4,
              minWidth: 18, height: 18,
              borderRadius: 999,
              background: "var(--status-blocked-fg)",
              color: "white",
              fontSize: 10, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 5px",
              border: "2px solid var(--bg-base)",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="glass-fade"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 360,
            maxHeight: 480,
            zIndex: 50,
            background: "var(--glass-bg-strong)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid var(--glass-border)",
            borderRadius: 18,
            boxShadow: "var(--glass-shadow-lg)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", borderBottom: "1px solid var(--line)",
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>Notifications</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginTop: 2 }}>
                {items.length === 0 ? "Nothing yet" : `${items.length} recent`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={handleRefresh}
                aria-label="Refresh"
                className="btn-icon"
                style={{ width: 28, height: 28, borderRadius: 8 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: loading ? "spin 1s linear infinite" : "none" }}>
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="btn-icon"
                style={{ width: 28, height: 28, borderRadius: 8 }}
              >
                <IconClose size={14} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
            {items.length === 0 ? (
              <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                No notifications yet.
                <div style={{ marginTop: 4, fontSize: 11, opacity: 0.7 }}>
                  You'll see updates when Chrissy creates tasks, events, milestones, or investor updates.
                </div>
              </div>
            ) : (
              items.map((n) => {
                const meta = TYPE_META[n.type] || { label: n.type, color: "var(--brand-500)" };
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClickItem(n)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 12px",
                      background: n.read ? "transparent" : "color-mix(in srgb, var(--brand-500) 6%, transparent)",
                      border: "none",
                      borderRadius: 12,
                      cursor: "pointer",
                      color: "var(--text-primary)",
                      marginBottom: 4,
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span
                        style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: meta.color,
                          marginTop: 8, flexShrink: 0,
                          boxShadow: n.read ? "none" : `0 0 0 4px color-mix(in srgb, ${meta.color} 24%, transparent)`,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2, lineHeight: 1.3 }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {n.body}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                            color: meta.color,
                            background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                            padding: "2px 7px", borderRadius: 999,
                          }}>
                            {meta.label}
                          </span>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>
                            {n.actorName ? `${n.actorName} · ` : ""}{timeAgo(n.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}