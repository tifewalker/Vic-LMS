import { admin } from "../supabase.js";
import { isLive } from "./moderation.js";

/**
 * Counts for the sidebar and dashboards. `programmeIds` null means every programme (admins).
 * An empty list means none, and everything is zero.
 */

export type LiveClass = { id: string; title: string; programme_id: string };

export async function liveClasses(programmeIds: string[] | null): Promise<LiveClass[]> {
  if (programmeIds && !programmeIds.length) return [];
  const now = new Date().toISOString();
  // Candidates: marked live, or scheduled and started but not yet ended.
  let q = admin
    .from("classes")
    .select("id, title, programme_id, status, starts_at, ends_at")
    .neq("status", "ended")
    .lte("starts_at", now)
    .order("starts_at", { ascending: false })
    .limit(50);
  if (programmeIds) q = q.in("programme_id", programmeIds);
  const { data } = await q;
  // A class marked live before its start time still counts.
  let early = admin.from("classes").select("id, title, programme_id, status, starts_at, ends_at").eq("status", "live").gt("starts_at", now).limit(20);
  if (programmeIds) early = early.in("programme_id", programmeIds);
  const { data: earlyRows } = await early;
  return [...(data ?? []), ...(earlyRows ?? [])]
    .filter((c) => isLive(c))
    .map(({ id, title, programme_id }) => ({ id, title, programme_id }));
}

/** Open live questions and open question threads, not hidden. */
export async function unansweredCounts(programmeIds: string[] | null): Promise<{ live: number; threads: number }> {
  if (programmeIds && !programmeIds.length) return { live: 0, threads: 0 };
  let live = admin
    .from("live_messages")
    .select("id, class:classes!inner(programme_id)", { count: "exact", head: true })
    .eq("is_question", true)
    .eq("answered", false)
    .eq("hidden", false);
  let threads = admin
    .from("threads")
    .select("id", { count: "exact", head: true })
    .eq("kind", "question")
    .eq("answered", false)
    .eq("hidden", false);
  if (programmeIds) {
    live = live.in("class.programme_id", programmeIds);
    threads = threads.in("programme_id", programmeIds);
  }
  const [a, b] = await Promise.all([live, threads]);
  return { live: a.count ?? 0, threads: b.count ?? 0 };
}

/** Handed-in work waiting for a grade (digital submissions and paper received). */
export async function ungradedCount(programmeIds: string[] | null): Promise<number> {
  if (programmeIds && !programmeIds.length) return 0;
  let q = admin
    .from("submissions")
    .select("id, assessment:assessments!inner(programme_id)", { count: "exact", head: true })
    .in("status", ["submitted", "late", "received_paper"]);
  if (programmeIds) q = q.in("assessment.programme_id", programmeIds);
  const { count } = await q;
  return count ?? 0;
}

/** Published assessments still open for this student and not yet handed in. */
export async function dueCount(studentId: string, programmeIds: string[]): Promise<number> {
  if (!programmeIds.length) return 0;
  const [{ data: open }, { data: mine }] = await Promise.all([
    admin
      .from("assessments")
      .select("id")
      .in("programme_id", programmeIds)
      .eq("published", true)
      .eq("mode", "digital")
      .gt("due_at", new Date().toISOString()),
    admin.from("submissions").select("assessment_id").eq("student_id", studentId),
  ]);
  const done = new Set((mine ?? []).map((s) => s.assessment_id));
  return (open ?? []).filter((a) => !done.has(a.id)).length;
}

export async function tutorProgrammeIds(tutorId: string) {
  const { data } = await admin.from("programme_tutors").select("programme_id").eq("tutor_id", tutorId);
  return (data ?? []).map((r) => r.programme_id);
}
export async function studentProgrammeIds(studentId: string) {
  const { data } = await admin.from("programme_students").select("programme_id").eq("student_id", studentId);
  return (data ?? []).map((r) => r.programme_id);
}
