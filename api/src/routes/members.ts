import { Router } from "express";
import { z } from "zod";
import { embed, one } from "../lib/invites.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { admin } from "../supabase.js";

type Count = { count: number }[];
type Person = { id: string; full_name: string; email: string; status: string };

/* Tutor: my batches and their rosters. The API checks assignment on every request. */
export const tutorRouter = Router();
tutorRouter.use(requireAuth, requireRole("tutor"));

tutorRouter.get("/batches", async (req, res) => {
  const { data, error } = await admin
    .from("batch_tutors")
    .select(
      "batch:batches!inner(id, name, start_date, end_date, status, programme:programmes(name, duration_weeks), batch_students(count))",
    )
    .eq("tutor_id", req.profile!.id);
  if (error) return res.status(500).json({ error: "Could not load your batches." });

  type Row = { id: string; name: string; start_date: string; end_date: string; status: string; programme: unknown; batch_students: Count };
  const batches = data
    .map((r) => {
      const b = embed<Row>(r.batch);
      return {
        id: b.id,
        name: b.name,
        start_date: b.start_date,
        end_date: b.end_date,
        status: b.status,
        programme: one(b.programme as { name: string; duration_weeks: number } | null),
        student_count: one(b.batch_students)?.count ?? 0,
      };
    })
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
  res.json({ batches });
});

tutorRouter.get("/batches/:id/students", async (req, res) => {
  const id = z.uuid().safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ error: "Batch not found." });

  const { data: assigned } = await admin
    .from("batch_tutors")
    .select("batch:batches!inner(id, name, start_date, end_date, status, programme:programmes(name))")
    .eq("batch_id", id.data)
    .eq("tutor_id", req.profile!.id)
    .maybeSingle();
  if (!assigned) return res.status(404).json({ error: "Batch not found." });

  const { data, error } = await admin
    .from("batch_students")
    .select("student:students!inner(matric_no, profile:profiles!inner(id, full_name, email, status))")
    .eq("batch_id", id.data);
  if (error) return res.status(500).json({ error: "Could not load the students." });

  const batch = embed<{ programme: unknown } & Record<string, unknown>>(assigned.batch);
  res.json({
    batch: { ...batch, programme: one(batch.programme as { name: string } | null) },
    students: data
      .map((r) => {
        const s = embed<{ matric_no: string; profile: unknown }>(r.student);
        return { ...embed<Person>(s.profile), matric_no: s.matric_no };
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
  });
});

/* Student: my programme, batch and tutors. */
export const studentRouter = Router();
studentRouter.use(requireAuth, requireRole("student"));

studentRouter.get("/overview", async (req, res) => {
  const { data, error } = await admin
    .from("batch_students")
    .select(
      "joined_at, batch:batches!inner(id, name, start_date, end_date, status, programme:programmes!inner(id, name, description, duration_weeks, training_areas(title, position)))",
    )
    .eq("student_id", req.profile!.id)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return res.status(500).json({ error: "Could not load your programme." });
  if (!data) return res.json({ batch: null, programme: null, tutors: [] });

  type Programme = { id: string; name: string; description: string; duration_weeks: number; training_areas: { title: string; position: number }[] };
  const { programme: rawProgramme, ...batch } = embed<{ id: string; programme: unknown } & Record<string, unknown>>(data.batch);
  const programme = embed<Programme>(rawProgramme);

  const { data: tutors } = await admin
    .from("batch_tutors")
    .select("tutor:tutors!inner(profile:profiles!inner(full_name))")
    .eq("batch_id", batch.id);

  res.json({
    batch,
    programme: { ...programme, training_areas: [...(programme.training_areas ?? [])].sort((a, b) => a.position - b.position) },
    tutors: (tutors ?? [])
      .map((t) => embed<{ full_name: string }>(embed<{ profile: unknown }>(t.tutor).profile).full_name)
      .sort(),
  });
});
