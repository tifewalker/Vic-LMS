/**
 * Creates the first super_admin from SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD and SEED_ADMIN_NAME.
 * Usage: pnpm seed:admin. Safe to run again: an existing account is left as it is.
 */
import { normaliseEmail } from "../lib/identifier.js";
import { passwordProblems } from "../lib/tokens.js";
import { admin } from "../supabase.js";

const email = normaliseEmail(process.env.SEED_ADMIN_EMAIL ?? "");
const password = process.env.SEED_ADMIN_PASSWORD ?? "";
const fullName = (process.env.SEED_ADMIN_NAME ?? "").trim();

if (!email || !password || !fullName) {
  console.error("Set SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD and SEED_ADMIN_NAME first.");
  process.exit(1);
}
const problems = passwordProblems(password);
if (problems.length) {
  console.error(`SEED_ADMIN_PASSWORD: ${problems.join(" ")}`);
  process.exit(1);
}

const { data: existing } = await admin.from("profiles").select("id, role").eq("email", email).maybeSingle();
if (existing) {
  console.log(`An account for ${email} already exists (role: ${existing.role}). Nothing changed.`);
  process.exit(0);
}

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});
if (error || !data.user) {
  console.error("Could not create the auth user:", error?.message);
  process.exit(1);
}

const { error: profileErr } = await admin
  .from("profiles")
  .insert({ id: data.user.id, role: "super_admin", full_name: fullName, email, status: "active" });
if (profileErr) {
  await admin.auth.admin.deleteUser(data.user.id);
  console.error("Could not create the profile:", profileErr.message);
  process.exit(1);
}

console.log(`Created super_admin ${email}. Sign in at /login.`);
