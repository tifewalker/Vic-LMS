import type { Router } from "express";
import { z } from "zod";
import { canTeach, idParam, programmeAccess, zodMessage } from "../lib/access.js";
import { admin } from "../supabase.js";

/**
 * Discussion threads, replies and live Q&A. Registered on both the tutor and the student
 * routers; every route checks that the user is enrolled in (or teaches, or administers) the
 * programme. Pinning and marking answers are for tutors and admins only.
 */

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
  const { data } = await admin.from("threads").select("id, programme_id").eq("id", threadId).maybeSingle();
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
    let q = admin
      .from("threads")
      .select("id, programme_id, class_id, author_id, kind, title, body, pinned, answered, created_at, replies(count)")
      .eq("programme_id", id)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
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
    const [{ data: thread }, { data: replies }] = await Promise.all([
      admin.from("threads").select("id, programme_id, class_id, author_id, kind, title, body, pinned, answered, created_at").eq("id", id).single(),
      admin.from("replies").select("id, thread_id, author_id, body, is_answer, created_at").eq("thread_id", id).order("created_at"),
    ]);
    res.json({ thread, replies: replies ?? [] });
  });

  router.post("/threads/:id/replies", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const t = await threadProgramme(id);
    if (!t || !(await programmeAccess(req.profile!, t.programme_id))) return res.status(404).json({ error: "Not found." });
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
    res.json({ is_answer: isAnswer });
  });

  /* Live Q&A */
  router.get("/classes/:id/messages", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const cls = await classProgramme(id);
    if (!cls || !(await programmeAccess(req.profile!, cls.programme_id))) return res.status(404).json({ error: "Not found." });
    const { data } = await admin
      .from("live_messages")
      .select("id, class_id, author_id, body, is_question, answered, created_at")
      .eq("class_id", id)
      .order("created_at")
      .limit(500);
    res.json({ messages: data ?? [] });
  });

  router.post("/classes/:id/messages", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const cls = await classProgramme(id);
    if (!cls || !(await programmeAccess(req.profile!, cls.programme_id))) return res.status(404).json({ error: "Not found." });
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
    res.json({ answered });
  });
}
