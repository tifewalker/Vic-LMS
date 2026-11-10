import { Router } from "express";
import { z } from "zod";
import { one } from "../lib/invites.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { admin } from "../supabase.js";

/** Admin: programmes, batches and batch membership. Mounted at /admin. */
export const batchesRouter = Router();
batchesRouter.use(requireAuth, requireRole("admin", "super_admin"));

const issues = (e: z.ZodError) => e.issues.map((i) => i.message).join(" ");
const uuid = z.uuid();
const date = z.iso.date("Use a valid date.");

/* ---------- Programmes ---------- */

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const programmeBody = z.object({
  name: z.string().trim().min(1, "Name is missing.").max(200),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(2000).default(""),
  duration_weeks: z.coerce.number().int().min(1, "Duration must be at least 1 week.").max(260),
  is_active: z.boolean().default(true),
  training_areas: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
});

async function saveAreas(programmeId: string, areas: string[] | undefined) {
  if (!areas) return null;
  const del = await admin.from("training_areas").delete().eq("programme_id", programmeId);
  if (del.error) return del.error;
  if (!areas.length) return null;
  const ins = await admin
    .from("training_areas")
    .insert(areas.map((title, i) => ({ programme_id: programmeId, title, position: i + 1 })));
  return ins.error;
}

batchesRouter.get("/programmes", async (_req, res) => {
  const { data, error } = await admin
    .from("programmes")
    .select("id, name, slug, description, duration_weeks, is_active, created_at, training_areas(id, title, position), batches(count)")
    .order("created_at", { ascending: true });
  if (error) return res.status(500).json({ error: "Could not load programmes." });
  res.json({
    programmes: data.map((p) => ({
      ...p,
      training_areas: [...(p.training_areas ?? [])].sort((a, b) => a.position - b.position),
      batch_count: (one(p.batches as unknown as { count: number }[]) ?? { count: 0 }).count,
      batches: undefined,
    })),
  });
});

batchesRouter.post("/programmes", async (req, res) => {
  const body = programmeBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: issues(body.error) });
  const { training_areas, ...p } = body.data;
  const slug = slugify(p.slug || p.name);
  if (!slug) return res.status(400).json({ error: "Name must contain letters or numbers." });
  const { data, error } = await admin.from("programmes").insert({ ...p, slug }).select("id").single();
  if (error) {
    return res.status(error.code === "23505" ? 409 : 500).json({
      error: error.code === "23505" ? "A programme with this name or slug already exists." : "Could not save the programme.",
    });
  }
  const areaErr = await saveAreas(data.id, training_areas);
  if (areaErr) return res.status(500).json({ error: "Programme saved, but the training areas could not be saved." });
  res.status(201).json({ id: data.id });
});

batchesRouter.patch("/programmes/:id", async (req, res) => {
  const id = uuid.safeParse(req.params.id);
  const body = programmeBody.partial().safeParse(req.body);
  if (!id.success) return res.status(404).json({ error: "Programme not found." });
  if (!body.success) return res.status(400).json({ error: issues(body.error) });
  const { training_areas, ...p } = body.data;
  const update: Record<string, unknown> = { ...p };
  if (p.slug !== undefined) update.slug = slugify(p.slug);
  if (Object.keys(update).length) {
    const { data, error } = await admin.from("programmes").update(update).eq("id", id.data).select("id");
    if (error) {
      return res.status(error.code === "23505" ? 409 : 500).json({
        error: error.code === "23505" ? "A programme with this slug already exists." : "Could not save the programme.",
      });
    }
    if (!data.length) return res.status(404).json({ error: "Programme not found." });
  }
  const areaErr = await saveAreas(id.data, training_areas);
  if (areaErr) return res.status(500).json({ error: "Could not save the training areas." });
  res.json({ id: id.data });
});

/* ---------- Batches ---------- */

const statusEnum = z.enum(["planned", "active", "completed"]);
const batchBody = z
  .object({
    programme_id: uuid,
    name: z.string().trim().min(1, "Name is missing.").max(120),
    start_date: date,
    end_date: date,
    status: statusEnum.default("planned"),
  })
  .refine((b) => b.end_date >= b.start_date, "The end date must be on or after the start date.");

const batchSelect =
  "id, programme_id, name, start_date, end_date, status, created_at, programme:programmes(id, name, duration_weeks), batch_students(count), batch_tutors(count)";

type BatchRow = Record<string, unknown> & { batch_students: unknown; batch_tutors: unknown; programme: unknown };
const shapeBatch = (b: BatchRow) => ({
  ...b,
  programme: one(b.programme as never),
  student_count: (one(b.batch_students as { count: number }[]) ?? { count: 0 }).count,
  tutor_count: (one(b.batch_tutors as { count: number }[]) ?? { count: 0 }).count,
  batch_students: undefined,
  batch_tutors: undefined,
});

