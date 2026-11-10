"use client";

import { formatDateTime } from "@/lib/dates";
import type { Assessment, ClassItem } from "@/lib/types";

/** Assessments for a programme; each opens the submissions and grading page. */
export function AssessmentTable({ items, classes }: { items: Assessment[]; classes: ClassItem[] }) {
  const classTitle = (cid: string | null) => (cid ? (classes.find((c) => c.id === cid)?.title ?? "A class") : "Whole programme");
  return (
    <div className="relative mt-4 overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-[0.9375rem]">
        <thead>
          <tr className="border-y border-line text-sm text-ink-muted">
            <th className="py-2.5 pr-4 font-semibold">Assessment</th>
            <th className="py-2.5 pr-4 font-semibold">Due</th>
            <th className="py-2.5 pr-4 font-semibold">Mode</th>
            <th className="py-2.5 font-semibold">Submissions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id} className="border-b border-line align-top">
              <td className="py-3 pr-4">
                <a href={`/tutor/assessment/?id=${a.id}`} className="font-semibold text-accent-strong hover:underline">
                  {a.title}
                </a>
                <span className="block text-sm text-ink-muted">
                  {classTitle(a.class_id)}
                  {a.published ? "" : " · Draft"}
                </span>
              </td>
              <td className="py-3 pr-4">{a.due_at ? formatDateTime(a.due_at) : "No deadline"}</td>
              <td className="py-3 pr-4">{a.mode === "paper" ? "Paper" : "Online"}</td>
              <td className="py-3 tabular-nums">{a.submission_count ?? 0}</td>
            </tr>
          ))}
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-ink-muted">
                No assessments yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
