// lib/logger.ts
import pino from "pino";
import pinoPretty from "pino-pretty";

const options = {
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  base: { app: "cmms-pro", version: process.env.APP_VERSION ?? "1.0.0" },
};

// pino's `transport` option spawns a worker thread (via thread-stream), which
// crashes in some containerized dev environments (e.g. restricted worker_threads
// support in certain Codespaces/sandboxes). Piping pino-pretty in-process
// avoids the worker thread entirely while keeping colorized dev output.
export const logger =
  process.env.NODE_ENV !== "production"
    ? pino(options, pinoPretty({ colorize: true }))
    : pino(options);

export function createRequestLogger(correlationId: string) {
  return logger.child({ correlationId });
}
