import { Router } from "express";
import { z } from "zod";
import { ASSESSMENT_COLUMNS, CLASS_COLUMNS, idParam, zodMessage } from "../lib/access.js";
import { embed } from "../lib/invites.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { admin } from "../supabase.js";

/** Admin: programmes, enrolment and classes. Mounted at /admin. */
export const programmesRouter = Router();
programmesRouter.use(requireAuth, requireRole("admin", "super_admin"));

type Person = { id: string; full_name: string; email: string; status: string };
const countOf = (v: unknown) => (v as { count: number }[] | null)?.[0]?.count ?? 0;

/* ---------- Programmes ---------- */

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

// No .default() in schemas used with .partial() (Zod 4 still applies defaults there).
const programmeFields = z.object({
  title: z.string().trim().min(1, "Title is missing.").max(200),
  slug: z.string().trim().max(80),
  description: z.string().trim().max(2000),
  cover_note: z.string().trim().max(2000),
  is_active: z.boolean(),
});
const programmeCreate = programmeFields.partial().required({ title: true });

programmesRouter.get("/programmes", async (_req, res) => {
  const { data, error } = await admin
    .from("programmes")
    .select("id, title, slug, description, cover_note, is_active, created_at, programme_students(count), programme_tutors(count), classes(count)")
    .order("title");
  if (error) return res.status(500).json({ error: "Could not load programmes." });
  res.json({
    programmes: data.map(({ programme_students, programme_tutors, classes, ...p }) => ({
      ...p,
      student_count: countOf(programme_students),
      tutor_count: countOf(programme_tutors),
      class_count: countOf(classes),
    })),
  });
});

programmesRouter.post("/programmes", async (req, res) => {
  const body = programmeCreate.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
  const slug = slugify(body.data.slug || body.data.title);
  if (!slug) return res.status(400).json({ error: "The title must contain letters or numbers." });
  const { data, error } = await admin
    .from("programmes")
    .insert({ description: "", cover_note: "", is_active: true, ...body.data, slug })
    .select("id")
    .single();
  if (error) {
    const dup = error.code === "23505";
    return res.status(dup ? 409 : 500).json({ error: dup ? "A programme with this title already exists." : "Could not save the programme." });
  }
  res.status(201).json({ id: data.id });
});

programmesRouter.patch("/programmes/:id", async (req, res) => {
  const id = idParam(req.params.id, res, "Programme not found.");
  if (!id) return;
  const body = programmeFields.partial().safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
  const update = { ...body.data, ...(body.data.slug !== undefined ? { slug: slugify(body.data.slug) } : {}) };
  const { data, error } = await admin.from("programmes").update(update).eq("id", id).select("id");
  if (error) {
    const dup = error.code === "23505";
    return res.status(dup ? 409 : 500).json({ error: dup ? "Another programme already uses this slug." : "Could not save the programme." });
  }
  if (!data.length) return res.status(404).json({ error: "Programme not found." });
  res.json({ id });
});

