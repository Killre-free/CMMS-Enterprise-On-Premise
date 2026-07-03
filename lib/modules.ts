// lib/modules.ts
import { prisma } from "@/lib/prisma";

const CORE_MODULES = new Set([
  "dashboard",
  "workOrder",
  "machine",
  "pm",
  "checkSheet",
  "sparePart",
  "notification",
  "reports",
  "users",
]);

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { value: boolean; expiresAt: number }>();

/**
 * Returns whether an add-on module (or sub-feature, e.g. "checkSheet.canvasMode")
 * is licensed for this deployment. Core modules are always enabled and never
 * hit the DB. Cached in-memory with a short TTL since this runs on every request;
 * invalidated on ModuleLicense writes via invalidateModuleCache().
 */
export async function isModuleEnabled(moduleKey: string): Promise<boolean> {
  if (CORE_MODULES.has(moduleKey)) return true;

  const cached = cache.get(moduleKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const license = await prisma.moduleLicense.findUnique({
    where: { moduleKey },
  });
  const enabled = Boolean(
    license?.isEnabled && (!license.expiresAt || license.expiresAt > new Date())
  );
  cache.set(moduleKey, { value: enabled, expiresAt: Date.now() + CACHE_TTL_MS });
  return enabled;
}

export function invalidateModuleCache(moduleKey?: string) {
  if (moduleKey) cache.delete(moduleKey);
  else cache.clear();
}

/** Throws a distinct 403 (MODULE_NOT_LICENSED) if the add-on module isn't enabled. */
export async function assertModuleEnabled(moduleKey: string): Promise<void> {
  const enabled = await isModuleEnabled(moduleKey);
  if (!enabled) {
    const err = new Error("MODULE_NOT_LICENSED") as Error & { status: number };
    err.status = 403;
    throw err;
  }
}
