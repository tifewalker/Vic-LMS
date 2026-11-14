import { webUrl } from "../env.js";
import { admin } from "../supabase.js";
import { EmailError, firstName, inviteEmail, sendEmail } from "./email.js";
import { INVITE_TTL_HOURS, newToken } from "./tokens.js";

type InviteTarget = {
  invitationId: string;
  attempts: number;
  profile: { full_name: string; email: string };
  matric_no: string | null;
  tutor_id: string | null;
};

/** PostgREST returns embedded one-to-one rows as an object or a one-item array. */
export function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/** Typed access to an embedded row whose shape the query guarantees (e.g. an !inner join). */
export function embed<T>(v: unknown): T {
  return one(v as T | T[]) as T;
}

/** Loads what an invite email needs. Returns null for missing or already activated invitations. */
export async function loadInviteTarget(invitationId: string): Promise<InviteTarget | null> {
  const { data } = await admin
    .from("invitations")
    .select("id, status, attempts, profile:profiles!inner(full_name, email, status, students(matric_no), tutors(tutor_id))")
    .eq("id", invitationId)
    .maybeSingle();
  if (!data || data.status === "activated") return null;
  const profile = one(data.profile) as unknown as {
    full_name: string;
    email: string;
    status: string;
    students: unknown;
    tutors: unknown;
  };
  if (profile.status === "suspended") return null;
  return {
    invitationId: data.id,
    attempts: data.attempts,
    profile: { full_name: profile.full_name, email: profile.email },
    matric_no: (one(profile.students) as { matric_no?: string } | null)?.matric_no ?? null,
    tutor_id: (one(profile.tutors) as { tutor_id?: string } | null)?.tutor_id ?? null,
  };
}

/**
 * Emails a fresh link. The new token is saved only once the email has gone, so an earlier link
 * keeps working if this send fails. After a bounce the invitation leaves the queue (status
 * 'expired') until an admin fixes the address or resends it.
 */
export async function sendInvite(t: InviteTarget): Promise<"sent" | "bounced" | "failed"> {
  const { token, hash } = newToken();
  const signInWith = t.matric_no
    ? `your email or your matric number ${t.matric_no}`
    : t.tutor_id
      ? `your email or your tutor ID ${t.tutor_id}`
      : "your email address";

  try {
    await sendEmail(
      inviteEmail({
        to: t.profile.email,
        firstName: firstName(t.profile.full_name),
        url: `${webUrl}/activate-account/?token=${token}`,
        signInWith,
      }),
    );
  } catch (err) {
    const bounced = err instanceof EmailError && err.bounced;
    console.error(`invite ${bounced ? "bounced" : "send failed"}`, t.profile.email, err instanceof Error ? err.message : err);
    await admin
      .from("invitations")
      .update({ attempts: t.attempts + 1, ...(bounced ? { status: "expired" } : {}) })
      .eq("id", t.invitationId)
      .neq("status", "activated");
    return bounced ? "bounced" : "failed";
  }

  const now = new Date();
  const { error } = await admin
    .from("invitations")
    .update({
      token_hash: hash,
      expires_at: new Date(now.getTime() + INVITE_TTL_HOURS * 3600 * 1000).toISOString(),
      used_at: null,
      status: "sent",
      attempts: t.attempts + 1,
      last_sent_at: now.toISOString(),
    })
    .eq("id", t.invitationId)
    .neq("status", "activated");
  if (error) console.error("invitation update after send failed", t.invitationId, error.message);
  return "sent";
}