programmesRouter.get("/programmes/:id", async (req, res) => {
  const id = idParam(req.params.id, res, "Programme not found.");
  if (!id) return;
  const { data: programme } = await admin.from("programmes").select("id, title, slug, description, cover_note, is_active, created_at").eq("id", id).maybeSingle();
  if (!programme) return res.status(404).json({ error: "Programme not found." });

  const [students, tutors, classes, assessments] = await Promise.all([
    admin.from("programme_students").select("enrolled_at, student:students!inner(matric_no, profile:profiles!inner(id, full_name, email, status))").eq("programme_id", id),
    admin.from("programme_tutors").select("assigned_at, tutor:tutors!inner(tutor_id, profile:profiles!inner(id, full_name, email, status))").eq("programme_id", id),
    admin.from("classes").select(CLASS_COLUMNS).eq("programme_id", id).order("starts_at"),
    admin.from("assessments").select(`${ASSESSMENT_COLUMNS}, submissions(count)`).eq("programme_id", id).order("created_at", { ascending: false }),
  ]);
  res.json({
    programme,
    students: (students.data ?? [])
      .map((r) => {
        const s = embed<{ matric_no: string; profile: unknown }>(r.student);
        return { ...embed<Person>(s.profile), matric_no: s.matric_no, enrolled_at: r.enrolled_at };
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    tutors: (tutors.data ?? [])
      .map((r) => {
        const t = embed<{ tutor_id: string; profile: unknown }>(r.tutor);
        return { ...embed<Person>(t.profile), tutor_id: t.tutor_id, assigned_at: r.assigned_at };
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    classes: classes.data ?? [],
    assessments: (assessments.data ?? []).map(({ submissions, ...a }) => ({ ...a, submission_count: countOf(submissions) })),
  });
});

/* ---------- Enrolment ---------- */

/** Students not yet in this programme, or tutors not yet teaching it. */
programmesRouter.get("/programmes/:id/candidates", async (req, res) => {
  const id = idParam(req.params.id, res, "Programme not found.");
  if (!id) return;
  const q = z.object({ type: z.enum(["students", "tutors"]), q: z.string().trim().max(100).default("") }).safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: "Invalid request." });

  const role = q.data.type === "students" ? "student" : "tutor";
  const link = q.data.type === "students" ? { table: "programme_students", col: "student_id" } : { table: "programme_tutors", col: "tutor_id" };
  const { data: enrolled } = await admin.from(link.table).select(link.col).eq("programme_id", id);
  const taken = new Set((enrolled ?? []).map((r) => (r as unknown as Record<string, string>)[link.col]));

  let list = admin
    .from("profiles")
    .select("id, full_name, email, status, students(matric_no), tutors(tutor_id)")
    .eq("role", role)
    .neq("status", "suspended")
    .order("full_name")
    .limit(300);
  const term = q.data.q.replace(/[,()*%\\]/g, " ").trim();
  if (term) {
    const ors = [`full_name.ilike.*${term}*`, `email.ilike.*${term}*`];
    const lookup = role === "student" ? { table: "students", col: "matric_no" } : { table: "tutors", col: "tutor_id" };
    const { data: ids } = await admin.from(lookup.table).select("profile_id").ilike(lookup.col, `%${term}%`).limit(200);
    if (ids?.length) ors.push(`id.in.(${ids.map((r) => r.profile_id).join(",")})`);
    list = list.or(ors.join(","));
  }
  const { data, error } = await list;
  if (error) return res.status(500).json({ error: "Could not load people." });
  res.json({
    candidates: data
      .filter((p) => !taken.has(p.id))
      .slice(0, 50)
      .map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        status: p.status,
        matric_no: (p.students as unknown as { matric_no: string } | null)?.matric_no ?? undefined,
        tutor_id: (p.tutors as unknown as { tutor_id: string } | null)?.tutor_id ?? undefined,
      })),
  });
});

const idList = z.array(z.uuid()).min(1, "Choose at least one person.").max(500);

/** Enrols students in a programme. Used by the enrol endpoint and by the student import. */
export async function enrolStudents(programmeId: string, studentIds: string[]) {
  const { data: real } = await admin.from("students").select("profile_id").in("profile_id", studentIds);
  const ids = (real ?? []).map((r) => r.profile_id);
  if (ids.length) {
    const { error } = await admin
      .from("programme_students")
      .upsert(ids.map((student_id) => ({ programme_id: programmeId, student_id })), { onConflict: "programme_id,student_id", ignoreDuplicates: true });
    if (error) return { error: "Could not enrol the students." };
  }
  return { added: ids.length, skipped: studentIds.length - ids.length };
}

