"use client";

import { useState } from "react";
import { usePushSubscription } from "@/lib/usePushSubscription";
import { IconClose, IconBrandMark } from "./Icons";

export function InstallPrompt() {
  const { state, enable, installApp, dismissPrompt } = usePushSubscription();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.prompted || state.subscribed) return null;

  const showInstallButton = state.installPromptEvent !== null;
  const showIOSInstallHint = state.isIOS && !state.isStandalone;
  const showEnableButton = !showInstallButton && !showIOSInstallHint && state.permission !== "denied";

  if (!showInstallButton && !showIOSInstallHint && !showEnableButton) return null;

  async function handleEnable() {
    setBusy(true);
    setError(null);
    const r = await enable();
    setBusy(false);
    if (!r.ok) {
      setError(r.error || "Failed to enable");
      dismissPrompt();
    }
  }

  return (
    <div
      className="card glass-fade"
      style={{
        padding: "16px 20px",
        marginBottom: 24,
        background: "color-mix(in srgb, var(--brand-500) 6%, transparent)",
        border: "1px solid color-mix(in srgb, var(--brand-500) 18%, transparent)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: "linear-gradient(135deg, var(--brand-400), var(--brand-700))",
          display: "flex", alignItems: "center", justifyContent: "center", color: "white",
        }}
      >
        <IconBrandMark size={22} />
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
          {showIOSInstallHint ? "Add Ops Board to your Home Screen" : "Get notified about updates"}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
          {showIOSInstallHint
            ? "Tap the Share button, then Add to Home Screen. Then open it from there to enable alerts."
            : showInstallButton
            ? "Install the app for one-tap access and turn on push alerts."
            : "Enable push notifications so you don't miss tasks, events, or milestones from the team."}
        </div>
        {error && <div style={{ fontSize: 12, color: "var(--status-blocked-fg)", marginTop: 4 }}>{error}</div>}
      </div>
      <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
        {showInstallButton && (
          <button onClick={installApp} className="btn-ghost" style={{ fontSize: 13 }}>
            Install app
          </button>
        )}
        {showEnableButton && !state.isIOS && (
          <button onClick={handleEnable} className="btn-primary" disabled={busy} style={{ fontSize: 13 }}>
            {busy ? "Enabling…" : "Enable notifications"}
          </button>
        )}
        {showEnableButton && state.isIOS && state.isStandalone && (
          <button onClick={handleEnable} className="btn-primary" disabled={busy} style={{ fontSize: 13 }}>
            {busy ? "Enabling…" : "Enable notifications"}
          </button>
        )}
        <button
          onClick={dismissPrompt}
          aria-label="Dismiss"
          className="btn-icon"
          style={{ width: 32, height: 32, borderRadius: 10 }}
        >
          <IconClose size={14} />
        </button>
      </div>
    </div>
  );
}