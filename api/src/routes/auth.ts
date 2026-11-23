import { Router, type RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { env } from "../env.js";
import { createAccount } from "../lib/accounts.js";
import { normaliseMatric, parseIdentifier } from "../lib/identifier.js";
import { one } from "../lib/invites.js";
import { validateRows } from "../lib/rows.js";
import { requireAuth } from "../middleware/auth.js";
import { admin, anonClient } from "../supabase.js";
import { enrolStudents } from "./programmes.js";

export const authRouter = Router();

const LOGIN_ERROR = "Incorrect details. Check them and try again, or ask the programme admin to reset your password.";
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

type Account = { id: string; email: string; status: string; role: string };

/** Resolves an email, matric number or tutor ID to the account's email, status and role. */
async function resolveIdentifier(raw: string): Promise<Account | null> {
  const id = parseIdentifier(raw);
  if (!id) return null;
  if (id.kind === "email") {
    const { data } = await admin.from("profiles").select("id, email, status, role").eq("email", id.value).maybeSingle();
    return data;
  }
  const table = id.kind === "tutor_id" ? "tutors" : "students";
  const { data } = await admin
    .from(table)
    .select("profile:profiles!inner(id, email, status, role)")
    .eq(id.kind, id.value)
    .maybeSingle();
  return data ? (one(data.profile) as Account | null) : null;
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

  const signIn = (password: string) => anonClient().auth.signInWithPassword({ email: account.email, password });
  let { data, error } = await signIn(body.data.password);
  // Students' first password is their matric number, stored uppercase without spaces. Accept it
  // typed the way the matric login is (any case, stray spaces) by trying the normalised form once,
  // whether they log in with their matric number or their email.
  const normalised = normaliseMatric(body.data.password);
  if ((error || !data.session) && account.role === "student" && normalised !== body.data.password) {
    ({ data, error } = await signIn(normalised));
  }
  if (error || !data.session) return res.status(401).json({ error: LOGIN_ERROR });

  res.json({ session: data.session, profile: await profileSummary(data.user.id) });
});

/* ---------- Student self-registration (no email is sent) ---------- */

/* GET /auth/programmes: the programmes a student can pick when registering. Public. */
authRouter.get("/programmes", byIp(60), async (_req, res) => {
  const { data, error } = await admin.from("programmes").select("id, title").eq("is_active", true).order("title");
  if (error) return res.status(500).json({ error: "Could not load the programmes." });
  res.json({ programmes: data });
});

const MATRIC_CHARS = /^[A-Z0-9/.\-]+$/;
const registerBody = z.object({
  full_name: z.string().max(200),
  email: z.string().max(254),
  matric_no: z.string().max(60),
  programme_ids: z.array(z.uuid()).max(20),
});

/**
 * POST /auth/register: a student creates their own account. It is active at once; the
 * password is the matric number. Students on one campus network share an address, so the
 * per-address limit is generous.
 */
authRouter.post("/register", byIp(40), async (req, res) => {
  const body = registerBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Fill in every field and try again." });

  const { valid, errors } = validateRows([body.data]);
  if (errors.length) return res.status(400).json({ error: errors[0].messages.join(" ") });
  const row = valid[0];
  if (!MATRIC_CHARS.test(row.matric_no)) {
    return res.status(400).json({ error: "Matric number can only contain letters, numbers and the characters / - ." });
  }

  const ids = [...new Set(body.data.programme_ids)];
  if (!ids.length) return res.status(400).json({ error: "Choose at least one programme." });
  const { data: programmes, error: progErr } = await admin.from("programmes").select("id").in("id", ids).eq("is_active", true);
  if (progErr) return res.status(500).json({ error: "Could not check the programmes. Please try again." });
  if (programmes.length !== ids.length) return res.status(400).json({ error: "One of the programmes is no longer available. Reload the page and choose again." });

  const { data: taken } = await admin.from("students").select("profile_id").eq("matric_no", row.matric_no).maybeSingle();
  if (taken) return res.status(409).json({ error: "This matric number is already registered. Log in instead, or contact the programme team if it is not yours." });

  const created = await createAccount({ role: "student", full_name: row.full_name, email: row.email, password: row.matric_no, matric_no: row.matric_no });
  if (!created.ok) {
    const dup = /already/i.test(created.reason);
    return res.status(dup ? 409 : 500).json({ error: dup ? `${created.reason} Log in instead.` : "Could not create your account. Please try again." });
  }

  // The account exists even if an enrolment fails; the admin can enrol them from the admin pages.
  let enrolled = true;
  for (const pid of ids) if ("error" in (await enrolStudents(pid, [created.profileId]))) enrolled = false;

  res.status(201).json({ full_name: row.full_name, email: row.email, matric_no: row.matric_no, enrolled });
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
