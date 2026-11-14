import { Router, type RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { env } from "../env.js";
import { firstName } from "../lib/email.js";
import { normaliseEmail, parseIdentifier } from "../lib/identifier.js";
import { one } from "../lib/invites.js";
import { queueInvite, queuePasswordReset } from "../lib/outbox.js";
import { hashToken, looksLikeToken, passwordProblems } from "../lib/tokens.js";
import { requireAuth } from "../middleware/auth.js";
import { admin, anonClient } from "../supabase.js";
import { logError } from "../lib/errors.js";

export const authRouter = Router();

const LOGIN_ERROR = "Incorrect details. If you were recently invited, check your email for your activation link.";
const RESET_REPLY = "If an account exists, we've sent a reset link.";
const INVALID_LINK = "This link is no longer valid. Ask the admin to send a new one.";
const TOO_MANY = { error: "Too many attempts. Please wait a few minutes and try again." };

// Production limits are strict. Locally everyone shares one address (::1), so allow far more.
const LIMIT_FACTOR = env.NODE_ENV === "production" ? 1 : 25;

const byIp = (limit: number) =>
  rateLimit({ windowMs: 15 * 60 * 1000, limit: limit * LIMIT_FACTOR, standardHeaders: "draft-8", legacyHeaders: false, message: TOO_MANY });

const loginByIdentifier = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8 * LIMIT_FACTOR,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: TOO_MANY,
  keyGenerator: (req) => `id:${String(req.body?.identifier ?? "").trim().toLowerCase()}`,
});

/** Resolves an email, matric number or tutor ID to the account's email and status. */
async function resolveIdentifier(raw: string): Promise<{ id: string; email: string; status: string } | null> {
  const id = parseIdentifier(raw);
  if (!id) return null;
  if (id.kind === "email") {
    const { data } = await admin.from("profiles").select("id, email, status").eq("email", id.value).maybeSingle();
    return data;
  }
  const table = id.kind === "tutor_id" ? "tutors" : "students";
  const { data } = await admin
    .from(table)
    .select("profile:profiles!inner(id, email, status)")
    .eq(id.kind, id.value)
    .maybeSingle();
  return data ? (one(data.profile) as { id: string; email: string; status: string } | null) : null;
}

async function profileSummary(userId: string) {
  const { data } = await admin.from("profiles").select("role, full_name").eq("id", userId).single();
  return data;
}

/* POST /auth/login */
const loginBody = z.object({ identifier: z.string().min(1).max(200), password: z.string().min(1).max(200) });

authRouter.post("/login", byIp(30), loginByIdentifier, async (req, res) => {
  const body = loginBody.safeParse(req.body);
  if (!body.success) return res.status(401).json({ error: LOGIN_ERROR });

  const account = await resolveIdentifier(body.data.identifier);
  if (!account || account.status !== "active") return res.status(401).json({ error: LOGIN_ERROR });

  const { data, error } = await anonClient().auth.signInWithPassword({
    email: account.email,
    password: body.data.password,
  });
  if (error || !data.session) return res.status(401).json({ error: LOGIN_ERROR });

  res.json({ session: data.session, profile: await profileSummary(data.user.id) });
});

/* Invitation tokens */
type ValidInvite = { id: string; profile_id: string; profile: { full_name: string; email: string; status: string } };

async function findValidInvite(token: unknown): Promise<ValidInvite | null> {
  if (!looksLikeToken(token)) return null;
  const { data } = await admin
    .from("invitations")
    .select("id, profile_id, status, expires_at, used_at, profile:profiles!inner(full_name, email, status)")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  // 'pending' with a token: a new link is queued, and the one already sent keeps working until then.
  if (!data || !["sent", "pending"].includes(data.status) || data.used_at) return null;
  if (!data.expires_at || new Date(data.expires_at) <= new Date()) {
    await admin.from("invitations").update({ status: "expired" }).eq("id", data.id).eq("status", "sent");
    return null;
  }
  const profile = one(data.profile) as ValidInvite["profile"];
  if (profile.status === "suspended") return null;
  return { id: data.id, profile_id: data.profile_id, profile };
}

/* GET /auth/activate/:token */
authRouter.get("/activate/:token", byIp(60), async (req, res) => {
  const invite = await findValidInvite(req.params.token);
  if (!invite) return res.json({ valid: false });
  res.json({ valid: true, first_name: firstName(invite.profile.full_name) });
});

