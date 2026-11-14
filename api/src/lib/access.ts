import type { Response } from "express";
import { z } from "zod";
import { admin, type Profile } from "../supabase.js";

/** How the signed-in user relates to a programme. Admins can do everything a tutor can. */
export type ProgrammeAccess = "admin" | "tutor" | "student";

export const isAdmin = (p: Profile) => p.role === "admin" || p.role === "super_admin";

export async function programmeAccess(profile: Profile, programmeId: string): Promise<ProgrammeAccess | null> {
  if (isAdmin(profile)) return "admin";
  if (profile.role === "tutor") {
    const { data } = await admin.from("programme_tutors").select("tutor_id").eq("programme_id", programmeId).eq("tutor_id", profile.id).maybeSingle();
    return data ? "tutor" : null;
  }
  if (profile.role === "student") {
    const { data } = await admin.from("programme_students").select("student_id").eq("programme_id", programmeId).eq("student_id", profile.id).maybeSingle();
    return data ? "student" : null;
  }
  return null;
}

/** True for admins and the programme's tutors. */
export const canTeach = (a: ProgrammeAccess | null) => a === "admin" || a === "tutor";

export const uuid = z.uuid();

/** Parses an id route param, or replies 404. */
export function idParam(raw: unknown, res: Response, what = "Not found."): string | null {
  const id = uuid.safeParse(raw);
  if (!id.success) {
    res.status(404).json({ error: what });
    return null;
  }
  return id.data;
}

export const zodMessage = (e: z.ZodError) => e.issues.map((i) => i.message).join(" ");

/** Columns of `classes` that are safe for everyone. Zoom details live in class_tutor_links. */
export const CLASS_COLUMNS = "id, programme_id, title, description, starts_at, ends_at, youtube_url, recording_url, status, created_at";

export const ASSESSMENT_COLUMNS =
  "id, programme_id, class_id, title, instructions, attachment_path, due_at, max_score, mode, published, created_at";

/** Display names for everyone enrolled in a programme, for discussion and live Q&A authors. */
export async function programmePeople(programmeId: string): Promise<Record<string, { full_name: string; role: string }>> {
  const [students, tutors] = await Promise.all([
    admin.from("programme_students").select("student_id, student:students!inner(profile:profiles!inner(full_name))").eq("programme_id", programmeId),
    admin.from("programme_tutors").select("tutor_id, tutor:tutors!inner(profile:profiles!inner(full_name))").eq("programme_id", programmeId),
  ]);
  const people: Record<string, { full_name: string; role: string }> = {};
  const name = (v: unknown) => {
    const outer = (Array.isArray(v) ? v[0] : v) as { profile: unknown };
    const p = (Array.isArray(outer?.profile) ? outer.profile[0] : outer?.profile) as { full_name: string } | undefined;
    return p?.full_name ?? "";
  };
  for (const r of students.data ?? []) people[r.student_id] = { full_name: name(r.student), role: "student" };
  for (const r of tutors.data ?? []) people[r.tutor_id] = { full_name: name(r.tutor), role: "tutor" };
  return people;
}
