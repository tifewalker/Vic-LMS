import { Router, type RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { env } from "../env.js";
import { normaliseMatric, parseIdentifier } from "../lib/identifier.js";
import { one } from "../lib/invites.js";
import { requireAuth } from "../middleware/auth.js";
import { admin, anonClient } from "../supabase.js";

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

  const signIn = (password: string) => anonClient().auth.signInWithPassword({ email: account.email, password });
  let { data, error } = await signIn(body.data.password);
  // Students' first password is their matric number, stored uppercase without spaces. Accept it
  // typed the way the matric login is (any case, stray spaces) by trying the normalised form once.
  const normalised = normaliseMatric(body.data.password);
  if ((error || !data.session) && parseIdentifier(body.data.identifier)?.kind === "matric_no" && normalised !== body.data.password) {
    ({ data, error } = await signIn(normalised));
  }
  if (error || !data.session) return res.status(401).json({ error: LOGIN_ERROR });

  res.json({ session: data.session, profile: await profileSummary(data.user.id) });
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
