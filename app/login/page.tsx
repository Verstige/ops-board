"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { IconBrandMark, IconSun, IconMoon } from "@/components/Icons";
import { RoleBadge } from "@/components/RoleBadge";
import { getRoleDisplay } from "@/lib/role";
import { useTheme } from "@/components/ThemeProvider";

type DemoAccount = { email: string; password: string; roleKey: string };

const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "julylan@openlocal.com", password: "julylan888", roleKey: "CTO" },
  { email: "chrissy@openlocal.com", password: "chrissy888", roleKey: "CEO" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme, toggle } = useTheme();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  function fillAccount(acct: DemoAccount) {
    setEmail(acct.email);
    setPassword(acct.password);
    setError("");
  }

  return (
    <div className="login-hero">
      <button
        type="button"
        onClick={toggle}
        aria-label="Toggle theme"
        title="Toggle theme"
        className="btn-icon"
        style={{ position: "fixed", top: 20, right: 20, zIndex: 10, width: 42, height: 42 }}
      >
        {theme === "light" ? <IconMoon size={18} /> : <IconSun size={18} />}
      </button>

      {/* Glow orbs */}
      <div aria-hidden style={{
        position: "absolute", top: "20%", left: "15%",
        width: 320, height: 320, borderRadius: "50%",
        background: "radial-gradient(circle, color-mix(in srgb, var(--brand-400) 30%, transparent), transparent 70%)",
        filter: "blur(60px)", opacity: 0.7, pointerEvents: "none",
      }} className="pulse-glow" />
      <div aria-hidden style={{
        position: "absolute", bottom: "10%", right: "10%",
        width: 260, height: 260, borderRadius: "50%",
        background: "radial-gradient(circle, color-mix(in srgb, #0550b8 26%, transparent), transparent 70%)",
        filter: "blur(60px)", opacity: 0.55, pointerEvents: "none",
      }} className="pulse-glow" />

      <div className="card glass-strong login-card glass-fade" style={{ position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div className="brand-mark">
            <IconBrandMark size={30} />
          </div>
          <div>
            <div className="login-title" style={{ marginBottom: 0 }}>Welcome back</div>
            <div className="login-subtitle" style={{ marginBottom: 0 }}>Sign in to the Ops Board</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 8, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@openlocal.com"
              required
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 8, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div style={{
              background: "var(--status-blocked-bg)",
              color: "var(--status-blocked-fg)",
              padding: "10px 14px", borderRadius: 12, fontSize: 13,
              border: "1px solid color-mix(in srgb, var(--status-blocked-fg) 30%, transparent)",
            }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4, padding: "13px", fontSize: 15 }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Demo accounts with role badges */}
        <div style={{
          marginTop: 24,
          padding: 6,
          background: "color-mix(in srgb, var(--brand-500) 5%, transparent)",
          borderRadius: 16,
          border: "1px solid color-mix(in srgb, var(--brand-500) 14%, transparent)",
        }}>
          <div style={{ padding: "12px 14px 6px", fontSize: 10, color: "var(--brand-600)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Demo accounts
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {DEMO_ACCOUNTS.map((acct) => {
              const role = getRoleDisplay(acct.roleKey);
              return (
                <button
                  key={acct.email}
                  type="button"
                  onClick={() => fillAccount(acct)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    background: "transparent",
                    border: "1px solid transparent",
                    borderRadius: 12,
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--glass-bg)";
                    e.currentTarget.style.borderColor = "var(--line-strong)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                >
                  <RoleBadge role={role} size="sm" glow />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{acct.email.split("@")[0]}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{role.tagline}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{acct.password}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}