"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { IconBrandMark, IconSun, IconMoon } from "@/components/Icons";
import { useTheme } from "@/components/ThemeProvider";

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

  return (
    <div className="login-hero">
      {/* Theme toggle, floating top-right */}
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

      {/* Glow orbs (subtle background motion) */}
      <div aria-hidden style={{
        position: "absolute", top: "20%", left: "15%",
        width: 320, height: 320, borderRadius: "50%",
        background: "radial-gradient(circle, color-mix(in srgb, var(--brand-400) 30%, transparent), transparent 70%)",
        filter: "blur(60px)",
        opacity: 0.7,
        pointerEvents: "none",
      }} className="pulse-glow" />
      <div aria-hidden style={{
        position: "absolute", bottom: "10%", right: "10%",
        width: 260, height: 260, borderRadius: "50%",
        background: "radial-gradient(circle, color-mix(in srgb, var(--brand-300) 28%, transparent), transparent 70%)",
        filter: "blur(60px)",
        opacity: 0.6,
        pointerEvents: "none",
      }} className="pulse-glow" />

      <div className="card glass-strong login-card glass-fade" style={{ position: "relative", zIndex: 2 }}>
        <div className="brand-mark">
          <IconBrandMark size={30} />
        </div>
        <div className="login-title">Welcome back</div>
        <div className="login-subtitle">Sign in to the Ops Board</div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
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
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
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
              padding: "10px 14px",
              borderRadius: 12,
              fontSize: 13,
              border: "1px solid color-mix(in srgb, var(--status-blocked-fg) 30%, transparent)",
            }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4, padding: "13px", fontSize: 15 }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{
          marginTop: 24, padding: 16,
          background: "color-mix(in srgb, var(--brand-500) 6%, transparent)",
          borderRadius: 14,
          border: "1px solid color-mix(in srgb, var(--brand-500) 14%, transparent)",
          fontSize: 13,
        }}>
          <div style={{ color: "var(--brand-600)", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11 }}>
            Demo accounts
          </div>
          <div style={{ display: "grid", gap: 4, color: "var(--text-secondary)" }}>
            <div><span style={{ color: "var(--text-muted)" }}>Email</span> julylan@openlocal.com</div>
            <div><span style={{ color: "var(--text-muted)" }}>Pass</span> julylan888</div>
            <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
            <div><span style={{ color: "var(--text-muted)" }}>Email</span> chrissy@openlocal.com</div>
            <div><span style={{ color: "var(--text-muted)" }}>Pass</span> chrissy888</div>
          </div>
        </div>
      </div>
    </div>
  );
}