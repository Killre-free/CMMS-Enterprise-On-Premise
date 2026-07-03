// lib/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  base: { app: "cmms-pro", version: process.env.APP_VERSION ?? "1.0.0" },
});

export function createRequestLogger(correlationId: string) {
  return logger.child({ correlationId });
}
