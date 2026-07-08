// lib/push.ts
import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const configured = Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
if (configured) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
}

export function isPushConfigured(): boolean {
  return configured;
}

/** Fans a notification out to every device the user has enabled push on. */
export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; message: string; linkUrl?: string }
): Promise<void> {
  if (!configured || userIds.length === 0) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (err: any) {
        // 404/410 means the browser unsubscribed or the subscription expired.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          logger.error({ err, subscriptionId: sub.id }, "failed to send push notification");
        }
      }
    })
  );
}
