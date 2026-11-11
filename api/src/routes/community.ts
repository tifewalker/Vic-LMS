import type { Router } from "express";
import { z } from "zod";
import { canTeach, idParam, isAdmin, programmeAccess, zodMessage } from "../lib/access.js";
import { logModeration, refuseIfMuted } from "../lib/moderation.js";
import { admin } from "../supabase.js";

/**
 * Discussion threads, replies and live Q&A. Registered on both the tutor and the student
 * routers; every route checks that the user is enrolled in (or teaches, or administers) the
 * programme. Pinning and marking answers are for tutors and admins only.
 * Hidden rows are left out for everyone but admins, who see them flagged. Muted users can read but not post.
 */

const THREAD_COLUMNS = "id, programme_id, class_id, author_id, kind, title, body, pinned, answered, created_at, hidden, hidden_at";
const REPLY_COLUMNS = "id, thread_id, author_id, body, is_answer, created_at, hidden, hidden_at";
const MESSAGE_COLUMNS = "id, class_id, author_id, body, is_question, answered, created_at, hidden, hidden_at";

const threadBody = z.object({
  class_id: z.uuid().nullable().optional(),
  kind: z.enum(["question", "discussion"]).default("discussion"),
  title: z.string().trim().min(1, "Add a title.").max(200),
  body: z.string().trim().min(1, "Write something first.").max(10000),
});
const replyBody = z.object({ body: z.string().trim().min(1, "Write something first.").max(10000) });
const messageBody = z.object({
  body: z.string().trim().min(1, "Write something first.").max(2000),
  is_question: z.boolean().default(false),
});

async function threadProgramme(threadId: string) {
  const { data } = await admin.from("threads").select("id, programme_id, hidden").eq("id", threadId).maybeSingle();
  return data;
}
async function classProgramme(classId: string) {
  const { data } = await admin.from("classes").select("id, programme_id").eq("id", classId).maybeSingle();
  return data;
}

