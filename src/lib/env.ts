import "server-only";
import { z } from "zod";
import { DEV_SESSION_SECRET } from "@/lib/auth/demo-session";

const optionalKey = z.string().min(4).optional();
const csv = z
  .string()
  .optional()
  .transform((v) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean));

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("documents"),
  SESSION_SECRET: z.string().min(32).optional(),
  ANTHROPIC_API_KEY: z.string().min(10).optional(),
  AI_MODEL: z.string().default("claude-opus-5-5"),
  CRON_SECRET: z.string().min(16).optional(),
  ADMIN_EMAILS: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().endsWith(".apps.googleusercontent.com").optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(10).optional(),

  /* Reference data & enrichment */
  STACKEXCHANGE_KEY: optionalKey,
  LIGHTCAST_CLIENT_ID: optionalKey,
  LIGHTCAST_CLIENT_SECRET: optionalKey,
  GITHUB_TOKEN: optionalKey,
  /** Set to "off" to skip the DNS check on sign-up email domains (e.g. in an offline sandbox). */
  EMAIL_DOMAIN_CHECK: z.enum(["on", "off"]).default("on"),

  /* Job sources */
  JOB_SOURCES: csv,
  JOB_MAX_AGE_DAYS: z.coerce.number().int().min(1).max(365).default(45),
  ADZUNA_APP_ID: optionalKey,
  ADZUNA_APP_KEY: optionalKey,
  ADZUNA_COUNTRIES: csv,
  MUSE_API_KEY: optionalKey,
  GREENHOUSE_BOARDS: csv,
  LEVER_COMPANIES: csv,
});

export type ServerEnv = z.infer<typeof ServerEnvSchema> & { dataMode: "supabase" | "demo"; sessionSecret: string };

let cached: ServerEnv | null = null;


export function serverEnv(): ServerEnv {
  if (cached) return cached;
  // Blank values in .env files mean "unset", not "invalid".
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ""));
  const parsed = ServerEnvSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
  }
  const env = parsed.data;
  const dataMode = env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "demo";

  // Empty in production without SESSION_SECRET: sessions can't be signed or verified, so demo sign-in fails closed.
  const sessionSecret = env.SESSION_SECRET ?? (env.NODE_ENV === "production" ? "" : DEV_SESSION_SECRET);
  cached = { ...env, dataMode, sessionSecret };
  return cached;
}

export const isDemoMode = () => serverEnv().dataMode === "demo";

/** Google sign-in without Supabase (demo/self-hosted auth). With Supabase, Google is configured on the Supabase project instead. */
export const nativeGoogleEnabled = () => {
  const env = serverEnv();
  return env.dataMode === "demo" && !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET;
};

/** Whether the "Continue with Google" button should be offered at all. */
export const googleSignInAvailable = () => serverEnv().dataMode === "supabase" || nativeGoogleEnabled();
