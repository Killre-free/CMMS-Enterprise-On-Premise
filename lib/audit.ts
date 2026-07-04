// lib/audit.ts
import { prisma } from "@/lib/prisma";

interface AuditEntry {
  userId?: string;
  username?: string;
  action: string;
  module: string;
  recordId?: string;
  recordType?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: entry.userId,
      username: entry.username,
      action: entry.action,
      module: entry.module,
      recordId: entry.recordId,
      recordType: entry.recordType,
      oldValue: entry.oldValue as any,
      newValue: entry.newValue as any,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    },
  });
}

export function requestMeta(request: Request) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  };
}
