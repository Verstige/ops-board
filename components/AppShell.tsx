"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  IconDashboard, IconTasks, IconCalendar, IconNotes, IconCredentials,
  IconSprints, IconMilestones, IconGithub, IconInvestors, IconSun, IconMoon, IconBrandMark, IconLogout,
} from "./Icons";
import { useTheme } from "./ThemeProvider";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  /** Items shown in mobile bottom tab bar (subset of full nav) */
  mobile?: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <IconDashboard size={18} className="nav-icon" />, mobile: true },
  { href: "/tasks", label: "Tasks", icon: <IconTasks size={18} className="nav-icon" />, mobile: true },
  { href: "/calendar", label: "Calendar", icon: <IconCalendar size={18} className="nav-icon" />, mobile: true },
  { href: "/sprints", label: "Sprints", icon: <IconSprints size={18} className="nav-icon" /> },
  { href: "/milestones", label: "Milestones", icon: <IconMilestones size={18} className="nav-icon" /> },
  { href: "/notes", label: "Notes", icon: <IconNotes size={18} className="nav-icon" /> },
  { href: "/investors", label: "Investors", icon: <IconInvestors size={18} className="nav-icon" /> },
  { href: "/github", label: "GitHub", icon: <IconGithub size={18} className="nav-icon" /> },
  { href: "/credentials", label: "Credentials", icon: <IconCredentials size={18} className="nav-icon" /> },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      <button
        type="button"
        className={theme === "light" ? "active" : ""}
        onClick={() => setTheme("light")}
        aria-label="Light theme"
        title="Light"
      >
        <IconSun size={16} />
      </button>
      <button
        type="button"
        className={theme === "dark" ? "active" : ""}
        onClick={() => setTheme("dark")}
        aria-label="Dark theme"
        title="Dark"
      >
        <IconMoon size={16} />
      </button>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} className={`nav-link${active ? " active" : ""}`}>
      {item.icon}
      <span>{item.label}</span>
    </Link>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const { data: session } = useSession();
  const { theme } = useTheme();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const mobileNav = NAV.filter((n) => n.mobile);

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className="app-sidebar">
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 12px 20px" }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 11,
              background: "linear-gradient(135deg, var(--brand-400), var(--brand-700))",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", boxShadow: "0 4px 14px color-mix(in srgb, var(--brand-600) 40%, transparent)",
            }}
          >
            <IconBrandMark size={22} />
          </div>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>Ops Board</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Open Local</div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12, padding: "12px 4px 0" }}>
          <ThemeToggle />
          {session?.user && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px",
              borderRadius: 12,
              background: "var(--glass-bg)",
              border: "1px solid var(--line)",
            }}>
              <div
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--brand-300), var(--brand-600))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontSize: 12, fontWeight: 700,
                }}
              >
                {session.user.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {session.user.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {session.user.email}
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                aria-label="Sign out"
                title="Sign out"
                className="btn-icon"
                style={{ width: 30, height: 30, borderRadius: 10 }}
              >
                <IconLogout size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="app-main">
        {/* Mobile-only header (theme toggle visible on mobile lives here too) */}
        <header className="app-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 10,
                background: "linear-gradient(135deg, var(--brand-400), var(--brand-700))",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white",
              }}
            >
              <IconBrandMark size={20} />
            </div>
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Ops Board</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{theme === "dark" ? "Dark" : "Light"}</div>
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <ThemeToggle />
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="bottom-tabs" aria-label="Primary">
        {mobileNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} className={`tab-link${active ? " active" : ""}`}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}