/* POST /auth/activate */
const activateBody = z.object({ token: z.string(), password: z.string() });

authRouter.post("/activate", byIp(20), async (req, res) => {
  const body = activateBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: INVALID_LINK });

  const problems = passwordProblems(body.data.password);
  if (problems.length) return res.status(400).json({ error: problems.join(" ") });

  const invite = await findValidInvite(body.data.token);
  if (!invite) return res.status(400).json({ error: INVALID_LINK });

  // Claim the token first so it can only ever be used once, even with two requests at the same time.
  const now = new Date().toISOString();
  const { data: claimed } = await admin
    .from("invitations")
    .update({ used_at: now })
    .eq("id", invite.id)
    .is("used_at", null)
    .select("id");
  if (!claimed?.length) return res.status(400).json({ error: INVALID_LINK });

  const { error: pwErr } = await admin.auth.admin.updateUserById(invite.profile_id, {
    password: body.data.password,
    email_confirm: true,
  });
  if (pwErr) {
    await admin.from("invitations").update({ used_at: null }).eq("id", invite.id);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }

  await admin.from("invitations").update({ status: "activated" }).eq("id", invite.id);
  await admin.from("profiles").update({ status: "active" }).eq("id", invite.profile_id);

  const { data, error } = await anonClient().auth.signInWithPassword({
    email: invite.profile.email,
    password: body.data.password,
  });
  if (error || !data.session) return res.json({ session: null, profile: null });
  res.json({ session: data.session, profile: await profileSummary(invite.profile_id) });
});

/* POST /auth/forgot-password */
const forgotBody = z.object({ email: z.string().max(200) });
const forgotByEmail = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3 * LIMIT_FACTOR,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => `fp:${normaliseEmail(String(req.body?.email ?? ""))}`,
  // Same reply as success, so the limit does not reveal whether an account exists.
  handler: (_req, res) => res.json({ message: RESET_REPLY }),
});

authRouter.post("/forgot-password", byIp(10), forgotByEmail, async (req, res) => {
  const body = forgotBody.safeParse(req.body);
  res.json({ message: RESET_REPLY });
  if (!body.success) return;

  // Work continues after replying, so response time does not reveal whether the account exists.
  try {
    const email = normaliseEmail(body.data.email);
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, status")
      .eq("email", email)
      .maybeSingle();
    if (!profile || profile.status !== "active") return;
    // Queued behind any activation emails; the link is created when it is sent.
    await queuePasswordReset(email);
  } catch (err) {
    logError("POST /auth/forgot-password (queue)", err);
  }
});

/* POST /auth/request-activation: a new activation link for an account that is not active yet */
const ACTIVATION_REPLY = "If that account is waiting to be activated, a new activation link is on its way to the email address it was registered with.";
const requestByIdentifier = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3 * LIMIT_FACTOR,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => `ra:${String(req.body?.identifier ?? "").trim().toLowerCase()}`,
  // Same reply as success, so the limit does not reveal whether an account exists.
  handler: (_req, res) => res.json({ message: ACTIVATION_REPLY }),
});

authRouter.post("/request-activation", byIp(10), requestByIdentifier, async (req, res) => {
  const body = z.object({ identifier: z.string().min(1).max(200) }).safeParse(req.body);
  res.json({ message: ACTIVATION_REPLY });
  if (!body.success) return;
  try {
    const account = await resolveIdentifier(body.data.identifier);
    if (!account || account.status !== "invited") return;
    const { data: invite } = await admin
      .from("invitations")
      .select("id")
      .eq("profile_id", account.id)
      .neq("status", "activated")
      .maybeSingle();
    if (invite) await queueInvite(invite.id);
  } catch (err) {
    logError("POST /auth/request-activation (queue)", err);
  }
});

/* GET /me: the signed-in user's profile and role (also mounted at /me) */
export const meHandler: RequestHandler = async (req, res) => {
  const p = req.profile!;
  const [{ data: student }, { data: tutor }] = await Promise.all([
    admin.from("students").select("matric_no").eq("profile_id", p.id).maybeSingle(),
    admin.from("tutors").select("tutor_id").eq("profile_id", p.id).maybeSingle(),
  ]);
  res.json({ profile: { ...p, matric_no: student?.matric_no ?? null, tutor_id: tutor?.tutor_id ?? null } });
};

authRouter.get("/me", requireAuth, meHandler);
