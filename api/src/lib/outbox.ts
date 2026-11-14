import { env, webUrl } from "../env.js";
import { admin } from "../supabase.js";
import { EmailError, dailyCap, firstName, resetEmail, sendBudget, sendEmail, sentToday } from "./email.js";
import { loadInviteTarget, sendInvite } from "./invites.js";

/**
 * The outbox. Two queues share the daily cap and the per-minute rate:
 *   1. activation emails: invitations with status 'pending', sent first
 *   2. other emails: rows in email_queue (password resets), sent with what is left
 * drainOutbox() runs every minute and straight after anything is queued.
 */

/** A queued password reset older than this is dropped: the person will have asked again or given up. */
const RESET_MAX_AGE_MS = 24 * 3600 * 1000;
/** An invitation that failed this many times stays pending but is skipped until an admin resends it. */
const MAX_INVITE_ATTEMPTS = 5;

export type DrainResult = { sent: number; failed: number; stillPending: number };

let running: Promise<DrainResult> | null = null;

/** Sends what the budget allows. Calls made while a run is in progress share that run. */
export function drainOutbox(): Promise<DrainResult> {
  running ??= drain().finally(() => {
    running = null;
  });
  return running;
}

async function drain(): Promise<DrainResult> {
  let budget = await sendBudget();
  let sent = 0;
  let failed = 0;
  // A connection or login failure would fail every send after it, so stop the run there.
  let providerDown = false;

  // 1. Activation emails, fewest attempts first, then oldest.
  if (budget > 0) {
    const { data } = await admin
      .from("invitations")
      .select("id")
      .eq("status", "pending")
      .lt("attempts", MAX_INVITE_ATTEMPTS)
      .order("attempts", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(budget);
    for (const row of data ?? []) {
      const target = await loadInviteTarget(row.id);
      if (!target) continue;
      const outcome = await sendInvite(target);
      budget--;
      if (outcome === "sent") sent++;
      else {
        failed++;
        if (outcome === "failed") {
          providerDown = true;
          break;
        }
      }
    }
  }

  // 2. Other emails, oldest first, only once no activation email is waiting within the budget.
  if (budget > 0 && !providerDown) {
    await admin
      .from("email_queue")
      .update({ status: "dropped", last_error: "Waited more than 24 hours" })
      .eq("status", "queued")
      .lt("created_at", new Date(Date.now() - RESET_MAX_AGE_MS).toISOString());
    const { data } = await admin
      .from("email_queue")
      .select("id, kind, to_email, attempts")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(budget);
    for (const row of data ?? []) {
      const outcome = await sendQueued(row);
      if (outcome === "skipped") continue;
      budget--;
      if (outcome === "sent") sent++;
      else {
        failed++;
        if (outcome === "failed") break;
      }
    }
  }

  const { count } = await admin.from("invitations").select("id", { count: "exact", head: true }).eq("status", "pending");
  return { sent, failed, stillPending: count ?? 0 };
}

type Outcome = "sent" | "bounced" | "failed" | "skipped";

async function sendQueued(row: { id: number; kind: string; to_email: string; attempts: number }): Promise<Outcome> {
  const done = (status: "sent" | "failed" | "dropped", last_error: string | null = null) =>
    admin
      .from("email_queue")
      .update({ status, last_error, attempts: row.attempts + 1, sent_at: status === "sent" ? new Date().toISOString() : null })
      .eq("id", row.id);

  // Password reset: the link is made now, so it has its full hour when it arrives.
  const { data: profile } = await admin.from("profiles").select("full_name, status").eq("email", row.to_email).maybeSingle();
  if (!profile || profile.status !== "active") {
    await done("dropped", "Account not active");
    return "skipped";
  }
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: row.to_email });
  if (error || !data.properties?.hashed_token) {
    await done("dropped", "Could not create a reset link");
    return "skipped";
  }
  const url = `${webUrl}/reset-password/?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery`;
  try {
    await sendEmail(resetEmail({ to: row.to_email, firstName: firstName(profile.full_name), url }));
    await done("sent");
    return "sent";
  } catch (err) {
    const e = err as EmailError;
    // A transient failure leaves it queued for the next run; a bounce will not get better.
    if (e.bounced) await done("failed", e.message);
    else await admin.from("email_queue").update({ attempts: row.attempts + 1, last_error: e.message.slice(0, 500) }).eq("id", row.id);
    return e.bounced ? "bounced" : "failed";
  }
}

/** Queues a password reset (one per address at a time) and starts a run. */
export async function queuePasswordReset(email: string): Promise<void> {
  const { error } = await admin.from("email_queue").insert({ kind: "password_reset", to_email: email });
  // 23505: one is already queued for this address. That one will do.
  if (error && error.code !== "23505") throw error;
  void drainOutbox().catch((err) => console.error("outbox run failed", err));
}

/**
 * Puts an invitation back in the activation queue and starts a run. A link already sent keeps
 * working until the new one replaces it. Returns null for activated or missing invitations.
 */
export async function queueInvite(invitationId: string): Promise<"sent" | "pending" | null> {
  const target = await loadInviteTarget(invitationId);
  if (!target) return null;
  // An admin resend also clears earlier failures.
  await admin.from("invitations").update({ status: "pending", attempts: 0 }).eq("id", invitationId).neq("status", "activated");
  await drainOutbox();
  const { data } = await admin.from("invitations").select("status").eq("id", invitationId).single();
  return data?.status === "sent" || data?.status === "activated" ? "sent" : "pending";
}

/** Counts for the admin dashboard. */
export async function emailStatus() {
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const head = { count: "exact" as const, head: true };
  const [sent, activation, other, failed, bounced] = await Promise.all([
    sentToday(),
    admin.from("invitations").select("id", head).eq("status", "pending"),
    admin.from("email_queue").select("id", head).eq("status", "queued"),
    admin.from("email_log").select("id", head).eq("status", "failed").gte("sent_at", since),
    admin.from("email_log").select("id", head).eq("status", "bounced").gte("sent_at", since),
  ]);
  const { cap, warmupDay } = dailyCap(now);
  return {
    provider: env.EMAIL_PROVIDER,
    cap,
    warmupDay,
    sentToday: sent,
    remainingToday: Math.max(0, cap - sent),
    ratePerMinute: env.EMAIL_RATE_PER_MINUTE,
    queued: { activation: activation.count ?? 0, other: other.count ?? 0 },
    failed24h: failed.count ?? 0,
    bounced24h: bounced.count ?? 0,
  };
}
