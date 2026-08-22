"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/tasks", label: "Tasks", icon: "◎" },
  { href: "/calendar", label: "Calendar", icon: "◷" },
  { href: "/notes", label: "Notes", icon: "▤" },
  { href: "/credentials", label: "Credentials", icon: "🔑" },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({ tasks: 0, projects: 0, events: 0, notes: 0 });

  useEffect(() => {
    if (!session) router.push("/login");
  }, [session, router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, [session]);

  if (!session) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{ width: "220px", background: "var(--color-surface)", borderRight: "1px solid var(--color-border)", padding: "20px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ fontSize: "16px", fontWeight: "700", padding: "8px 12px", marginBottom: "16px" }}>Ops Board</div>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "6px", color: "var(--color-muted)", fontSize: "14px", fontWeight: "500", transition: "all 0.1s" }}>
            <span>{n.icon}</span> {n.label}
          </Link>
        ))}
        <div style={{ marginTop: "auto", padding: "12px" }}>
          <div style={{ fontSize: "12px", color: "var(--color-muted)", marginBottom: "8px" }}>{session.user?.email}</div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-ghost" style={{ width: "100%", fontSize: "13px" }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "32px 40px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>
            Welcome back, {session.user?.name?.split(" ")[0]}
          </h1>
          <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>
            Here's what's happening across your projects.
          </p>
        </div>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "40px" }}>
          {[
            { label: "Open Tasks", value: stats.tasks, href: "/tasks", color: "#5c7cfa" },
            { label: "Projects", value: stats.projects, href: "/projects", color: "#22c55e" },
            { label: "Upcoming Events", value: stats.events, href: "/calendar", color: "#f59e0b" },
            { label: "Notes", value: stats.notes, href: "/notes", color: "#8b5cf6" },
          ].map((s) => (
            <Link key={s.label} href={s.href} className="card" style={{ display: "block", cursor: "pointer" }}>
              <div style={{ fontSize: "28px", fontWeight: "700", color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "13px", color: "var(--color-muted)", marginTop: "4px" }}>{s.label}</div>
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        <div className="card">
          <h2 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "16px" }}>Quick Actions</h2>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link href="/tasks?new=1" className="btn-primary">+ New Task</Link>
            <Link href="/calendar?new=1" className="btn-ghost">Schedule Event</Link>
            <Link href="/notes?new=1" className="btn-ghost">New Note</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
