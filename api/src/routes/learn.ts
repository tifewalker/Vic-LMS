import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { ASSESSMENT_COLUMNS, CLASS_COLUMNS, idParam, programmeAccess, programmePeople } from "../lib/access.js";
import { fileExists, fileMeta, signedDownload, signedUpload, submissionPrefix } from "../lib/files.js";
import { embed } from "../lib/invites.js";
import { dueCount, liveClasses, studentProgrammeIds } from "../lib/nav.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { admin } from "../supabase.js";
import { registerCommunityRoutes } from "./community.js";
import { registerContentRoutes } from "./content.js";

/**
 * Student routes. Mounted at /student.
 * Class data comes only from CLASS_COLUMNS: class_tutor_links (Zoom) is never read here.
 * Students only see published assessments, their own submissions and released grades.
 */
export const learnRouter = Router();
learnRouter.use(requireAuth, requireRole("student"));

async function enrolled(req: Request, res: Response, programmeId: string | null | undefined) {
  if (!programmeId || (await programmeAccess(req.profile!, programmeId)) !== "student") {
    res.status(404).json({ error: "Not found." });
    return false;
  }
  return true;
}

/** A published assessment the student may see, or null. */
async function visibleAssessment(id: string) {
  const { data } = await admin.from("assessments").select(ASSESSMENT_COLUMNS).eq("id", id).eq("published", true).maybeSingle();
  return data;
}

type Grade = { score: number; feedback: string; released: boolean; graded_at: string };

/** The student's own submission for each assessment, with the grade only if released. */
async function mySubmissions(studentId: string, assessmentIds: string[]) {
  if (!assessmentIds.length) return new Map<string, unknown>();
  const { data } = await admin
    .from("submissions")
    .select("id, assessment_id, text, file_path, link, status, submitted_at, grade:grades(score, feedback, released, graded_at)")
    .eq("student_id", studentId)
    .in("assessment_id", assessmentIds);
  return new Map(
    (data ?? []).map((s) => {
      const g = (Array.isArray(s.grade) ? s.grade[0] : s.grade) as Grade | null;
      return [
        s.assessment_id,
        {
          id: s.id,
          text: s.text,
          link: s.link,
          has_file: !!s.file_path,
          // While a grade is unreleased, the student sees "submitted", not "graded".
          status: s.status === "graded" && !g?.released ? (s.file_path || s.text || s.link ? "submitted" : "received_paper") : s.status,
          submitted_at: s.submitted_at,
          grade: g?.released ? { score: g.score, feedback: g.feedback, graded_at: g.graded_at } : null,
        },
      ];
    }),
  );
}

async function withMine<T extends { id: string }>(studentId: string, assessments: T[]) {
  const mine = await mySubmissions(studentId, assessments.map((a) => a.id));
  return assessments.map((a) => ({ ...a, my_submission: mine.get(a.id) ?? null }));
}

/* Dashboard: my programmes, next class, recent grades, due assessments */
learnRouter.get("/overview", async (req, res) => {
  const me = req.profile!.id;
  const { data: links } = await admin.from("programme_students").select("programme_id").eq("student_id", me);
  const ids = (links ?? []).map((l) => l.programme_id);
  if (!ids.length) return res.json({ programmes: [], next_class: null, recent_grades: [], due: [], announcements: [] });

  const now = new Date().toISOString();
  const [{ data: programmes }, { data: next }, { data: assessments }, { data: announcements }] = await Promise.all([
    admin.from("programmes").select("id, title, description").in("id", ids).order("title"),
    admin.from("classes").select(`${CLASS_COLUMNS}, programme:programmes(title)`).in("programme_id", ids).gte("ends_at", now).order("starts_at").limit(1),
    admin.from("assessments").select(`${ASSESSMENT_COLUMNS}, programme:programmes(title)`).in("programme_id", ids).eq("published", true),
    admin
      .from("announcements")
      .select("id, programme_id, class_id, title, body, pinned, created_at, programme:programmes(title)")
      .in("programme_id", ids)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);
  const all = await withMine(me, assessments ?? []);
  type Mine = { status: string; grade: { score: number; feedback: string; graded_at: string } | null } | null;
  const due = all
    .filter((a) => !(a.my_submission as Mine) && a.mode === "digital" && (!a.due_at || a.due_at >= now))
    .sort((x, y) => (x.due_at ?? "9999").localeCompare(y.due_at ?? "9999"))
    .slice(0, 10);
  const recent = all
    .filter((a) => (a.my_submission as Mine)?.grade)
    .sort((x, y) => (y.my_submission as NonNullable<Mine>).grade!.graded_at.localeCompare((x.my_submission as NonNullable<Mine>).grade!.graded_at))
    .slice(0, 5);
  res.json({ programmes: programmes ?? [], next_class: next?.[0] ?? null, recent_grades: recent, due, announcements: announcements ?? [] });
});

learnRouter.get("/programmes/:id", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id || !(await enrolled(req, res, id))) return;
  const [{ data: programme }, { data: classes }, { data: tutors }, { data: assessments }, people] = await Promise.all([
    admin.from("programmes").select("id, title, description, cover_note").eq("id", id).single(),
    admin.from("classes").select(CLASS_COLUMNS).eq("programme_id", id).order("starts_at"),
    admin.from("programme_tutors").select("tutor:tutors!inner(profile:profiles!inner(full_name))").eq("programme_id", id),
    admin.from("assessments").select(ASSESSMENT_COLUMNS).eq("programme_id", id).eq("published", true).order("due_at", { nullsFirst: false }),
    programmePeople(id),
  ]);
  res.json({
    programme,
    people,
    classes: classes ?? [],
    tutors: (tutors ?? []).map((t) => embed<{ full_name: string }>(embed<{ profile: unknown }>(t.tutor).profile).full_name).sort(),
    assessments: await withMine(req.profile!.id, assessments ?? []),
  });
});

