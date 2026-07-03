// lib/rate-limit.ts
import Redis from "ioredis";
import { env } from "@/lib/env";

const redis = env.REDIS_URL ? new Redis(env.REDIS_URL) : null;

// In-memory fallback store: Map<key, {count, resetAt}>
const memoryStore = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Fixed-window rate limiter. `key` should already encode the scope
 * (e.g. `ip:1.2.3.4`, `user:abc`, `auth:1.2.3.4`).
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  if (redis) {
    const redisKey = `ratelimit:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.pexpire(redisKey, windowMs);
    }
    const ttl = await redis.pttl(redisKey);
    const resetAt = now + Math.max(ttl, 0);
    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetAt,
    };
  }

  // In-memory fallback
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, limit, remaining: limit - 1, resetAt: now + windowMs };
  }
  entry.count += 1;
  return {
    allowed: entry.count <= limit,
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

export const RATE_LIMITS = {
  perIp: { limit: 100, windowSeconds: 60 },
  perUser: { limit: 300, windowSeconds: 60 },
  auth: { limit: 10, windowSeconds: 60 },
  upload: { limit: 20, windowSeconds: 60 },
} as const;
