import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { ASSESSMENT_COLUMNS, canTeach, CLASS_COLUMNS, idParam, isAdmin, programmeAccess, programmePeople, zodMessage } from "../lib/access.js";
import { assessmentPrefix, fileExists, fileMeta, signedDownload, signedUpload } from "../lib/files.js";
import { embed } from "../lib/invites.js";
import { liveClasses, tutorProgrammeIds, ungradedCount, unansweredCount } from "../lib/nav.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { admin } from "../supabase.js";
import { registerCommunityRoutes } from "./community.js";
import { registerContentRoutes } from "./content.js";

/** Tutor routes. Admins can use them too, for any programme. Mounted at /tutor. */
export const teachRouter = Router();
teachRouter.use(requireAuth, requireRole("tutor", "admin", "super_admin"));

/** Replies 404 unless the user teaches (or administers) the programme. */
async function teaches(req: Request, res: Response, programmeId: string | null | undefined): Promise<boolean> {
  if (!programmeId || !canTeach(await programmeAccess(req.profile!, programmeId))) {
    res.status(404).json({ error: "Not found." });
    return false;
  }
  return true;
}

async function loadAssessment(id: string) {
  const { data } = await admin.from("assessments").select(ASSESSMENT_COLUMNS).eq("id", id).maybeSingle();
  return data;
}

/* My programmes and upcoming classes */
teachRouter.get("/programmes", async (req, res) => {
  const me = req.profile!;
  let programmeIds: string[] | null = null;
  if (!isAdmin(me)) {
    const { data } = await admin.from("programme_tutors").select("programme_id").eq("tutor_id", me.id);
    programmeIds = (data ?? []).map((r) => r.programme_id);
  }
  if (programmeIds && !programmeIds.length) return res.json({ programmes: [], upcoming: [] });

  let pq = admin.from("programmes").select("id, title, description, is_active, programme_students(count)").order("title");
  let cq = admin
    .from("classes")
    .select(`${CLASS_COLUMNS}, programme:programmes(title)`)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at")
    .limit(10);
  if (programmeIds) {
    pq = pq.in("id", programmeIds);
    cq = cq.in("programme_id", programmeIds);
  }
  const [{ data: programmes }, { data: upcoming }] = await Promise.all([pq, cq]);
  res.json({
    programmes: (programmes ?? []).map(({ programme_students, ...p }) => ({
      ...p,
      student_count: (programme_students as unknown as { count: number }[])[0]?.count ?? 0,
    })),
    upcoming: upcoming ?? [],
  });
});

/* One programme: classes, roster, assessments */
teachRouter.get("/programmes/:id", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id || !(await teaches(req, res, id))) return;
  const [{ data: programme }, classes, students, assessments] = await Promise.all([
    admin.from("programmes").select("id, title, description, cover_note, is_active").eq("id", id).single(),
    admin.from("classes").select(CLASS_COLUMNS).eq("programme_id", id).order("starts_at"),
    admin.from("programme_students").select("student:students!inner(matric_no, profile:profiles!inner(id, full_name, email, status))").eq("programme_id", id),
    admin.from("assessments").select(`${ASSESSMENT_COLUMNS}, submissions(count)`).eq("programme_id", id).order("created_at", { ascending: false }),
  ]);
  res.json({
    programme,
    classes: classes.data ?? [],
    students: (students.data ?? [])
      .map((r) => {
        const s = embed<{ matric_no: string; profile: unknown }>(r.student);
        return { ...embed<{ id: string; full_name: string; email: string; status: string }>(s.profile), matric_no: s.matric_no };
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    assessments: (assessments.data ?? []).map(({ submissions, ...a }) => ({
      ...a,
      submission_count: (submissions as unknown as { count: number }[])[0]?.count ?? 0,
    })),
  });
});

/* A class, with the Zoom link for tutors */
teachRouter.get("/classes/:id", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const { data: cls } = await admin.from("classes").select(`${CLASS_COLUMNS}, programme:programmes(id, title)`).eq("id", id).maybeSingle();
  if (!(await teaches(req, res, cls?.programme_id)) || !cls) return;
  const [{ data: links }, people, { data: assessments }] = await Promise.all([
    admin.from("class_tutor_links").select("zoom_url, zoom_passcode").eq("class_id", id).maybeSingle(),
    programmePeople(cls.programme_id),
    admin.from("assessments").select(`${ASSESSMENT_COLUMNS}, submissions(count)`).eq("class_id", id).order("created_at"),
  ]);
  res.json({
    class: { ...cls, zoom_url: links?.zoom_url ?? null, zoom_passcode: links?.zoom_passcode ?? null },
    people,
    assessments: (assessments ?? []).map(({ submissions, ...a }) => ({
      ...a,
      submission_count: (submissions as unknown as { count: number }[])[0]?.count ?? 0,
    })),
    can_teach: true,
  });
});

