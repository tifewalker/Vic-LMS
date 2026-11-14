import { Router } from "express";
import { z } from "zod";
import { idParam, isAdmin, zodMessage } from "../lib/access.js";
import { broadcast, isLive, logModeration } from "../lib/moderation.js";
import { liveClasses, ungradedCount, unansweredCounts } from "../lib/nav.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { admin } from "../supabase.js";

/**
 * Admin monitoring and moderation across every programme. Mounted at /admin.
 * Every action writes to moderation_log and broadcasts a "changed" signal so open pages reload.
 */
export const moderationRouter = Router();
moderationRouter.use(requireAuth, requireRole("admin", "super_admin"));

type People = Record<string, { full_name: string; role: string; chat_muted: boolean }>;

async function peopleById(ids: (string | null | undefined)[]): Promise<People> {
  const unique = [...new Set(ids.filter((v): v is string => !!v))];
  if (!unique.length) return {};
  const { data } = await admin.from("profiles").select("id, full_name, role, chat_muted").in("id", unique);
  return Object.fromEntries((data ?? []).map((p) => [p.id, { full_name: p.full_name, role: p.role, chat_muted: p.chat_muted }]));
}

/** PostgREST embeds come back as an object or a one-item array depending on the relation. */
const one = <T>(v: unknown): T | null => ((Array.isArray(v) ? v[0] : v) as T | undefined) ?? null;

const reasonBody = z.object({ reason: z.string().trim().max(500).optional() });
const hideBody = reasonBody.extend({ hidden: z.boolean() });
const flagBody = (key: string) => z.object({ [key]: z.boolean() });
const textBody = z.object({ body: z.string().trim().min(1, "Write something first.").max(2000) });

/* Hide or unhide ----------------------------------------------------------------------- */

const hideTargets = {
  live_messages: { table: "live_messages", type: "live_message" },
  threads: { table: "threads", type: "thread" },
  replies: { table: "replies", type: "reply" },
} as const;

moderationRouter.post("/moderation/:kind/:id/hide", async (req, res) => {
  const target = hideTargets[req.params.kind as keyof typeof hideTargets];
  if (!target) return res.status(404).json({ error: "Not found." });
  const id = idParam(req.params.id, res);
  if (!id) return;
  const body = hideBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
  const { hidden, reason } = body.data;

  const { data: row, error } = await admin
    .from(target.table)
    .update({ hidden, hidden_by: hidden ? req.profile!.id : null, hidden_at: hidden ? new Date().toISOString() : null })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return res.status(500).json({ error: "Could not update it." });
  if (!row) return res.status(404).json({ error: "Not found." });

  await logModeration(req.profile!.id, hidden ? "hide" : "unhide", target.type, id, reason);
  await broadcast(await topicsFor(target.type, row as Record<string, string>), { kind: target.type, id, hidden });
  res.json({ hidden });
});

/** Channels that should reload after a change to this row. */
async function topicsFor(type: "live_message" | "thread" | "reply", row: Record<string, string>): Promise<string[]> {
  if (type === "live_message") return [`mod:class:${row.class_id}`];
  if (type === "thread") return [`mod:programme:${row.programme_id}`, `mod:thread:${row.id}`];
  const { data: t } = await admin.from("threads").select("programme_id").eq("id", row.thread_id).maybeSingle();
  return [`mod:thread:${row.thread_id}`, ...(t ? [`mod:programme:${t.programme_id}`] : [])];
}

/* Answered, pinned, replies -------------------------------------------------------------- */

moderationRouter.post("/moderation/live_messages/:id/answered", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const body = flagBody("answered").safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Say whether it is answered." });
  const answered = body.data.answered as boolean;
  const { data } = await admin.from("live_messages").update({ answered }).eq("id", id).select("id").maybeSingle();
  if (!data) return res.status(404).json({ error: "Not found." });
  await logModeration(req.profile!.id, answered ? "mark_answered" : "mark_unanswered", "live_message", id);
  res.json({ answered });
});

moderationRouter.post("/moderation/threads/:id/answered", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const body = flagBody("answered").safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Say whether it is answered." });
  const answered = body.data.answered as boolean;
  const { data } = await admin.from("threads").update({ answered }).eq("id", id).select("id").maybeSingle();
  if (!data) return res.status(404).json({ error: "Not found." });
  await logModeration(req.profile!.id, answered ? "mark_answered" : "mark_unanswered", "thread", id);
  res.json({ answered });
});

