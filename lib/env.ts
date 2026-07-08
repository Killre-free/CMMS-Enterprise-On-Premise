// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().default("CMMS Pro"),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  STORAGE_TYPE: z.enum(["local", "s3"]).default("local"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  LINE_NOTIFY_TOKEN: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Web Push: browser/mobile notifications with no external account needed.
  // Generate a pair with `npx web-push generate-vapid-keys`.
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:admin@example.com"),

  MQTT_BROKER_URL: z.string().optional(),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),

  REDIS_URL: z.string().optional(),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

  JWT_ACCESS_TOKEN_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_TOKEN_EXPIRY: z.string().default("7d"),
  SESSION_TIMEOUT_HOURS: z.coerce.number().default(8),

  MAX_UPLOAD_SIZE_IMAGE: z.coerce.number().default(10485760),
  MAX_UPLOAD_SIZE_VIDEO: z.coerce.number().default(209715200),
  MAX_UPLOAD_SIZE_DOCUMENT: z.coerce.number().default(26214400),
  CLAMAV_HOST: z.string().optional(),

  PURCHASING_API_URL: z.string().optional(),
  ERP_API_URL: z.string().optional(),
  HR_API_URL: z.string().optional(),
  MES_API_URL: z.string().optional(),
  BUDGET_API_URL: z.string().optional(),

  SENTRY_DSN: z.string().optional(),

  APP_VERSION: z.string().default("1.0.0"),
  DATA_RETENTION_AUDIT_LOG_MONTHS: z.coerce.number().default(24),
  DATA_RETENTION_TELEMETRY_MONTHS: z.coerce.number().default(12),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    // Fail fast with a clear, complete list rather than failing silently at runtime.
    console.error(`Invalid environment configuration:\n${issues}`);
    throw new Error("Environment validation failed. See errors above.");
  }
  return parsed.data;
}

export const env = loadEnv();