/* Tutors can add the recording and set the class status */
teachRouter.patch("/classes/:id", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const body = z
    .object({
      recording_url: z.union([z.literal(""), z.url("Use a full link starting with https://")]).transform((v) => v || null).optional(),
      status: z.enum(["scheduled", "live", "ended"]).optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
  const { data: cls } = await admin.from("classes").select("programme_id").eq("id", id).maybeSingle();
  if (!(await teaches(req, res, cls?.programme_id)) || !cls) return;
  await admin.from("classes").update(body.data).eq("id", id);
  res.json({ id });
});

/* ---------- Assessments ---------- */

// No .default() here: in Zod 4, .partial() still applies defaults, which would overwrite
// fields on every edit. Defaults are applied only when creating.
const assessmentFields = z.object({
  title: z.string().trim().min(1, "Title is missing.").max(200),
  instructions: z.string().trim().max(10000),
  class_id: z.uuid().nullable(),
  due_at: z.iso.datetime({ offset: true }).nullable(),
  max_score: z.coerce.number().positive("Max score must be more than 0.").max(1000),
  mode: z.enum(["digital", "paper"]),
  published: z.boolean(),
});
const assessmentCreate = assessmentFields.partial().required({ title: true });
const assessmentDefaults = { instructions: "", class_id: null, due_at: null, max_score: 100, mode: "digital" as const, published: false };

async function classBelongs(classId: string | null | undefined, programmeId: string) {
  if (!classId) return true;
  const { data } = await admin.from("classes").select("programme_id").eq("id", classId).maybeSingle();
  return data?.programme_id === programmeId;
}

teachRouter.post("/programmes/:id/assessments", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id || !(await teaches(req, res, id))) return;
  const body = assessmentCreate.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
  if (!(await classBelongs(body.data.class_id, id))) return res.status(400).json({ error: "That class is not part of this programme." });
  const { data, error } = await admin
    .from("assessments")
    .insert({ ...assessmentDefaults, ...body.data, programme_id: id, created_by: req.profile!.id })
    .select("id")
    .single();
  if (error) return res.status(500).json({ error: "Could not create the assessment." });
  res.status(201).json({ id: data.id });
});

teachRouter.patch("/assessments/:id", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const a = await loadAssessment(id);
  if (!(await teaches(req, res, a?.programme_id)) || !a) return;
  const body = assessmentFields.extend({ attachment_path: z.string().max(500).nullable() }).partial().safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
  if (!(await classBelongs(body.data.class_id, a.programme_id))) return res.status(400).json({ error: "That class is not part of this programme." });
  const path = body.data.attachment_path;
  if (path && (!path.startsWith(`${assessmentPrefix(id)}/`) || !(await fileExists(path)))) {
    return res.status(400).json({ error: "Upload the file first." });
  }
  await admin.from("assessments").update(body.data).eq("id", id);
  res.json({ id });
});

teachRouter.post("/assessments/:id/attachment-url", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const a = await loadAssessment(id);
  if (!(await teaches(req, res, a?.programme_id)) || !a) return;
  const meta = fileMeta.safeParse(req.body);
  if (!meta.success) return res.status(400).json({ error: zodMessage(meta.error) });
  res.json(await signedUpload(assessmentPrefix(id), meta.data.file_name));
});

teachRouter.get("/assessments/:id/attachment", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const a = await loadAssessment(id);
  if (!(await teaches(req, res, a?.programme_id)) || !a) return;
  const url = a.attachment_path ? await signedDownload(a.attachment_path) : null;
  if (!url) return res.status(404).json({ error: "No file attached." });
  res.json({ url });
});

/* The submissions table: one row per enrolled student */
teachRouter.get("/assessments/:id", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const a = await loadAssessment(id);
  if (!(await teaches(req, res, a?.programme_id)) || !a) return;

  const [{ data: programme }, { data: enrolled }, { data: subs }] = await Promise.all([
    admin.from("programmes").select("id, title").eq("id", a.programme_id).single(),
    admin.from("programme_students").select("student:students!inner(matric_no, profile:profiles!inner(id, full_name))").eq("programme_id", a.programme_id),
    admin.from("submissions").select("id, student_id, text, file_path, link, status, submitted_at, grade:grades(score, feedback, released, graded_at)").eq("assessment_id", id),
  ]);
  const byStudent = new Map((subs ?? []).map((s) => [s.student_id, s]));
  const rows = (enrolled ?? [])
    .map((r) => {
      const s = embed<{ matric_no: string; profile: unknown }>(r.student);
      const p = embed<{ id: string; full_name: string }>(s.profile);
      const sub = byStudent.get(p.id);
      const grade = sub ? (Array.isArray(sub.grade) ? sub.grade[0] : sub.grade) : null;
      return {
        student_id: p.id,
        full_name: p.full_name,
        matric_no: s.matric_no,
        submission: sub
          ? { id: sub.id, text: sub.text, link: sub.link, has_file: !!sub.file_path, status: sub.status, submitted_at: sub.submitted_at, grade: grade ?? null }
          : null,
      };
    })
    .sort((x, y) => x.full_name.localeCompare(y.full_name));
  res.json({ assessment: a, programme, rows });
});

