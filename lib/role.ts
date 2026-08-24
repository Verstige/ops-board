import type { AppRole } from "@/types/next-auth";

export type RoleDisplay = {
  /** Short uppercase label: "CTO", "CEO", etc. */
  short: string;
  /** Friendly full title: "Chief Technology Officer" */
  full: string;
  /** Tagline shown on login / dashboard */
  tagline: string;
  /** Gradient stops for the role badge */
  gradient: [string, string];
  /** Accent glow color (rgba / var) */
  glow: string;
};

const ROLE_META: Record<string, RoleDisplay> = {
  CTO: {
    short: "CTO",
    full: "Chief Technology Officer",
    tagline: "Engineering · Product · Architecture",
    gradient: ["#0a8f4a", "#044521"],
    glow: "rgba(10, 143, 74, 0.4)",
  },
  CEO: {
    short: "CEO",
    full: "Chief Executive Officer",
    tagline: "Strategy · Investors · Vision",
    gradient: ["#0550b8", "#022d5c"],
    glow: "rgba(5, 80, 184, 0.4)",
  },
  ADMIN: {
    short: "Admin",
    full: "Administrator",
    tagline: "Full system access",
    gradient: ["#6a7e72", "#3d4a3d"],
    glow: "rgba(106, 126, 114, 0.4)",
  },
  MEMBER: {
    short: "Member",
    full: "Team Member",
    tagline: "Standard access",
    gradient: ["#7a9385", "#3d4a3d"],
    glow: "rgba(122, 147, 133, 0.4)",
  },
};

export function getRoleDisplay(role?: string | null): RoleDisplay {
  return ROLE_META[role || "MEMBER"] || ROLE_META.MEMBER;
}