moderationRouter.post("/moderation/threads/:id/pin", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const body = flagBody("pinned").safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Say whether it is pinned." });
  const pinned = body.data.pinned as boolean;
  const { data } = await admin.from("threads").update({ pinned }).eq("id", id).select("id").maybeSingle();
  if (!data) return res.status(404).json({ error: "Not found." });
  await logModeration(req.profile!.id, pinned ? "pin" : "unpin", "thread", id);
  res.json({ pinned });
});

/** Reply to a thread as Admin. */
moderationRouter.post("/moderation/threads/:id/replies", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const body = textBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
  const { data: t } = await admin.from("threads").select("id").eq("id", id).maybeSingle();
  if (!t) return res.status(404).json({ error: "Not found." });
  const { data, error } = await admin.from("replies").insert({ thread_id: id, author_id: req.profile!.id, body: body.data.body }).select("id").single();
  if (error) return res.status(500).json({ error: "Could not post the reply." });
  await logModeration(req.profile!.id, "reply", "thread", id);
  res.status(201).json({ id: data.id });
});

/** Reply to a live message as Admin: posts into the same class stream. */
moderationRouter.post("/moderation/live_messages/:id/reply", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const body = textBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
  const { data: m } = await admin.from("live_messages").select("id, class_id").eq("id", id).maybeSingle();
  if (!m) return res.status(404).json({ error: "Not found." });
  const { data, error } = await admin
    .from("live_messages")
    .insert({ class_id: m.class_id, author_id: req.profile!.id, body: body.data.body, is_question: false })
    .select("id")
    .single();
  if (error) return res.status(500).json({ error: "Could not send." });
  await logModeration(req.profile!.id, "reply", "live_message", id);
  res.status(201).json({ id: data.id });
});

/* Mute ------------------------------------------------------------------------------------- */

