"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IconPlus, IconCalendar, IconNotes, IconTasks, IconInvestors } from "@/components/Icons";

const QUICK_ACTIONS = [
  { label: "New Task", href: "/tasks", icon: <IconTasks size={16} /> },
  { label: "Schedule Event", href: "/calendar", icon: <IconCalendar size={16} /> },
  { label: "New Note", href: "/notes", icon: <IconNotes size={16} /> },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({ tasks: 0, projects: 0, events: 0, notes: 0 });

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="glass-fade" style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* Hero greeting */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <h1 className="section-title">
          {greeting}, {session?.user?.name?.split(" ")[0] || "there"}
        </h1>
        <p className="section-subtitle">Here's what's happening across Open Local.</p>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <StatCard label="Open Tasks" value={stats.tasks} href="/tasks" delay={0} />
        <StatCard label="Active Projects" value={stats.projects} href="/dashboard" delay={60} />
        <StatCard label="Upcoming Events" value={stats.events} href="/calendar" delay={120} />
        <StatCard label="Notes" value={stats.notes} href="/notes" delay={180} />
      </div>

      {/* Quick actions */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
              .02 — Quick actions
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
              What do you want to do?
            </h2>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.label} href={a.href} className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              {a.icon} {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Status pills row */}
      <div className="card" style={{ background: "color-mix(in srgb, var(--brand-500) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--brand-500) 18%, transparent)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--brand-500)", boxShadow: "0 0 0 4px color-mix(in srgb, var(--brand-500) 24%, transparent)" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>All systems operational</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Database synced · {stats.tasks} tasks tracked · {stats.notes} notes in the vault
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, href, delay }: { label: string; value: number; href: string; delay: number }) {
  return (
    <Link
      href={href}
      className="card stat-card"
      style={{
        display: "block",
        animationDelay: `${delay}ms`,
        textDecoration: "none",
      }}
    >
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </Link>
  );
}