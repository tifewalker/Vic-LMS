import { admin, type Role } from "../supabase.js";

/**
 * Creates an active account that can sign in straight away: a confirmed auth user with the
 * given password, then the profile and the role row (student or tutor). No email is sent.
 * Students use their matric number as the password; admins set it for tutors and admins.
 * If any database step fails, the auth user is deleted again so nothing is left half made.
 */
export async function createAccount(input: {
  role: Role;
  full_name: string;
  email: string;
  password: string;
  matric_no?: string;
  department?: string | null;
  level?: number | null;
}): Promise<{ ok: true; profileId: string; tutor_id?: string } | { ok: false; reason: string }> {
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name },
  });
  if (authErr || !created.user) {
    const msg = authErr?.message ?? "";
    if (/already|registered|exists/i.test(msg)) return { ok: false, reason: "An account with this email already exists." };
    if (/password/i.test(msg)) return { ok: false, reason: `The password was not accepted: ${msg}` };
    return { ok: false, reason: "Could not create the account." };
  }
  const id = created.user.id;

  const fail = async (reason: string) => {
    await admin.auth.admin.deleteUser(id); // cascades to profile and role rows
    return { ok: false as const, reason };
  };

  const { error: profileErr } = await admin
    .from("profiles")
    .insert({ id, role: input.role, full_name: input.full_name, email: input.email, status: "active" });
  if (profileErr) return fail("Could not create the profile.");

  let tutor_id: string | undefined;
  if (input.role === "student") {
    const { error } = await admin.from("students").insert({ profile_id: id, matric_no: input.matric_no, department: input.department ?? null, level: input.level ?? null });
    if (error) return fail(error.code === "23505" ? "This matric number is already registered." : "Could not save the student record.");
  } else if (input.role === "tutor") {
    const { data, error } = await admin.from("tutors").insert({ profile_id: id }).select("tutor_id").single();
    if (error || !data) return fail("Could not create the tutor ID.");
    tutor_id = data.tutor_id;
  }

  return { ok: true, profileId: id, tutor_id };
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
