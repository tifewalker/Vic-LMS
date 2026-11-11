import { z } from "zod";
import { brand } from "./lib/brand.js";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  WEB_URL: z
    .string()
    .refine((v) => v.split(",").every((u) => z.url().safeParse(u.trim()).success), "must be a URL or comma-separated URLs"),
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  RESEND_API_KEY: z.string().optional().transform((v) => v || undefined),
  // Only used when RESEND_API_KEY is set. resend.dev only delivers to your own Resend account address.
  EMAIL_FROM: z.string().min(3).default(`${brand.operator} <onboarding@resend.dev>`),
  EMAIL_DAILY_LIMIT: z.coerce.number().int().min(0).default(90),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:");
  for (const issue of parsed.error.issues) console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;

/** Allowed browser origins: WEB_URL may hold several, comma separated. */
export const webOrigins = process.env.WEB_URL!.split(",").map((s) => s.trim().replace(/\/$/, ""));
/** The first origin is the one used in email links. */
export const webUrl = webOrigins[0];
