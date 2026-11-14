import { z } from "zod";
import { brand } from "./lib/brand.js";

const optional = z.string().optional().transform((v) => v?.trim() || undefined);
const bool = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v === "" ? undefined : ["1", "true", "yes"].includes(v.toLowerCase())));

const schema = z
  .object({
    PORT: z.coerce.number().int().positive().default(4000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    WEB_URL: z
      .string()
      .refine((v) => v.split(",").every((u) => z.url().safeParse(u.trim()).success), "must be a URL or comma-separated URLs"),
    SUPABASE_URL: z.url(),
    SUPABASE_ANON_KEY: z.string().min(20),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

    // Email. EMAIL_PROVIDER picks how mail leaves the API: "smtp" (any SMTP host), "resend",
    // or "console" (printed here, nothing sent). Left empty: resend if RESEND_API_KEY is set, else console.
    EMAIL_PROVIDER: z.enum(["smtp", "resend", "console"]).optional().or(z.literal("").transform(() => undefined)),
    RESEND_API_KEY: optional,
    SMTP_HOST: optional,
    SMTP_PORT: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
    SMTP_SECURE: bool,
    SMTP_USER: optional,
    SMTP_PASS: optional,
    EMAIL_FROM: z.string().min(3).default(`${brand.operatorFromName} <onboarding@resend.dev>`),
    // A mailbox someone reads. Replies to any email go here.
    EMAIL_REPLY_TO: optional,
    EMAIL_DAILY_LIMIT: z.coerce.number().int().min(0).default(90),
    EMAIL_RATE_PER_MINUTE: z.coerce.number().int().min(1).default(20),
    // First day of sending from a new domain (YYYY-MM-DD). The daily cap ramps up from here.
    EMAIL_WARMUP_START: z
      .string()
      .optional()
      .transform((v) => v?.trim() || undefined)
      .refine((v) => v === undefined || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), "must be a date like 2026-11-20"),
  })
  .superRefine((v, ctx) => {
    const provider = v.EMAIL_PROVIDER ?? (v.RESEND_API_KEY ? "resend" : "console");
    if (provider === "smtp") {
      for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"] as const) {
        if (!v[key]) ctx.addIssue({ code: "custom", path: [key], message: "is required when EMAIL_PROVIDER=smtp" });
      }
    }
    if (provider === "resend" && !v.RESEND_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "is required when EMAIL_PROVIDER=resend" });
    }
  })
  .transform((v) => {
    const provider = v.EMAIL_PROVIDER ?? (v.RESEND_API_KEY ? "resend" : "console");
    const port = v.SMTP_PORT ?? (v.SMTP_SECURE ? 465 : 587);
    // Port 465 speaks TLS from the start; 587 and 25 upgrade with STARTTLS.
    const secure = v.SMTP_SECURE ?? port === 465;
    return { ...v, EMAIL_PROVIDER: provider, SMTP_PORT: port, SMTP_SECURE: secure };
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Fail at startup, naming each variable, rather than with 500s at request time.
  const lines = parsed.error.issues.map((issue) => {
    const key = issue.path.join(".");
    const missing = process.env[key] === undefined || process.env[key] === "";
    return `  ${key}: ${missing ? "is missing" : issue.message}`;
  });
  console.error("Cannot start the API: invalid environment variables.");
  for (const line of lines) console.error(line);
  console.error("Set them in api/.env locally, or in the Render dashboard (Environment) in production. See api/.env.example.");
  process.exit(1);
}

export const env = parsed.data;

/** Allowed browser origins: WEB_URL may hold several, comma separated. */
export const webOrigins = process.env.WEB_URL!.split(",").map((s) => s.trim().replace(/\/$/, ""));
/** The first origin is the one used in email links. */
export const webUrl = webOrigins[0];
