import { z } from "zod";

/**
 * Public config, read lazily so the static landing page builds without it.
 * NEXT_PUBLIC_ values must be referenced literally so Next.js inlines them at build time.
 */
const schema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

let cached: z.infer<typeof schema> | null = null;

export function publicEnv() {
  if (cached) return cached;
  const parsed = schema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Missing or invalid web env vars: ${fields}. See web/.env.example.`);
  }
  cached = { ...parsed.data, NEXT_PUBLIC_API_URL: parsed.data.NEXT_PUBLIC_API_URL.replace(/\/$/, "") };
  return cached;
}
