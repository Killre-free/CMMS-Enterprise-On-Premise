// lib/notify.ts
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sendPushToUsers } from "@/lib/push";
import type { NotificationType } from "@prisma/client";

const transporter =
  env.SMTP_HOST && env.SMTP_USER
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      })
    : null;

interface NotifyInput {
  userIds: string[];
  title: string;
  message: string;
  type?: NotificationType;
  module: string;
  linkUrl?: string;
  sendEmail?: boolean;
}

/**
 * Channels: in-app (Notification Center) + Web Push (if the recipient
 * enabled it on any device) + email (opt-in per call via sendEmail).
 * LINE/SMS/Telegram/Teams can be added behind this same signature later.
 */
export async function notify(input: NotifyInput): Promise<void> {
  const uniqueUserIds = Array.from(new Set(input.userIds));
  if (uniqueUserIds.length === 0) return;

  // Fan-out: one Notification row per recipient.
  await prisma.notification.createMany({
    data: uniqueUserIds.map((userId) => ({
      userId,
      title: input.title,
      message: input.message,
      type: input.type ?? "Info",
      module: input.module,
      linkUrl: input.linkUrl,
    })),
  });

  await sendPushToUsers(uniqueUserIds, { title: input.title, message: input.message, linkUrl: input.linkUrl });

  if (input.sendEmail && transporter) {
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueUserIds }, email: { not: null } },
      select: { email: true },
    });
    for (const u of users) {
      try {
        await transporter.sendMail({
          from: env.SMTP_FROM ?? "CMMS Pro <no-reply@cmms.local>",
          to: u.email!,
          subject: input.title,
          text: input.message,
        });
      } catch (err) {
        logger.error({ err, to: u.email }, "failed to send notification email");
      }
    }
  }
}