learnRouter.get("/classes/:id", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const { data: cls } = await admin.from("classes").select(`${CLASS_COLUMNS}, programme:programmes(id, title)`).eq("id", id).maybeSingle();
  if (!(await enrolled(req, res, cls?.programme_id)) || !cls) return;
  const [people, { data: assessments }] = await Promise.all([
    programmePeople(cls.programme_id),
    admin.from("assessments").select(ASSESSMENT_COLUMNS).eq("class_id", id).eq("published", true).order("due_at", { nullsFirst: false }),
  ]);
  res.json({ class: cls, people, assessments: await withMine(req.profile!.id, assessments ?? []), can_teach: false });
});

learnRouter.get("/assessments/:id", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const a = await visibleAssessment(id);
  if (!(await enrolled(req, res, a?.programme_id)) || !a) return;
  const [withSub] = await withMine(req.profile!.id, [a]);
  res.json({ assessment: withSub });
});

learnRouter.get("/assessments/:id/attachment", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const a = await visibleAssessment(id);
  if (!(await enrolled(req, res, a?.programme_id)) || !a) return;
  const url = a.attachment_path ? await signedDownload(a.attachment_path) : null;
  if (!url) return res.status(404).json({ error: "No file attached." });
  res.json({ url });
});

learnRouter.post("/assessments/:id/upload-url", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const a = await visibleAssessment(id);
  if (!(await enrolled(req, res, a?.programme_id)) || !a) return;
  if (a.mode !== "digital") return res.status(400).json({ error: "This assessment is handed in on paper." });
  const meta = fileMeta.safeParse(req.body);
  if (!meta.success) return res.status(400).json({ error: meta.error.issues.map((i) => i.message).join(" ") });
  res.json(await signedUpload(submissionPrefix(id, req.profile!.id), meta.data.file_name));
});

const submitBody = z
  .object({
    text: z.string().trim().max(20000).optional(),
    link: z.union([z.literal(""), z.url("Use a full link starting with https://")]).optional(),
    file_path: z.string().max(500).nullable().optional(),
  })
  .refine((b) => b.text || b.link || b.file_path, "Add some text, a link or a file.");

/* Submit or resubmit (until graded). After the due time the submission is marked late. */
learnRouter.post("/assessments/:id/submit", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const a = await visibleAssessment(id);
  if (!(await enrolled(req, res, a?.programme_id)) || !a) return;
  if (a.mode !== "digital") return res.status(400).json({ error: "This assessment is handed in on paper." });
  const body = submitBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues.map((i) => i.message).join(" ") });

  const me = req.profile!.id;
  const path = body.data.file_path;
  if (path && (!path.startsWith(`${submissionPrefix(id, me)}/`) || !(await fileExists(path)))) {
    return res.status(400).json({ error: "Upload the file again, then submit." });
  }

  const { data: existing } = await admin.from("submissions").select("id, status").eq("assessment_id", id).eq("student_id", me).maybeSingle();
  if (existing?.status === "graded") return res.status(400).json({ error: "This has been graded, so it can no longer be changed." });

  const late = !!a.due_at && new Date() > new Date(a.due_at);
  const row = {
    assessment_id: id,
    student_id: me,
    text: body.data.text || null,
    link: body.data.link || null,
    file_path: path ?? null,
    status: late ? ("late" as const) : ("submitted" as const),
    submitted_at: new Date().toISOString(),
  };
  const { error } = await admin.from("submissions").upsert(row, { onConflict: "assessment_id,student_id" });
  if (error) return res.status(500).json({ error: "Could not save your submission." });
  res.json({ status: row.status });
});

learnRouter.get("/assessments/:id/my-file", async (req, res) => {
  const id = idParam(req.params.id, res);
  if (!id) return;
  const { data: sub } = await admin.from("submissions").select("file_path").eq("assessment_id", id).eq("student_id", req.profile!.id).maybeSingle();
  const url = sub?.file_path ? await signedDownload(sub.file_path) : null;
  if (!url) return res.status(404).json({ error: "No file submitted." });
  res.json({ url });
});

/* Sidebar counts for students: live classes and assessments still to hand in. */
learnRouter.get("/nav", async (req, res) => {
  const ids = await studentProgrammeIds(req.profile!.id);
  const [live, due] = await Promise.all([liveClasses(ids), dueCount(req.profile!.id, ids)]);
  res.json({ live, due, muted: req.profile!.chat_muted });
});

registerCommunityRoutes(learnRouter);
registerContentRoutes(learnRouter);
