import { z } from "zod";

/**
 * Central environment-configuration loader. All modules read config through
 * this file rather than touching process.env directly, per the mandatory
 * principle of never hardcoding environment-specific values in business code.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  AUTH_SESSION_COOKIE_NAME: z.string().default("stayaxis_session"),
  AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(43200),
  APP_BASE_URL: z.string().default("http://localhost:3000"),
  PAYMENT_PROVIDER: z.enum(["mock", "razorpay"]).default("mock"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  CHANNEL_MANAGER_PROVIDER: z.enum(["mock"]).default("mock"),
  WHATSAPP_PROVIDER: z.enum(["mock"]).default("mock"),
  WHATSAPP_API_TOKEN: z.string().optional(),
  STORAGE_PROVIDER: z.enum(["local"]).default("local"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | undefined;

/**
 * Validates process.env against the schema on first access and caches the
 * result. Throws loudly on startup if required config is missing — this is
 * intentional: a resort platform must never boot half-configured.
 */
export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${message}`);
  }
  cached = parsed.data;
  return cached;
}
