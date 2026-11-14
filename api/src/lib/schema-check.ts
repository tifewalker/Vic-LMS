import { admin } from "../supabase.js";
import { describeError } from "./errors.js";

/**
 * One probe per migration: a table or column that migration adds. If a probe fails, that
 * migration is not applied to the project in SUPABASE_URL, and routes that need it will 500.
 * Add a line here with every new migration. (20261111000000_batches has none: 20261112 drops its tables.)
 */
const probes: { migration: string; table: string; columns: string }[] = [
  { migration: "20261110000000_auth", table: "invitations", columns: "id" },
  { migration: "20261112000000_programmes_classes", table: "classes", columns: "id" },
  { migration: "20261113000000_content", table: "materials", columns: "id" },
  { migration: "20261114000000_moderation", table: "profiles", columns: "chat_muted" },
  { migration: "20261115000000_email_outbox", table: "email_queue", columns: "id" },
  { migration: "20261115000000_email_outbox", table: "email_log", columns: "status, error, provider" },
];

/**
 * Checks at startup that the database has every migration this code needs, and logs a clear
 * message naming any that are missing. It does not stop the server: sign-in and other routes
 * still work, and the fix (applying the migration) needs no redeploy.
 */
export async function checkSchema(): Promise<boolean> {
  const missing = new Set<string>();
  for (const p of probes) {
    // A normal select (not a head/count query) so a failure carries Postgres's message.
    const { error } = await admin.from(p.table).select(p.columns).limit(0);
    if (error) {
      missing.add(p.migration);
      console.error(`[schema] ${p.table} (${p.columns}): ${describeError(error).message}`);
    }
  }
  if (missing.size === 0) return true;
  console.error(
    `[schema] The database is missing migration(s): ${[...missing].join(", ")}. ` +
      "Routes that use them will return 500. From api/, run: npx supabase db push",
  );
  return false;
}
