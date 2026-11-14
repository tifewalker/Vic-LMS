import { admin, type Role } from "../supabase.js";

/**
 * Creates an invited account: an unconfirmed auth user with no password, then the
 * profile, the role row (student or tutor) and a pending invitation. If any database
 * step fails, the auth user is deleted again so nothing is left half made.
 */
export async function createInvitedAccount(input: {
  role: Role;
  full_name: string;
  email: string;
  matric_no?: string;
}): Promise<{ ok: true; profileId: string; invitationId: string; tutor_id?: string } | { ok: false; reason: string }> {
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: input.email,
    email_confirm: false,
    user_metadata: { full_name: input.full_name },
  });
  if (authErr || !created.user) {
    const exists = /already|registered|exists/i.test(authErr?.message ?? "");
    return { ok: false, reason: exists ? "An account with this email already exists." : "Could not create the account." };
  }
  const id = created.user.id;

  const fail = async (reason: string) => {
    await admin.auth.admin.deleteUser(id); // cascades to profile, role rows and invitation
    return { ok: false as const, reason };
  };

  const { error: profileErr } = await admin
    .from("profiles")
    .insert({ id, role: input.role, full_name: input.full_name, email: input.email, status: "invited" });
  if (profileErr) return fail("Could not create the profile.");

  let tutor_id: string | undefined;
  if (input.role === "student") {
    const { error } = await admin.from("students").insert({ profile_id: id, matric_no: input.matric_no });
    if (error) return fail(error.code === "23505" ? "This matric number is already registered." : "Could not save the student record.");
  } else if (input.role === "tutor") {
    const { data, error } = await admin.from("tutors").insert({ profile_id: id }).select("tutor_id").single();
    if (error || !data) return fail("Could not create the tutor ID.");
    tutor_id = data.tutor_id;
  }

  const { data: inv, error: invErr } = await admin
    .from("invitations")
    .insert({ profile_id: id, status: "pending" })
    .select("id")
    .single();
  if (invErr || !inv) return fail("Could not create the invitation.");

  return { ok: true, profileId: id, invitationId: inv.id, tutor_id };
}

/** Emails that already have a profile. */
export async function existingEmails(emails: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < emails.length; i += 200) {
    const { data, error } = await admin.from("profiles").select("email").in("email", emails.slice(i, i + 200));
    if (error) throw error;
    data.forEach((r) => found.add(r.email));
  }
  return found;
}

/** Matric numbers that are already registered. */
export async function existingMatrics(matrics: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < matrics.length; i += 200) {
    const { data, error } = await admin.from("students").select("matric_no").in("matric_no", matrics.slice(i, i + 200));
    if (error) throw error;
    data.forEach((r) => found.add(r.matric_no));
  }
  return found;
}
