/**
 * Shared notification helper.
 * Writes Notification rows for every other user (skips actor), and pushes
 * web-push messages to all active subscriptions for those users.
 */
import { PrismaClient } from "@prisma/client";
import webpush from "web-push";

const prisma = new PrismaClient();

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@openlocal.com";
  if (!pub || !priv) return; // push disabled, in-app notifications still work
  webpush.setVapidDetails(subject, pub, priv);
  vapidConfigured = true;
}

export type NotifyPayload = {
  actorUserId: string;
  actorName: string;
  type:
    | "task.created"
    | "task.status_changed"
    | "calendar.created"
    | "note.created"
    | "credential.created"
    | "milestone.status_changed"
    | "investor_update.created"
    | "sprint.created";
  title: string;
  body: string;
  link: string;
  entityId?: string;
};

/**
 * Insert Notification rows for every user OTHER than the actor, and push
 * web-push notifications to any active subscription those users have.
 * Errors are logged but never thrown — fire-and-forget.
 */
export async function notifyOthers(payload: NotifyPayload) {
  try {
    const users = await prisma.user.findMany({
      where: { id: { not: payload.actorUserId } },
      select: { id: true, name: true },
    });
    if (users.length === 0) return { inserted: 0, pushed: 0 };

    // Insert Notification rows in one shot
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        link: payload.link,
        entityId: payload.entityId ?? null,
        actorName: payload.actorName,
      })),
    });

    // Push to active subscriptions
    ensureVapid();
    if (!vapidConfigured) return { inserted: users.length, pushed: 0 };

    const subs = await prisma.pushSubscription.findMany({
      where: { userId: { in: users.map((u) => u.id) }, isActive: true },
    });
    if (subs.length === 0) return { inserted: users.length, pushed: 0 };

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.link,
      icon: "/icons/icon-192.png",
      tag: payload.entityId ? `${payload.type}:${payload.entityId}` : payload.type,
    });

    const results = await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          pushPayload
        )
      )
    );

    // Deactivate stale subs (404/410), touch lastSentAt on successful sends
    let pushed = 0;
    const toDeactivate: string[] = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const sub = subs[i];
      if (r.status === "fulfilled") {
        pushed++;
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastSentAt: new Date() },
        }).catch(() => {});
      } else {
        const code = (r.reason as any)?.statusCode;
        if (code === 404 || code === 410) {
          toDeactivate.push(sub.id);
        }
      }
    }
    if (toDeactivate.length > 0) {
      await prisma.pushSubscription.updateMany({
        where: { id: { in: toDeactivate } },
        data: { isActive: false },
      }).catch(() => {});
    }
    return { inserted: users.length, pushed };
  } catch (err) {
    console.error("[notify] failed:", err);
    return { inserted: 0, pushed: 0 };
  }
}