programmesRouter.post("/programmes/:id/students", async (req, res) => {
  const id = idParam(req.params.id, res, "Programme not found.");
  if (!id) return;
  const body = z.object({ student_ids: idList }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
  const { data: p } = await admin.from("programmes").select("id").eq("id", id).maybeSingle();
  if (!p) return res.status(404).json({ error: "Programme not found." });
  const result = await enrolStudents(id, [...new Set(body.data.student_ids)]);
  if ("error" in result) return res.status(500).json(result);
  res.json(result);
});

programmesRouter.delete("/programmes/:id/students/:studentId", async (req, res) => {
  const id = idParam(req.params.id, res);
  const sid = id && idParam(req.params.studentId, res);
  if (!id || !sid) return;
  await admin.from("programme_students").delete().eq("programme_id", id).eq("student_id", sid);
  res.json({ removed: true });
});

programmesRouter.post("/programmes/:id/tutors", async (req, res) => {
  const id = idParam(req.params.id, res, "Programme not found.");
  if (!id) return;
  const body = z.object({ tutor_ids: idList }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
  const { data: p } = await admin.from("programmes").select("id").eq("id", id).maybeSingle();
  if (!p) return res.status(404).json({ error: "Programme not found." });
  const ids = [...new Set(body.data.tutor_ids)];
  const { data: real } = await admin.from("tutors").select("profile_id").in("profile_id", ids);
  const valid = (real ?? []).map((r) => r.profile_id);
  if (valid.length) {
    const { error } = await admin
      .from("programme_tutors")
      .upsert(valid.map((tutor_id) => ({ programme_id: id, tutor_id })), { onConflict: "programme_id,tutor_id", ignoreDuplicates: true });
    if (error) return res.status(500).json({ error: "Could not assign the tutors." });
  }
  res.json({ added: valid.length, skipped: ids.length - valid.length });
});

programmesRouter.delete("/programmes/:id/tutors/:tutorId", async (req, res) => {
  const id = idParam(req.params.id, res);
  const tid = id && idParam(req.params.tutorId, res);
  if (!id || !tid) return;
  await admin.from("programme_tutors").delete().eq("programme_id", id).eq("tutor_id", tid);
  res.json({ removed: true });
});

/* ---------- Classes ---------- */

const url = z.union([z.literal(""), z.url("Use a full link starting with https://")]).transform((v) => v || null);
const classFields = z.object({
    title: z.string().trim().min(1, "Title is missing.").max(200),
    description: z.string().trim().max(5000).optional(),
    starts_at: z.iso.datetime({ offset: true, message: "Choose a start time." }),
    ends_at: z.iso.datetime({ offset: true, message: "Choose an end time." }),
    youtube_url: url.optional(),
    recording_url: url.optional(),
    status: z.enum(["scheduled", "live", "ended"]).optional(),
    zoom_url: url.optional(),
    zoom_passcode: z.string().trim().max(100).optional(),
});
const classBody = classFields.refine((c) => new Date(c.ends_at) > new Date(c.starts_at), "The class must end after it starts.");

async function saveZoom(classId: string, zoom_url: string | null | undefined, zoom_passcode: string | undefined) {
  if (zoom_url === undefined && zoom_passcode === undefined) return;
  const patch: Record<string, unknown> = { class_id: classId };
  if (zoom_url !== undefined) patch.zoom_url = zoom_url;
  if (zoom_passcode !== undefined) patch.zoom_passcode = zoom_passcode || null;
  await admin.from("class_tutor_links").upsert(patch, { onConflict: "class_id" });
}

programmesRouter.post("/programmes/:id/classes", async (req, res) => {
  const id = idParam(req.params.id, res, "Programme not found.");
  if (!id) return;
  const body = classBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
  const { zoom_url, zoom_passcode, ...cls } = body.data;
  const { data, error } = await admin.from("classes").insert({ ...cls, programme_id: id }).select("id").single();
  if (error) return res.status(error.code === "23503" ? 404 : 500).json({ error: error.code === "23503" ? "Programme not found." : "Could not create the class." });
  await saveZoom(data.id, zoom_url, zoom_passcode);
  res.status(201).json({ id: data.id });
});

programmesRouter.get("/classes/:id", async (req, res) => {
  const id = idParam(req.params.id, res, "Class not found.");
  if (!id) return;
  const [{ data: cls }, { data: links }] = await Promise.all([
    admin.from("classes").select(`${CLASS_COLUMNS}, programme:programmes(id, title)`).eq("id", id).maybeSingle(),
    admin.from("class_tutor_links").select("zoom_url, zoom_passcode").eq("class_id", id).maybeSingle(),
  ]);
  if (!cls) return res.status(404).json({ error: "Class not found." });
  res.json({ class: { ...cls, zoom_url: links?.zoom_url ?? null, zoom_passcode: links?.zoom_passcode ?? null } });
});

programmesRouter.patch("/classes/:id", async (req, res) => {
  const id = idParam(req.params.id, res, "Class not found.");
  if (!id) return;
  const body = classFields.partial().safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
  const { zoom_url, zoom_passcode, ...cls } = body.data;
  if (Object.keys(cls).length) {
    const { data, error } = await admin.from("classes").update(cls).eq("id", id).select("id");
    if (error) return res.status(400).json({ error: error.code === "23514" ? "The class must end after it starts." : "Could not save the class." });
    if (!data.length) return res.status(404).json({ error: "Class not found." });
  }
  await saveZoom(id, zoom_url, zoom_passcode);
  res.json({ id });
});

programmesRouter.delete("/classes/:id", async (req, res) => {
  const id = idParam(req.params.id, res, "Class not found.");
  if (!id) return;
  await admin.from("classes").delete().eq("id", id);
  res.json({ removed: true });
});
