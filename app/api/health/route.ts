// app/api/health/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import versionJson from "@/version.json";

const startedAt = Date.now();

export async function GET() {
  let db = "connected";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "disconnected";
  }

  let redis = "not_configured";
  if (process.env.REDIS_URL) {
    try {
      const IORedis = (await import("ioredis")).default;
      const client = new IORedis(process.env.REDIS_URL, { lazyConnect: true, connectTimeout: 1000 });
      await client.connect();
      await client.ping();
      redis = "connected";
      client.disconnect();
    } catch {
      redis = "disconnected";
    }
  }

  const status = db === "connected" ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      db,
      redis,
      version: versionJson.version,
      uptime: Math.floor((Date.now() - startedAt) / 1000),
    },
    { status: status === "ok" ? 200 : 503 }
  );
}