export function registerCommunityRoutes(router: Router) {
  /* Threads for a programme. ?class_id=<id> for one class, ?class_id=none for programme-wide. */
  router.get("/programmes/:id/threads", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    if (!(await programmeAccess(req.profile!, id))) return res.status(404).json({ error: "Not found." });
    const seesHidden = isAdmin(req.profile!);
    let q = admin
      .from("threads")
      .select(`${THREAD_COLUMNS}, replies(count)`)
      .eq("programme_id", id)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (!seesHidden) q = q.eq("hidden", false).eq("replies.hidden", false);
    const classId = String(req.query.class_id ?? "");
    if (classId === "none") q = q.is("class_id", null);
    else if (classId) q = q.eq("class_id", classId);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: "Could not load the discussion." });
    res.json({
      threads: data.map((t) => ({ ...t, reply_count: (t.replies as unknown as { count: number }[])[0]?.count ?? 0, replies: undefined })),
    });
  });

  router.post("/programmes/:id/threads", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    if (!(await programmeAccess(req.profile!, id))) return res.status(404).json({ error: "Not found." });
    if (refuseIfMuted(req.profile!, res)) return;
    const body = threadBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
    if (body.data.class_id) {
      const cls = await classProgramme(body.data.class_id);
      if (!cls || cls.programme_id !== id) return res.status(400).json({ error: "That class is not part of this programme." });
    }
    const { data, error } = await admin
      .from("threads")
      .insert({ ...body.data, class_id: body.data.class_id ?? null, programme_id: id, author_id: req.profile!.id })
      .select("id")
      .single();
    if (error) return res.status(500).json({ error: "Could not post." });
    res.status(201).json({ id: data.id });
  });

  router.get("/threads/:id", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const t = await threadProgramme(id);
    if (!t || !(await programmeAccess(req.profile!, t.programme_id))) return res.status(404).json({ error: "Not found." });
    const seesHidden = isAdmin(req.profile!);
    let rq = admin.from("replies").select(REPLY_COLUMNS).eq("thread_id", id).order("created_at");
    if (!seesHidden) rq = rq.eq("hidden", false);
    const [{ data: thread }, { data: replies }] = await Promise.all([
      admin.from("threads").select(THREAD_COLUMNS).eq("id", id).single(),
      rq,
    ]);
    if (!thread || (thread.hidden && !seesHidden)) return res.status(404).json({ error: "This thread is no longer available." });
    res.json({ thread, replies: replies ?? [], muted: req.profile!.chat_muted && !seesHidden });
  });

  router.post("/threads/:id/replies", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const t = await threadProgramme(id);
    if (!t || !(await programmeAccess(req.profile!, t.programme_id))) return res.status(404).json({ error: "Not found." });
    if (t.hidden && !isAdmin(req.profile!)) return res.status(404).json({ error: "This thread is no longer available." });
    if (refuseIfMuted(req.profile!, res)) return;
    const body = replyBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
    const { data, error } = await admin.from("replies").insert({ thread_id: id, author_id: req.profile!.id, body: body.data.body }).select("id").single();
    if (error) return res.status(500).json({ error: "Could not post the reply." });
    res.status(201).json({ id: data.id });
  });

  router.post("/threads/:id/pin", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const t = await threadProgramme(id);
    if (!t || !canTeach(await programmeAccess(req.profile!, t.programme_id))) return res.status(403).json({ error: "Only tutors can pin threads." });
    const pinned = req.body?.pinned !== false;
    await admin.from("threads").update({ pinned }).eq("id", id);
    if (isAdmin(req.profile!)) await logModeration(req.profile!.id, pinned ? "pin" : "unpin", "thread", id);
    res.json({ pinned });
  });

  /* Mark a reply as the answer (or not). The thread is answered while any reply is the answer. */
  router.post("/replies/:id/answer", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const { data: reply } = await admin.from("replies").select("id, thread_id").eq("id", id).maybeSingle();
    const t = reply && (await threadProgramme(reply.thread_id));
    if (!reply || !t || !canTeach(await programmeAccess(req.profile!, t.programme_id))) {
      return res.status(403).json({ error: "Only tutors can mark answers." });
    }
    const isAnswer = req.body?.is_answer !== false;
    await admin.from("replies").update({ is_answer: isAnswer }).eq("id", id);
    const { count } = await admin.from("replies").select("id", { count: "exact", head: true }).eq("thread_id", reply.thread_id).eq("is_answer", true);
    await admin.from("threads").update({ answered: (count ?? 0) > 0 }).eq("id", reply.thread_id);
    if (isAdmin(req.profile!)) await logModeration(req.profile!.id, isAnswer ? "mark_answered" : "mark_unanswered", "reply", id);
    res.json({ is_answer: isAnswer });
  });

  /* Live Q&A */
  router.get("/classes/:id/messages", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const cls = await classProgramme(id);
    if (!cls || !(await programmeAccess(req.profile!, cls.programme_id))) return res.status(404).json({ error: "Not found." });
    const seesHidden = isAdmin(req.profile!);
    let q = admin.from("live_messages").select(MESSAGE_COLUMNS).eq("class_id", id).order("created_at").limit(500);
    if (!seesHidden) q = q.eq("hidden", false);
    const { data } = await q;
    res.json({ messages: data ?? [], muted: req.profile!.chat_muted && !seesHidden });
  });

  router.post("/classes/:id/messages", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const cls = await classProgramme(id);
    if (!cls || !(await programmeAccess(req.profile!, cls.programme_id))) return res.status(404).json({ error: "Not found." });
    if (refuseIfMuted(req.profile!, res)) return;
    const body = messageBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
    const { data, error } = await admin
      .from("live_messages")
      .insert({ class_id: id, author_id: req.profile!.id, ...body.data })
      .select("id")
      .single();
    if (error) return res.status(500).json({ error: "Could not send." });
    res.status(201).json({ id: data.id });
  });

  router.post("/messages/:id/answered", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const { data: msg } = await admin.from("live_messages").select("id, class_id").eq("id", id).maybeSingle();
    const cls = msg && (await classProgramme(msg.class_id));
    if (!msg || !cls || !canTeach(await programmeAccess(req.profile!, cls.programme_id))) {
      return res.status(403).json({ error: "Only tutors can mark questions answered." });
    }
    const answered = req.body?.answered !== false;
    await admin.from("live_messages").update({ answered }).eq("id", id);
    if (isAdmin(req.profile!)) await logModeration(req.profile!.id, answered ? "mark_answered" : "mark_unanswered", "live_message", id);
    res.json({ answered });
  });
}