batchesRouter.get("/batches", async (req, res) => {
  const q = z
    .object({ programme_id: uuid.optional(), status: statusEnum.optional() })
    .safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: "Invalid filters." });
  let list = admin.from("batches").select(batchSelect).order("start_date", { ascending: false });
  if (q.data.programme_id) list = list.eq("programme_id", q.data.programme_id);
  if (q.data.status) list = list.eq("status", q.data.status);
  const { data, error } = await list;
  if (error) return res.status(500).json({ error: "Could not load batches." });
  res.json({ batches: data.map((b) => shapeBatch(b as BatchRow)) });
});

batchesRouter.post("/batches", async (req, res) => {
  const body = batchBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: issues(body.error) });
  const { data, error } = await admin.from("batches").insert(body.data).select("id").single();
  if (error) {
    return res.status(error.code === "23503" ? 400 : 500).json({
      error: error.code === "23503" ? "That programme does not exist." : "Could not create the batch.",
    });
  }
  res.status(201).json({ id: data.id });
});

batchesRouter.get("/batches/:id", async (req, res) => {
  const id = uuid.safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ error: "Batch not found." });
  const { data: batch } = await admin.from("batches").select(batchSelect).eq("id", id.data).maybeSingle();
  if (!batch) return res.status(404).json({ error: "Batch not found." });

  const [students, tutors] = await Promise.all([
    admin
      .from("batch_students")
      .select("joined_at, student:students!inner(matric_no, profile:profiles!inner(id, full_name, email, status))")
      .eq("batch_id", id.data),
    admin
      .from("batch_tutors")
      .select("assigned_at, tutor:tutors!inner(tutor_id, profile:profiles!inner(id, full_name, email, status))")
      .eq("batch_id", id.data),
  ]);
  if (students.error || tutors.error) return res.status(500).json({ error: "Could not load the batch." });

  type Person = { id: string; full_name: string; email: string; status: string };
  const people = <T extends { profile: unknown }>(row: T) => one(row.profile as Person | Person[])!;

  res.json({
    batch: shapeBatch(batch as BatchRow),
    students: students.data
      .map((r) => {
        const s = one(r.student as unknown as { matric_no: string; profile: unknown })!;
        return { ...people(s), matric_no: s.matric_no, joined_at: r.joined_at };
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    tutors: tutors.data
      .map((r) => {
        const t = one(r.tutor as unknown as { tutor_id: string; profile: unknown })!;
        return { ...people(t), tutor_id: t.tutor_id, assigned_at: r.assigned_at };
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
  });
});

batchesRouter.patch("/batches/:id", async (req, res) => {
  const id = uuid.safeParse(req.params.id);
  const body = z
    .object({
      name: z.string().trim().min(1, "Name is missing.").max(120).optional(),
      start_date: date.optional(),
      end_date: date.optional(),
      status: statusEnum.optional(),
    })
    .safeParse(req.body);
  if (!id.success) return res.status(404).json({ error: "Batch not found." });
  if (!body.success) return res.status(400).json({ error: issues(body.error) });
  const { data, error } = await admin.from("batches").update(body.data).eq("id", id.data).select("id");
  if (error) {
    return res.status(error.code === "23514" ? 400 : 500).json({
      error: error.code === "23514" ? "The end date must be on or after the start date." : "Could not save the batch.",
    });
  }
  if (!data.length) return res.status(404).json({ error: "Batch not found." });
  res.json({ id: id.data });
});

/** Students who are not in any batch of this batch's programme, or tutors not in this batch. */
batchesRouter.get("/batches/:id/candidates", async (req, res) => {
  const id = uuid.safeParse(req.params.id);
  const q = z
    .object({ type: z.enum(["students", "tutors"]), q: z.string().trim().max(100).default("") })
    .safeParse(req.query);
  if (!id.success || !q.success) return res.status(400).json({ error: "Invalid request." });
  const { data: batch } = await admin.from("batches").select("programme_id").eq("id", id.data).maybeSingle();
  if (!batch) return res.status(404).json({ error: "Batch not found." });

  if (q.data.type === "students") {
    const { data, error } = await admin.rpc("available_students", {
      p_programme: batch.programme_id,
      p_q: q.data.q,
      p_limit: 50,
    });
    if (error) return res.status(500).json({ error: "Could not load students." });
    return res.json({ candidates: data });
  }

  const { data: assigned } = await admin.from("batch_tutors").select("tutor_id").eq("batch_id", id.data);
  const taken = new Set((assigned ?? []).map((r) => r.tutor_id));
  let list = admin
    .from("profiles")
    .select("id, full_name, email, status, tutors!inner(tutor_id)")
    .eq("role", "tutor")
    .neq("status", "suspended")
    .order("full_name")
    .limit(100);
  const term = q.data.q.replace(/[,()*%\\]/g, " ").trim();
  if (term) list = list.or(`full_name.ilike.*${term}*,email.ilike.*${term}*`);
  const { data, error } = await list;
  if (error) return res.status(500).json({ error: "Could not load tutors." });
  res.json({
    candidates: data
      .filter((t) => !taken.has(t.id))
      .map((t) => ({ id: t.id, full_name: t.full_name, email: t.email, status: t.status, tutor_id: one(t.tutors as never as { tutor_id: string }[])?.tutor_id })),
  });
});

const idList = z.array(uuid).min(1, "Choose at least one person.").max(500);
const studentIdsBody = z.object({ student_ids: idList });
const tutorIdsBody = z.object({ tutor_ids: idList });

/** Adds students to a batch. Returns added and skipped (already in a batch for this programme). */
export async function addStudentsToBatch(batchId: string, studentIds: string[]) {
  const { data: batch } = await admin.from("batches").select("programme_id").eq("id", batchId).maybeSingle();
  if (!batch) return { error: "Batch not found." as const };

  const { data: students } = await admin.from("students").select("profile_id").in("profile_id", studentIds);
  const real = new Set((students ?? []).map((s) => s.profile_id));
  const { data: existing } = await admin
    .from("batch_students")
    .select("student_id")
    .eq("programme_id", batch.programme_id)
    .in("student_id", [...real]);
  const placed = new Set((existing ?? []).map((r) => r.student_id));
  const toAdd = [...real].filter((s) => !placed.has(s));

  if (toAdd.length) {
    const { error } = await admin.from("batch_students").upsert(
      toAdd.map((student_id) => ({ batch_id: batchId, programme_id: batch.programme_id, student_id })),
      { onConflict: "programme_id,student_id", ignoreDuplicates: true },
    );
    if (error) return { error: "Could not add the students." as const };
  }
  return {
    added: toAdd.length,
    skipped: studentIds.length - toAdd.length,
  };
}

batchesRouter.post("/batches/:id/students", async (req, res) => {
  const id = uuid.safeParse(req.params.id);
  const body = studentIdsBody.safeParse(req.body);
  if (!id.success) return res.status(404).json({ error: "Batch not found." });
  if (!body.success) return res.status(400).json({ error: issues(body.error) });
  const result = await addStudentsToBatch(id.data, [...new Set(body.data.student_ids)]);
  if ("error" in result) return res.status(result.error === "Batch not found." ? 404 : 500).json(result);
  res.json(result);
});

batchesRouter.delete("/batches/:id/students/:studentId", async (req, res) => {
  const id = uuid.safeParse(req.params.id);
  const sid = uuid.safeParse(req.params.studentId);
  if (!id.success || !sid.success) return res.status(404).json({ error: "Not found." });
  const { error } = await admin.from("batch_students").delete().eq("batch_id", id.data).eq("student_id", sid.data);
  if (error) return res.status(500).json({ error: "Could not remove the student." });
  res.json({ removed: true });
});

batchesRouter.post("/batches/:id/tutors", async (req, res) => {
  const id = uuid.safeParse(req.params.id);
  const body = tutorIdsBody.safeParse(req.body);
  if (!id.success) return res.status(404).json({ error: "Batch not found." });
  if (!body.success) return res.status(400).json({ error: issues(body.error) });
  const { data: batch } = await admin.from("batches").select("id").eq("id", id.data).maybeSingle();
  if (!batch) return res.status(404).json({ error: "Batch not found." });

  const ids = [...new Set(body.data.tutor_ids)];
  const { data: tutors } = await admin.from("tutors").select("profile_id").in("profile_id", ids);
  const real = (tutors ?? []).map((t) => t.profile_id);
  if (real.length) {
    const { error } = await admin
      .from("batch_tutors")
      .upsert(real.map((tutor_id) => ({ batch_id: id.data, tutor_id })), { onConflict: "batch_id,tutor_id", ignoreDuplicates: true });
    if (error) return res.status(500).json({ error: "Could not assign the tutors." });
  }
  res.json({ added: real.length, skipped: ids.length - real.length });
});

batchesRouter.delete("/batches/:id/tutors/:tutorId", async (req, res) => {
  const id = uuid.safeParse(req.params.id);
  const tid = uuid.safeParse(req.params.tutorId);
  if (!id.success || !tid.success) return res.status(404).json({ error: "Not found." });
  const { error } = await admin.from("batch_tutors").delete().eq("batch_id", id.data).eq("tutor_id", tid.data);
  if (error) return res.status(500).json({ error: "Could not remove the tutor." });
  res.json({ removed: true });
});