moderationRouter.post("/users/:id/mute", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const body = reasonBody.extend({ muted: z.boolean() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Say whether to mute." });
  const { data: target } = await admin.from("profiles").select("id, role").eq("id", id).maybeSingle();
  if (!target) return res.status(404).json({ error: "Not found." });
  if (target.role === "admin" || target.role === "super_admin") return res.status(400).json({ error: "Admins cannot be muted." });
  await admin.from("profiles").update({ chat_muted: body.data.muted }).eq("id", id);
  await logModeration(req.profile!.id, body.data.muted ? "mute" : "unmute", "user", id, body.data.reason);
  await broadcast([`mod:user:${id}`], { kind: "user", id, muted: body.data.muted });
  res.json({ muted: body.data.muted });
});

/* Live monitor ------------------------------------------------------------------------------ */

/** Start and end of today in Nigeria (WAT, UTC+1, no daylight saving). */
function todayWindow() {
  const wat = new Date(Date.now() + 60 * 60 * 1000);
  const start = Date.UTC(wat.getUTCFullYear(), wat.getUTCMonth(), wat.getUTCDate()) - 60 * 60 * 1000;
  return { start: new Date(start).toISOString(), end: new Date(start + 24 * 60 * 60 * 1000).toISOString() };
}

const truthy = (v: unknown) => v === "1" || v === "true";

moderationRouter.get("/live", async (req, res) => {
  const programmeId = z.uuid().safeParse(req.query.programme_id).data ?? null;
  const classId = z.uuid().safeParse(req.query.class_id).data ?? null;
  const { start, end } = todayWindow();

  let mq = admin
    .from("live_messages")
    .select("id, class_id, author_id, body, is_question, answered, created_at, hidden, hidden_at, class:classes!inner(id, title, programme_id)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (classId) mq = mq.eq("class_id", classId);
  if (programmeId) mq = mq.eq("class.programme_id", programmeId);
  if (truthy(req.query.questions)) mq = mq.eq("is_question", true);
  if (truthy(req.query.unanswered)) mq = mq.eq("is_question", true).eq("answered", false);

  const [{ data: today }, live, { data: messages }, { data: queue }, { data: programmes }] = await Promise.all([
    admin.from("classes").select("id, title, programme_id, starts_at, ends_at, status").gte("starts_at", start).lt("starts_at", end).order("starts_at"),
    liveClasses(null),
    mq,
    admin
      .from("live_messages")
      .select("id, class_id, author_id, body, created_at, class:classes!inner(id, title, programme_id)")
      .eq("is_question", true)
      .eq("answered", false)
      .eq("hidden", false)
      .order("created_at")
      .limit(100),
    admin.from("programmes").select("id, title").order("title"),
  ]);

  const liveIds = new Set(live.map((c) => c.id));
  const upcoming = (today ?? []).filter((c) => !liveIds.has(c.id) && c.status !== "ended" && !isLive(c) && Date.parse(c.starts_at) > Date.now());
  const classOptions = programmeId
    ? ((await admin.from("classes").select("id, title").eq("programme_id", programmeId).order("starts_at", { ascending: false }).limit(200)).data ?? [])
    : [];
  const people = await peopleById([...(messages ?? []), ...(queue ?? [])].map((m) => m.author_id));
  const progTitle = Object.fromEntries((programmes ?? []).map((p) => [p.id, p.title]));
  const shape = <T extends { class: unknown; author_id: string }>(m: T) => {
    const c = one<{ id: string; title: string; programme_id: string }>(m.class);
    return {
      ...m,
      class: c ? { id: c.id, title: c.title } : null,
      programme: c ? { id: c.programme_id, title: progTitle[c.programme_id] ?? "" } : null,
      author: people[m.author_id] ?? null,
    };
  };

  res.json({
    live: live.map((c) => ({ ...c, programme_title: progTitle[c.programme_id] ?? "" })),
    upcoming: upcoming.map((c) => ({ ...c, programme_title: progTitle[c.programme_id] ?? "" })),
    messages: (messages ?? []).reverse().map(shape),
    queue: (queue ?? []).map(shape),
    programmes: programmes ?? [],
    classes: classOptions,
  });
});

/* Discussions across programmes ---------------------------------------------------------------- */

moderationRouter.get("/discussions", async (req, res) => {
  const programmeId = z.uuid().safeParse(req.query.programme_id).data ?? null;
  const filter = String(req.query.filter ?? "");
  let q = admin
    .from("threads")
    .select("id, programme_id, class_id, author_id, kind, title, body, pinned, answered, created_at, hidden, hidden_at, replies(count), programme:programmes(title), class:classes(title)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (programmeId) q = q.eq("programme_id", programmeId);
  if (filter === "unanswered") q = q.eq("kind", "question").eq("answered", false).eq("hidden", false);
  if (filter === "pinned") q = q.eq("pinned", true);
  if (filter === "hidden") q = q.eq("hidden", true);
  const [{ data, error }, { data: programmes }] = await Promise.all([q, admin.from("programmes").select("id, title").order("title")]);
  if (error) return res.status(500).json({ error: "Could not load discussions." });
  const people = await peopleById(data.map((t) => t.author_id));
  res.json({
    programmes: programmes ?? [],
    threads: data.map((t) => ({
      ...t,
      reply_count: (t.replies as unknown as { count: number }[])[0]?.count ?? 0,
      replies: undefined,
      programme_title: one<{ title: string }>(t.programme)?.title ?? "",
      class_title: one<{ title: string }>(t.class)?.title ?? null,
      programme: undefined,
      class: undefined,
      author: people[t.author_id] ?? null,
    })),
  });
});

/* Activity feed ------------------------------------------------------------------------------- */

type Activity = {
  id: string;
  type: string;
  at: string;
  actor_id: string | null;
  programme_id: string | null;
  class_id: string | null;
  summary: string;
  /** Where to go: "class:<id>", "programme:<id>", "thread:<programme>:<id>", "assessment:<id>", "users" */
  link: string | null;
};

const ACTIVITY_TYPES = ["post", "question", "thread", "reply", "submission", "grade", "announcement", "material", "activation", "import"] as const;

moderationRouter.get("/activity", async (req, res) => {
  const programmeId = z.uuid().safeParse(req.query.programme_id).data ?? null;
  const type = ACTIVITY_TYPES.find((t) => t === req.query.type) ?? null;
  const want = (t: string) => !type || type === t;
  const N = 40;
  const clip = (s: string, n = 120) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  const items: Activity[] = [];
  const jobs: Promise<void>[] = [];

  if (want("post") || want("question")) {
    jobs.push((async () => {
      let q = admin.from("live_messages").select("id, author_id, body, is_question, created_at, class_id, class:classes!inner(programme_id, title)").order("created_at", { ascending: false }).limit(N);
      if (type === "question") q = q.eq("is_question", true);
      if (type === "post") q = q.eq("is_question", false);
      if (programmeId) q = q.eq("class.programme_id", programmeId);
      for (const m of (await q).data ?? []) {
        const c = one<{ programme_id: string; title: string }>(m.class);
        items.push({ id: `lm-${m.id}`, type: m.is_question ? "question" : "post", at: m.created_at, actor_id: m.author_id, programme_id: c?.programme_id ?? null, class_id: m.class_id, summary: `${m.is_question ? "Asked in" : "Posted in"} ${c?.title ?? "a class"}: ${clip(m.body)}`, link: `class:${m.class_id}` });
      }
    })());
  }
  if (want("thread") || want("question")) {
    jobs.push((async () => {
      let q = admin.from("threads").select("id, author_id, title, kind, created_at, programme_id, class_id").order("created_at", { ascending: false }).limit(N);
      if (type === "question") q = q.eq("kind", "question");
      if (programmeId) q = q.eq("programme_id", programmeId);
      for (const t of (await q).data ?? []) items.push({ id: `th-${t.id}`, type: t.kind === "question" ? "question" : "thread", at: t.created_at, actor_id: t.author_id, programme_id: t.programme_id, class_id: t.class_id, summary: `Started a ${t.kind === "question" ? "question" : "thread"}: ${clip(t.title)}`, link: `thread:${t.programme_id}:${t.id}` });
    })());
  }
  if (want("reply")) {
    jobs.push((async () => {
      let q = admin.from("replies").select("id, author_id, body, created_at, thread_id, thread:threads!inner(programme_id, title, class_id)").order("created_at", { ascending: false }).limit(N);
      if (programmeId) q = q.eq("thread.programme_id", programmeId);
      for (const r of (await q).data ?? []) {
        const t = one<{ programme_id: string; title: string; class_id: string | null }>(r.thread);
        items.push({ id: `re-${r.id}`, type: "reply", at: r.created_at, actor_id: r.author_id, programme_id: t?.programme_id ?? null, class_id: t?.class_id ?? null, summary: `Replied to "${clip(t?.title ?? "", 60)}": ${clip(r.body, 80)}`, link: t ? `thread:${t.programme_id}:${r.thread_id}` : null });
      }
    })());
  }
  if (want("submission")) {
    jobs.push((async () => {
      let q = admin.from("submissions").select("id, student_id, status, submitted_at, assessment_id, assessment:assessments!inner(programme_id, title, class_id)").order("submitted_at", { ascending: false }).limit(N);
      if (programmeId) q = q.eq("assessment.programme_id", programmeId);
      for (const s of (await q).data ?? []) {
        const a = one<{ programme_id: string; title: string; class_id: string | null }>(s.assessment);
        items.push({ id: `su-${s.id}`, type: "submission", at: s.submitted_at, actor_id: s.student_id, programme_id: a?.programme_id ?? null, class_id: a?.class_id ?? null, summary: `${s.status === "received_paper" ? "Paper work received for" : "Handed in"} ${a?.title ?? "an assessment"}${s.status === "late" ? " (late)" : ""}`, link: `assessment:${s.assessment_id}` });
      }
    })());
  }
  if (want("grade")) {
    jobs.push((async () => {
      let q = admin.from("grades").select("submission_id, graded_by, graded_at, submission:submissions!inner(assessment_id, assessment:assessments!inner(programme_id, title))").eq("released", true).order("graded_at", { ascending: false }).limit(N);
      if (programmeId) q = q.eq("submission.assessment.programme_id", programmeId);
      for (const g of (await q).data ?? []) {
        const s = one<{ assessment_id: string; assessment: unknown }>(g.submission);
        const a = one<{ programme_id: string; title: string }>(s?.assessment);
        items.push({ id: `gr-${g.submission_id}`, type: "grade", at: g.graded_at, actor_id: g.graded_by, programme_id: a?.programme_id ?? null, class_id: null, summary: `Released a grade for ${a?.title ?? "an assessment"}`, link: s ? `assessment:${s.assessment_id}` : null });
      }
    })());
  }
  if (want("announcement")) {
    jobs.push((async () => {
      let q = admin.from("announcements").select("id, author_id, title, created_at, programme_id, class_id").order("created_at", { ascending: false }).limit(N);
      if (programmeId) q = q.eq("programme_id", programmeId);
      for (const a of (await q).data ?? []) items.push({ id: `an-${a.id}`, type: "announcement", at: a.created_at, actor_id: a.author_id, programme_id: a.programme_id, class_id: a.class_id, summary: `Announced: ${clip(a.title)}`, link: `programme:${a.programme_id}` });
    })());
  }
  if (want("material")) {
    jobs.push((async () => {
      let q = admin.from("materials").select("id, uploaded_by, title, created_at, programme_id, class_id").order("created_at", { ascending: false }).limit(N);
      if (programmeId) q = q.eq("programme_id", programmeId);
      for (const m of (await q).data ?? []) items.push({ id: `ma-${m.id}`, type: "material", at: m.created_at, actor_id: m.uploaded_by, programme_id: m.programme_id, class_id: m.class_id, summary: `Added material: ${clip(m.title)}`, link: `programme:${m.programme_id}` });
    })());
  }
  // Activations and imports are not tied to a programme, so a programme filter leaves them out.
  if (!programmeId && want("activation")) {
    jobs.push((async () => {
      const { data } = await admin.from("invitations").select("id, profile_id, used_at").not("used_at", "is", null).order("used_at", { ascending: false }).limit(N);
      for (const i of data ?? []) items.push({ id: `ac-${i.id}`, type: "activation", at: i.used_at!, actor_id: i.profile_id, programme_id: null, class_id: null, summary: "Activated their account", link: "users" });
    })());
  }
  if (!programmeId && want("import")) {
    jobs.push((async () => {
      const { data } = await admin.from("import_log").select("id, admin_id, created_count, created_at").order("created_at", { ascending: false }).limit(N);
      for (const i of data ?? []) items.push({ id: `im-${i.id}`, type: "import", at: i.created_at, actor_id: i.admin_id, programme_id: null, class_id: null, summary: `Imported ${i.created_count} student${i.created_count === 1 ? "" : "s"}`, link: "users" });
    })());
  }

  await Promise.all(jobs);
  items.sort((a, b) => b.at.localeCompare(a.at));
  const page = items.slice(0, 100);
  const [people, { data: programmes }] = await Promise.all([
    peopleById(page.map((i) => i.actor_id)),
    admin.from("programmes").select("id, title").order("title"),
  ]);
  const titles = Object.fromEntries((programmes ?? []).map((p) => [p.id, p.title]));
  res.json({
    types: ACTIVITY_TYPES,
    programmes: programmes ?? [],
    items: page.map((i) => ({ ...i, actor: i.actor_id ? (people[i.actor_id] ?? null) : null, programme_title: i.programme_id ? (titles[i.programme_id] ?? "") : null })),
  });
});

/* Reports: one row per programme --------------------------------------------------------------- */

moderationRouter.get("/reports", async (_req, res) => {
  const now = new Date().toISOString();
  const [{ data: programmes }, { data: students }, { data: tutors }, { data: classes }, { data: assessments }, { data: subs }, { data: questions }] = await Promise.all([
    admin.from("programmes").select("id, title, is_active").order("title"),
    admin.from("programme_students").select("programme_id"),
    admin.from("programme_tutors").select("programme_id"),
    admin.from("classes").select("programme_id, ends_at"),
    admin.from("assessments").select("id, programme_id, published"),
    admin.from("submissions").select("status, assessment:assessments!inner(programme_id), grade:grades(released)"),
    admin.from("threads").select("programme_id").eq("kind", "question").eq("answered", false).eq("hidden", false),
  ]);
  const count = <T>(rows: T[] | null, f: (r: T) => boolean) => (rows ?? []).filter(f).length;
  res.json({
    programmes: (programmes ?? []).map((p) => {
      const mySubs = (subs ?? []).filter((s) => one<{ programme_id: string }>(s.assessment)?.programme_id === p.id);
      return {
        ...p,
        students: count(students, (r) => r.programme_id === p.id),
        tutors: count(tutors, (r) => r.programme_id === p.id),
        classes_total: count(classes, (r) => r.programme_id === p.id),
        classes_held: count(classes, (r) => r.programme_id === p.id && r.ends_at < now),
        assessments: count(assessments, (r) => r.programme_id === p.id && r.published),
        handed_in: mySubs.length,
        to_grade: mySubs.filter((s) => s.status !== "graded").length,
        released: mySubs.filter((s) => one<{ released: boolean }>(s.grade)?.released).length,
        open_questions: count(questions, (r) => r.programme_id === p.id),
      };
    }),
  });
});

/* Sidebar and dashboard counts ------------------------------------------------------------------- */

moderationRouter.get("/nav", async (req, res) => {
  if (!isAdmin(req.profile!)) return res.status(403).json({ error: "You do not have access to this." });
  const [live, unanswered, ungraded] = await Promise.all([liveClasses(null), unansweredCounts(null), ungradedCount(null)]);
  res.json({ live, unanswered_live: unanswered.live, unanswered_threads: unanswered.threads, ungraded });
});
