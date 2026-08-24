"use client";

/**
 * Push subscription manager.
 * - Registers the SW (production only)
 * - Subscribes to push via Web Push API
 * - Persists subscription to /api/push/subscribe
 * - Surfaces a one-time install prompt + permission CTA
 */
import { useEffect, useState, useCallback } from "react";

type PushState = {
  /** Whether the service worker is registered and active */
  swReady: boolean;
  /** Whether the current subscription exists in our DB */
  subscribed: boolean;
  /** Whether the user has been prompted for permission yet (sessionStorage) */
  prompted: boolean;
  /** Permission state from Notification API */
  permission: NotificationPermission | "unsupported";
  /** Whether the device is iOS Safari */
  isIOS: boolean;
  /** Whether the PWA is installed (display-mode standalone) */
  isStandalone: boolean;
  /** beforeinstallprompt event (Android/Chrome) */
  installPromptEvent: any | null;
};

const INITIAL: PushState = {
  swReady: false,
  subscribed: false,
  prompted: false,
  permission: "default",
  isIOS: false,
  isStandalone: false,
  installPromptEvent: null,
};

function arrayBufferToBase64(buf: ArrayBuffer | null) {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function usePushSubscription() {
  const [state, setState] = useState<PushState>(INITIAL);

  const update = useCallback((patch: Partial<PushState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error standalone is iOS-only
      navigator.standalone === true;

    const permission =
      typeof Notification !== "undefined" ? Notification.permission : ("unsupported" as const);

    const prompted = sessionStorage.getItem("ops-push-prompted") === "1";

    update({ isIOS, isStandalone, permission, prompted });

    // beforeinstallprompt (Android/Chrome/Edge)
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      update({ installPromptEvent: e });
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Register SW in production
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          update({ swReady: true });
          // Check existing subscription
          reg.pushManager.getSubscription().then((sub) => {
            if (sub) update({ subscribed: true });
          });
        })
        .catch(() => {
          /* SW registration failed — non-fatal */
        });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, [update]);

  const enable = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return { ok: false, error: "Push not supported in this browser" };
    }
    if (state.isIOS && !state.isStandalone) {
      return {
        ok: false,
        error: "On iPhone, install the app to your Home Screen first, then open it from there.",
      };
    }

    try {
      // Get VAPID key
      const keyRes = await fetch("/api/push/vapid-public-key");
      if (!keyRes.ok) return { ok: false, error: "VAPID key not configured" };
      const { publicKey } = await keyRes.json();

      // Request permission
      const permission = await Notification.requestPermission();
      update({ permission });
      sessionStorage.setItem("ops-push-prompted", "1");
      if (permission !== "granted") {
        return { ok: false, error: "Permission denied" };
      }

      // Get / register SW
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register("/sw.js");
      }
      await navigator.serviceWorker.ready;

      // Subscribe
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }

      // Send to server
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(sub.getKey("p256dh")),
            auth: arrayBufferToBase64(sub.getKey("auth")),
          },
        }),
      });
      if (!res.ok) return { ok: false, error: `Server rejected: ${res.status}` };

      update({ subscribed: true });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Failed to enable notifications" };
    }
  }, [state.isIOS, state.isStandalone, update]);

  const disable = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      update({ subscribed: false });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Failed to disable" };
    }
  }, [update]);

  const installApp = useCallback(async () => {
    if (!state.installPromptEvent) return false;
    state.installPromptEvent.prompt();
    const choice = await state.installPromptEvent.userChoice;
    if (choice.outcome === "accepted") {
      update({ installPromptEvent: null });
      return true;
    }
    return false;
  }, [state.installPromptEvent, update]);

  const dismissPrompt = useCallback(() => {
    sessionStorage.setItem("ops-push-prompted", "1");
    update({ prompted: true });
  }, [update]);

  return { state, enable, disable, installApp, dismissPrompt };
}