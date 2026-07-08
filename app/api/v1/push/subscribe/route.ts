// app/api/v1/push/subscribe/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { pushSubscribeSchema, pushUnsubscribeSchema, parseOrThrow } from "@/lib/validators";

export const POST = withApiHandler(async (req, { user }) => {
  const body = parseOrThrow(pushSubscribeSchema, await req.json());

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    update: { userId: user.id, p256dh: body.keys.p256dh, auth: body.keys.auth },
    create: { userId: user.id, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
});

export const DELETE = withApiHandler(async (req) => {
  const body = parseOrThrow(pushUnsubscribeSchema, await req.json());
  await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint } });
  return new NextResponse(null, { status: 204 });
});