teachRouter.get("/submissions/:id/file", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const { data: sub } = await admin.from("submissions").select("assessment_id, file_path").eq("id", id).maybeSingle();
  const a = sub && (await loadAssessment(sub.assessment_id));
  if (!(await teaches(req, res, a?.programme_id)) || !sub || !a) return;
  const url = sub.file_path ? await signedDownload(sub.file_path) : null;
  if (!url) return res.status(404).json({ error: "No file submitted." });
  res.json({ url });
});

async function isEnrolled(programmeId: string, studentId: string) {
  const { data } = await admin.from("programme_students").select("student_id").eq("programme_id", programmeId).eq("student_id", studentId).maybeSingle();
  return !!data;
}

/* Paper work: mark received (creates the submission) or not received (removes it if ungraded) */
teachRouter.post("/assessments/:id/paper", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const body = z.object({ student_id: z.uuid(), received: z.boolean() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid request." });
  const a = await loadAssessment(id);
  if (!(await teaches(req, res, a?.programme_id)) || !a) return;
  if (!(await isEnrolled(a.programme_id, body.data.student_id))) return res.status(400).json({ error: "That student is not in this programme." });

  const { data: sub } = await admin.from("submissions").select("id, status").eq("assessment_id", id).eq("student_id", body.data.student_id).maybeSingle();
  if (body.data.received) {
    if (!sub) await admin.from("submissions").insert({ assessment_id: id, student_id: body.data.student_id, status: "received_paper" });
    else if (sub.status !== "graded") await admin.from("submissions").update({ status: "received_paper" }).eq("id", sub.id);
  } else if (sub && sub.status === "received_paper") {
    await admin.from("submissions").delete().eq("id", sub.id);
  }
  res.json({ received: body.data.received });
});

/* Grade one student. Grades stay hidden from the student until released. */
teachRouter.post("/assessments/:id/grade", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const a = await loadAssessment(id);
  if (!(await teaches(req, res, a?.programme_id)) || !a) return;
  const body = z
    .object({
      student_id: z.uuid(),
      score: z.coerce.number().min(0, "The score cannot be negative.").max(Number(a.max_score), `The score cannot be more than ${a.max_score}.`),
      feedback: z.string().trim().max(5000).default(""),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
  if (!(await isEnrolled(a.programme_id, body.data.student_id))) return res.status(400).json({ error: "That student is not in this programme." });

  let { data: sub } = await admin.from("submissions").select("id").eq("assessment_id", id).eq("student_id", body.data.student_id).maybeSingle();
  if (!sub) {
    if (a.mode === "digital") return res.status(400).json({ error: "This student has not submitted yet." });
    ({ data: sub } = await admin.from("submissions").insert({ assessment_id: id, student_id: body.data.student_id, status: "received_paper" }).select("id").single());
  }
  const { data: existing } = await admin.from("grades").select("released").eq("submission_id", sub!.id).maybeSingle();
  const { error } = await admin.from("grades").upsert(
    {
      submission_id: sub!.id,
      score: body.data.score,
      feedback: body.data.feedback,
      graded_by: req.profile!.id,
      graded_at: new Date().toISOString(),
      released: existing?.released ?? false,
    },
    { onConflict: "submission_id" },
  );
  if (error) return res.status(500).json({ error: "Could not save the grade." });
  await admin.from("submissions").update({ status: "graded" }).eq("id", sub!.id);
  res.json({ saved: true });
});

/* Release every grade on this assessment to the students */
teachRouter.post("/assessments/:id/release", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const a = await loadAssessment(id);
  if (!(await teaches(req, res, a?.programme_id)) || !a) return;
  const { data: subs } = await admin.from("submissions").select("id").eq("assessment_id", id);
  const ids = (subs ?? []).map((s) => s.id);
  let released = 0;
  if (ids.length) {
    const { data } = await admin.from("grades").update({ released: true }).in("submission_id", ids).eq("released", false).select("submission_id");
    released = data?.length ?? 0;
  }
  res.json({ released });
});

/* Sidebar counts for tutors: live classes, unanswered questions, work to grade. */
teachRouter.get("/nav", async (req, res) => {
  const ids = isAdmin(req.profile!) ? null : await tutorProgrammeIds(req.profile!.id);
  const [live, unanswered, ungraded] = await Promise.all([liveClasses(ids), unansweredCount(ids), ungradedCount(ids)]);
  res.json({ live, unanswered, ungraded });
});

registerCommunityRoutes(teachRouter);
registerContentRoutes(teachRouter);
