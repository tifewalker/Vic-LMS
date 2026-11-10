import { webUrl } from "../env.js";
import { admin } from "../supabase.js";
import { emailsRemainingToday, firstName, inviteEmail, sendEmail } from "./email.js";
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

/** Loads what an invite email needs. Returns null for missing or already activated invitations. */
export async function loadInviteTarget(invitationId: string): Promise<InviteTarget | null> {
  const { data } = await admin
    .from("invitations")
    .select("id, status, attempts, profile:profiles!inner(full_name, email, students(matric_no), tutors(tutor_id))")
    .eq("id", invitationId)
    .maybeSingle();
  if (!data || data.status === "activated") return null;
  const profile = one(data.profile) as unknown as {
    full_name: string;
    email: string;
    students: unknown;
    tutors: unknown;
  };
  return {
    invitationId: data.id,
    attempts: data.attempts,
    profile: { full_name: profile.full_name, email: profile.email },
    matric_no: (one(profile.students) as { matric_no?: string } | null)?.matric_no ?? null,
    tutor_id: (one(profile.tutors) as { tutor_id?: string } | null)?.tutor_id ?? null,
  };
}

/**
 * Issues a fresh token and emails the link. Writing the new hash replaces the old one,
 * so any earlier link stops working. If sending fails the invitation goes back to pending.
 */
export async function sendInvite(t: InviteTarget): Promise<boolean> {
  const { token, hash } = newToken();
  const now = new Date();
  const expires = new Date(now.getTime() + INVITE_TTL_HOURS * 3600 * 1000);

  const { error } = await admin
    .from("invitations")
    .update({
      token_hash: hash,
      expires_at: expires.toISOString(),
      used_at: null,
      status: "sent",
      attempts: t.attempts + 1,
      last_sent_at: now.toISOString(),
    })
    .eq("id", t.invitationId)
    .neq("status", "activated");
  if (error) return false;

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
        url: `${webUrl}/activate/?token=${token}`,
        signInWith,
      }),
    );
    return true;
  } catch (err) {
    console.error("invite send failed", t.profile.email, err);
    await admin
      .from("invitations")
      .update({ status: "pending", token_hash: null, expires_at: null })
      .eq("id", t.invitationId);
    return false;
  }
}

/** Sends one invitation now if today's limit allows; otherwise leaves it pending. */
export async function sendOrQueue(invitationId: string): Promise<"sent" | "pending" | "failed"> {
  const target = await loadInviteTarget(invitationId);
  if (!target) return "failed";
  if ((await emailsRemainingToday()) <= 0) {
    await admin.from("invitations").update({ status: "pending" }).eq("id", invitationId).neq("status", "activated");
    return "pending";
  }
  return (await sendInvite(target)) ? "sent" : "failed";
}

/** Sends pending invitations, oldest first, up to what is left of today's limit. */
export async function sendPendingInvites(): Promise<{ sent: number; failed: number; stillPending: number }> {
  const remaining = await emailsRemainingToday();
  let sent = 0;
  let failed = 0;
  if (remaining > 0) {
    const { data } = await admin
      .from("invitations")
      .select("id")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(remaining);
    for (const row of data ?? []) {
      const target = await loadInviteTarget(row.id);
      if (target && (await sendInvite(target))) sent++;
      else failed++;
    }
  }
  const { count } = await admin
    .from("invitations")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return { sent, failed, stillPending: count ?? 0 };
}
