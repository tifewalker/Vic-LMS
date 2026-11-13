import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { createInvitedAccount, existingEmails, existingMatrics } from "../lib/accounts.js";
import { emailsRemainingToday } from "../lib/email.js";
import { drainOutbox, emailStatus, queueInvite } from "../lib/outbox.js";
import { normaliseEmail } from "../lib/identifier.js";
import { one } from "../lib/invites.js";
import { validateRows } from "../lib/rows.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { admin } from "../supabase.js";
import { enrolStudents } from "./programmes.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin", "super_admin"));

const MAX_IMPORT_ROWS = 1000;
const importLimiter = rateLimit({ windowMs: 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false });

/* GET /admin/summary: numbers for the admin dashboard */
adminRouter.get("/summary", async (_req, res) => {
  const count = async (table: string, filter?: [string, string]) => {
    let q = admin.from(table).select("*", { count: "exact", head: true });
    if (filter) q = q.eq(filter[0], filter[1]);
    const { count } = await q;
    return count ?? 0;
  };
  const [students, tutors, invited, active, suspended, pendingInvites, remainingToday, programmes, notEnrolled, upcomingClasses, email] = await Promise.all([
    count("profiles", ["role", "student"]),
    count("profiles", ["role", "tutor"]),
    count("profiles", ["status", "invited"]),
    count("profiles", ["status", "active"]),
    count("profiles", ["status", "suspended"]),
    count("invitations", ["status", "pending"]),
    emailsRemainingToday(),
    count("programmes", ["is_active", "true"]),
    admin.rpc("count_students_not_enrolled").then((r) => (r.data as number | null) ?? 0),
    admin
      .from("classes")
      .select("*", { count: "exact", head: true })
      .gte("ends_at", new Date().toISOString())
      .then((r) => r.count ?? 0),
    emailStatus(),
  ]);
  res.json({
    students,
    tutors,
    invited,
    active,
    suspended,
    pendingInvites,
    emailsRemainingToday: remainingToday,
    programmes,
    studentsNotEnrolled: notEnrolled,
    upcomingClasses,
    email,
  });
});

/* POST /admin/students/import */
const importBody = z.object({ rows: z.array(z.unknown()).min(1).max(MAX_IMPORT_ROWS), programme_id: z.uuid().optional() });

adminRouter.post("/students/import", importLimiter, async (req, res) => {
  const body = importBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: `Send between 1 and ${MAX_IMPORT_ROWS} rows.` });

  const programmeId = body.data.programme_id;
  if (programmeId) {
    const { data: programme } = await admin.from("programmes").select("id").eq("id", programmeId).maybeSingle();
    if (!programme) return res.status(400).json({ error: "That programme no longer exists. Choose another one." });
  }

  const { valid, errors } = validateRows(body.data.rows);
  const [takenEmails, takenMatrics] = await Promise.all([
    existingEmails(valid.map((r) => r.email)),
    existingMatrics(valid.map((r) => r.matric_no)),
  ]);

  const skipped: { row: number; reason: string }[] = [];
  let created = 0;
  const createdIds: string[] = [];

  for (const r of valid) {
    if (takenEmails.has(r.email)) {
      skipped.push({ row: r.row, reason: "An account with this email already exists." });
      continue;
    }
    if (takenMatrics.has(r.matric_no)) {
      skipped.push({ row: r.row, reason: "This matric number is already registered." });
      continue;
    }
    const result = await createInvitedAccount({ role: "student", ...r });
    if (result.ok) {
      created++;
      createdIds.push(result.profileId);
    } else skipped.push({ row: r.row, reason: result.reason });
  }

  let enrolled: { added: number } | null = null;
  if (programmeId && createdIds.length) {
    const added = await enrolStudents(programmeId, createdIds);
    enrolled = "error" in added ? { added: 0 } : { added: added.added };
  }

  if (created > 0) {
    const { error: logError } = await admin.from("import_log").insert({ admin_id: req.profile!.id, created_count: created });
    if (logError) console.error("import_log insert failed", logError.message);
  }
  const invites = await drainOutbox();
  res.json({ created, skipped, errors, invites, enrolled });
});

/* POST /admin/invitations/send-pending */
adminRouter.post("/invitations/send-pending", async (_req, res) => {
  res.json(await drainOutbox());
});

/* POST /admin/invitations/:id/resend: new token, the old link stops working */
adminRouter.post("/invitations/:id/resend", async (req, res) => {
  const id = z.uuid().safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ error: "Invitation not found." });
  const result = await queueInvite(id.data);
  if (!result) return res.status(400).json({ error: "This invitation cannot be sent. It may already be activated." });
  res.json({
    status: result,
    message: result === "sent" ? "Invite sent." : "The invite is queued. It goes out automatically once the email limits allow.",
  });
});

/* POST /admin/tutors and POST /admin/admins */
const personBody = z.object({
  full_name: z.string().trim().min(1, "Full name is missing.").max(120),
  email: z.email("Email is not valid.").transform(normaliseEmail),
});

