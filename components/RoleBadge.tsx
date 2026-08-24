import type { RoleDisplay } from "@/lib/role";

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, { pad: string; fontSize: number; letterSpacing: string; full: boolean }> = {
  sm: { pad: "3px 9px",   fontSize: 10, letterSpacing: "0.1em", full: false },
  md: { pad: "5px 12px",  fontSize: 11, letterSpacing: "0.1em", full: false },
  lg: { pad: "7px 16px",  fontSize: 13, letterSpacing: "0.12em", full: true },
};

export function RoleBadge({
  role,
  size = "md",
  glow = false,
}: {
  role: RoleDisplay;
  size?: Size;
  glow?: boolean;
}) {
  const s = SIZE[size];
  const label = s.full ? role.full : role.short;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: s.pad,
        borderRadius: 999,
        background: `linear-gradient(135deg, ${role.gradient[0]}, ${role.gradient[1]})`,
        fontSize: s.fontSize,
        fontWeight: 700,
        letterSpacing: s.letterSpacing,
        textTransform: "uppercase",
        color: "#ffffff",
        boxShadow: glow
          ? `0 4px 14px ${role.glow}, 0 1px 0 rgba(255,255,255,0.25) inset`
          : "0 1px 0 rgba(255,255,255,0.2) inset",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}