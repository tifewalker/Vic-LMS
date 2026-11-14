/**
 * Turns anything thrown (an Error, or a plain Supabase/PostgREST error object) into
 * something worth logging. Never sent to clients.
 *
 * Supabase errors are plain objects ({ message, code, details, hint }) with no stack.
 * Count queries ({ count: "exact", head: true }) send a HEAD request, so a failing one
 * has no response body and arrives with an empty message: we say so instead of logging "".
 */
export type ErrorDetails = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  stack?: string;
};

export function describeError(err: unknown): ErrorDetails {
  if (err === null || err === undefined) return { message: String(err) };
  if (typeof err !== "object") return { message: String(err) };

  const e = err as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
  const out: ErrorDetails = {
    message: text(e.message) ?? "",
    code: text(e.code),
    details: text(e.details),
    hint: text(e.hint),
    stack: text(e.stack),
  };

  if (!out.message) {
    out.message = err instanceof Error
      ? `${err.name} with no message`
      : "Database request failed with no details (a count query returns no error body). " +
        "Usually a missing table or column: check that every migration is applied (npx supabase migration list).";
  }
  return out;
}

/** One log entry for an error, with where it happened. */
export function logError(where: string, err: unknown): void {
  const { stack, ...rest } = describeError(err);
  console.error(`[error] ${where}`, rest);
  // A plain Supabase error has no stack; log ours so the call site can still be found.
  console.error(stack ?? new Error("(no stack on the original error; this is where it was logged)").stack);
}