async function createAndInvite(role: "tutor" | "admin", input: z.infer<typeof personBody>) {
  const taken = await existingEmails([input.email]);
  if (taken.size) return { status: 409, body: { error: "An account with this email already exists." } };
  const result = await createInvitedAccount({ role, ...input });
  if (!result.ok) return { status: 400, body: { error: result.reason } };
  const invite = (await queueInvite(result.invitationId)) ?? "failed";
  return { status: 201, body: { id: result.profileId, tutor_id: result.tutor_id ?? null, invite } };
}

adminRouter.post("/tutors", async (req, res) => {
  const body = personBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues.map((i) => i.message).join(" ") });
  const out = await createAndInvite("tutor", body.data);
  res.status(out.status).json(out.body);
});

adminRouter.post("/admins", requireRole("super_admin"), async (req, res) => {
  const body = personBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues.map((i) => i.message).join(" ") });
  const out = await createAndInvite("admin", body.data);
  res.status(out.status).json(out.body);
});

/* GET /admin/users?role=&status=&q=&page= */
const listQuery = z.object({
  role: z.enum(["student", "tutor", "admin"]).default("student"),
  status: z.enum(["invited", "active", "suspended"]).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
});
const PAGE_SIZE = 25;

adminRouter.get("/users", async (req, res) => {
  const query = listQuery.safeParse(req.query);
  if (!query.success) return res.status(400).json({ error: "Invalid filters." });
  const { role, status, q, page } = query.data;

  let list = admin
    .from("profiles")
    .select(
      "id, role, full_name, email, status, created_at, students(matric_no), tutors(tutor_id), invitations(id, status, attempts, last_sent_at, expires_at)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  list = role === "admin" ? list.in("role", ["admin", "super_admin"]) : list.eq("role", role);
  if (status) list = list.eq("status", status);

  if (q) {
    // Strip characters that have meaning in PostgREST filter syntax.
    const term = q.replace(/[,()*%\\]/g, " ").trim();
    if (term) {
      const ors = [`full_name.ilike.*${term}*`, `email.ilike.*${term}*`];
      const lookup = role === "student" ? { table: "students", col: "matric_no" } : role === "tutor" ? { table: "tutors", col: "tutor_id" } : null;
      if (lookup) {
        const { data } = await admin.from(lookup.table).select("profile_id").ilike(lookup.col, `%${term}%`).limit(200);
        const ids = (data ?? []).map((r: { profile_id: string }) => r.profile_id);
        if (ids.length) ors.push(`id.in.(${ids.join(",")})`);
      }
      list = list.or(ors.join(","));
    }
  }

  const { data, count, error } = await list;
  if (error) return res.status(500).json({ error: "Could not load users." });

  const now = Date.now();
  const users = (data ?? []).map((u) => {
    const inv = one(u.invitations as unknown as { id: string; status: string; attempts: number; last_sent_at: string | null; expires_at: string | null }[]);
    const invStatus =
      inv && inv.status === "sent" && inv.expires_at && new Date(inv.expires_at).getTime() <= now ? "expired" : inv?.status;
    return {
      id: u.id,
      role: u.role,
      full_name: u.full_name,
      email: u.email,
      status: u.status,
      created_at: u.created_at,
      matric_no: (one(u.students as unknown as { matric_no: string }[]) ?? null)?.matric_no ?? null,
      tutor_id: (one(u.tutors as unknown as { tutor_id: string }[]) ?? null)?.tutor_id ?? null,
      invitation: inv ? { id: inv.id, status: invStatus, attempts: inv.attempts, last_sent_at: inv.last_sent_at } : null,
    };
  });

  res.json({ users, total: count ?? 0, page, pageSize: PAGE_SIZE, emailsRemainingToday: await emailsRemainingToday() });
});

/* POST /admin/users/:id/suspend and /reactivate
 * Suspending bans the user in Supabase Auth (no new sessions or token refreshes) and the API
 * rejects their current token through requireAuth. Only a super_admin can change admins. */
async function changeSuspension(req: import("express").Request, res: import("express").Response, suspend: boolean) {
  const id = z.uuid().safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ error: "User not found." });
  if (id.data === req.profile!.id) return res.status(400).json({ error: "You cannot change your own account here." });

  const { data: target } = await admin
    .from("profiles")
    .select("id, role, status, invitations(status)")
    .eq("id", id.data)
    .maybeSingle();
  if (!target) return res.status(404).json({ error: "User not found." });
  if ((target.role === "admin" || target.role === "super_admin") && req.profile!.role !== "super_admin") {
    return res.status(403).json({ error: "Only a super admin can suspend or reactivate admins." });
  }

  // Back to active if they had activated their account, otherwise back to invited.
  const activated = one(target.invitations as { status: string }[] | null)?.status === "activated" || target.role === "super_admin";
  const nextStatus = suspend ? "suspended" : activated ? "active" : "invited";

  const { error: banErr } = await admin.auth.admin.updateUserById(id.data, { ban_duration: suspend ? "876000h" : "none" });
  if (banErr) return res.status(500).json({ error: "Could not update the account. Please try again." });
  const { error } = await admin.from("profiles").update({ status: nextStatus }).eq("id", id.data);
  if (error) return res.status(500).json({ error: "Could not update the account. Please try again." });
  res.json({ id: id.data, status: nextStatus });
}

adminRouter.post("/users/:id/suspend", (req, res) => changeSuspension(req, res, true));
adminRouter.post("/users/:id/reactivate", (req, res) => changeSuspension(req, res, false));
