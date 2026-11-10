"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Notice, PageTitle } from "@/components/platform/ui";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatDateTime } from "@/lib/dates";
import { submissionLabel, type Assessment } from "@/lib/types";
import { openFile } from "@/lib/upload";

type Row = {
  student_id: string;
  full_name: string;
  matric_no: string;
  submission: {
    id: string;
    text: string | null;
    link: string | null;
    has_file: boolean;
    status: string;
    submitted_at: string;
    grade: { score: number; feedback: string; released: boolean; graded_at: string } | null;
  } | null;
};
type Data = { assessment: Assessment; programme: { id: string; title: string }; rows: Row[] };

function TutorAssessment() {
  const id = useSearchParams().get("id") ?? "";
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(id ? "" : "No assessment was chosen.");
  const [notice, setNotice] = useState("");
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (!id) return;
    api<Data>(`/tutor/assessments/${encodeURIComponent(id)}`).then((res) => (res.ok ? setData(res.data) : setError(res.error)));
  }, [id, reloadKey]);

  if (error && !data) return <Notice tone="error">{error}</Notice>;
  if (!data) return <p className="text-ink-muted">Loading…</p>;
  const a = data.assessment;
  const graded = data.rows.filter((r) => r.submission?.grade);
  const unreleased = graded.filter((r) => !r.submission!.grade!.released).length;
  const submitted = data.rows.filter((r) => r.submission).length;

  async function release() {
    const res = await api<{ released: number }>(`/tutor/assessments/${id}/release`, { method: "POST" });
    setNotice(res.ok ? `Released ${res.data.released} grade${res.data.released === 1 ? "" : "s"}. Students can now see their score and feedback.` : res.error);
    reload();
  }
  async function setPublished(published: boolean) {
    const res = await api(`/tutor/assessments/${id}`, { method: "PATCH", body: { published } });
    setNotice(res.ok ? (published ? "Published. Students can see it now." : "Moved back to draft.") : res.error);
    reload();
  }
  async function paper(r: Row, received: boolean) {
    const res = await api(`/tutor/assessments/${id}/paper`, { body: { student_id: r.student_id, received } });
    if (!res.ok) setError(res.error);
    reload();
  }

  return (
    <>
      <PageTitle kicker={data.programme.title} title={a.title}>
        <Button variant="secondary" onClick={() => setPublished(!a.published)}>
          {a.published ? "Move to draft" : "Publish"}
        </Button>
        <Button onClick={release} disabled={unreleased === 0}>
          {unreleased ? `Release grades (${unreleased})` : "All grades released"}
        </Button>
      </PageTitle>

      <dl className="mt-6 grid max-w-4xl border-t border-line text-[0.9375rem] sm:grid-cols-4 sm:gap-x-8">
        {[
          ["Status", a.published ? "Published" : "Draft"],
          ["Due", a.due_at ? formatDateTime(a.due_at) : "No deadline"],
          ["Hand in", a.mode === "paper" ? "On paper" : "Online"],
          ["Progress", `${submitted} in, ${graded.length} graded`],
        ].map(([k, v]) => (
          <div key={k} className="border-b border-line py-3">
            <dt className="text-sm text-ink-muted">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {a.instructions ? <p className="mt-5 max-w-measure whitespace-pre-wrap">{a.instructions}</p> : null}
      {a.attachment_path ? (
        <p className="mt-3">
          <Button variant="quiet" onClick={async () => setError((await openFile(`/tutor/assessments/${id}/attachment`)) ?? "")}>
            Download the brief
          </Button>
        </p>
      ) : null}

      <div className="mt-6 space-y-3">
        {notice ? <Notice tone="success">{notice}</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
      </div>

      <h2 className="mt-8 text-2xl">Submissions</h2>
      <div className="relative mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-[0.9375rem]">
          <thead>
            <tr className="border-y border-line text-sm text-ink-muted">
              <th className="py-2.5 pr-4 font-semibold">Student</th>
              <th className="py-2.5 pr-4 font-semibold">Status</th>
              <th className="py-2.5 pr-4 font-semibold">Work</th>
              <th className="py-2.5 pr-4 font-semibold">Grade</th>
              <th className="py-2.5 font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const s = r.submission;
              const late = s && a.due_at && s.status !== "received_paper" && new Date(s.submitted_at) > new Date(a.due_at);
              return (
                <tr key={r.student_id} className="border-b border-line align-top">
                  <td className="py-3 pr-4">
                    <span className="block">{r.full_name}</span>
                    <span className="block text-sm text-ink-muted tabular-nums">{r.matric_no}</span>
                  </td>
                  <td className="py-3 pr-4">
                    {s ? (
                      <>
                        <span className={cx("block", s.status === "late" || late ? "text-accent-strong" : "")}>
                          {s.status === "graded" && late ? "Late, graded" : submissionLabel[s.status]}
                        </span>
                        {s.status !== "received_paper" ? <span className="block text-sm text-ink-muted">{formatDateTime(s.submitted_at)}</span> : null}
                      </>
                    ) : (
                      <span className="text-ink-muted">{a.mode === "paper" ? "Not received" : "Not submitted"}</span>
                    )}
                    {a.mode === "paper" && s?.status !== "graded" ? (
                      <label className="mt-1.5 flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={s?.status === "received_paper"}
                          onChange={(e) => paper(r, e.target.checked)}
                          className="size-4 accent-[var(--accent)]"
                        />
                        Paper received
                      </label>
                    ) : null}
                  </td>
                  <td className="max-w-xs py-3 pr-4 text-sm">
                    {s?.text ? <p className="line-clamp-3 whitespace-pre-wrap">{s.text}</p> : null}
                    {s?.has_file ? (
                      <Button variant="quiet" onClick={async () => setError((await openFile(`/tutor/submissions/${s.id}/file`)) ?? "")}>
                        Download file
                      </Button>
                    ) : null}
                    {!s?.text && !s?.has_file ? <span className="text-ink-muted">None</span> : null}
                  </td>
                  <td className="py-3 pr-4">
                    {s?.grade ? (
                      <>
                        <span className="block tabular-nums">
                          {Number(s.grade.score)} / {Number(a.max_score)}
                        </span>
                        <span className="block text-sm text-ink-muted">{s.grade.released ? "Released" : "Not released"}</span>
                      </>
                    ) : (
                      <span className="text-ink-muted">Not graded</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    {s || a.mode === "paper" ? (
                      <Button variant="quiet" onClick={() => setGradingId(gradingId === r.student_id ? null : r.student_id)}>
                        {gradingId === r.student_id ? "Close" : s?.grade ? "Edit grade" : "Grade"}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-ink-muted">
                  No students are enrolled in this programme yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {gradingId ? (
        <GradeForm
          key={gradingId}
          assessmentId={id}
          maxScore={Number(a.max_score)}
          row={data.rows.find((r) => r.student_id === gradingId)!}
          onSaved={(name) => {
            setGradingId(null);
            setNotice(`Grade saved for ${name}. It stays hidden from the student until you release grades.`);
            reload();
          }}
        />
      ) : null}
    </>
  );
}

function GradeForm({ assessmentId, maxScore, row, onSaved }: { assessmentId: string; maxScore: number; row: Row; onSaved: (name: string) => void }) {
  const [score, setScore] = useState(row.submission?.grade ? String(Number(row.submission.grade.score)) : "");
  const [feedback, setFeedback] = useState(row.submission?.grade?.feedback ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await api(`/tutor/assessments/${assessmentId}/grade`, { body: { student_id: row.student_id, score: Number(score), feedback } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onSaved(row.full_name);
  }

  return (
    <form onSubmit={save} className="mt-6 max-w-xl space-y-4 border border-line p-5" aria-label={`Grade ${row.full_name}`}>
      <h3 className="text-xl">Grade: {row.full_name}</h3>
      {row.submission?.text ? <p className="max-h-60 overflow-y-auto border-l-2 border-line pl-3 whitespace-pre-wrap">{row.submission.text}</p> : null}
      <label className="block max-w-40">
        <span className="block text-[0.9375rem] font-semibold">Score (out of {maxScore})</span>
        <input
          type="number"
          min={0}
          max={maxScore}
          step="0.5"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="mt-1.5 block w-full rounded-sm border border-line bg-white px-3 py-2 text-base tabular-nums"
        />
      </label>
      <label className="block">
        <span className="block text-[0.9375rem] font-semibold">Feedback</span>
        <textarea
          rows={4}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="mt-1.5 block w-full rounded-sm border border-line bg-white px-3 py-2.5 text-base"
        />
      </label>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="submit" disabled={busy || score === ""}>
        {busy ? "Saving…" : "Save grade"}
      </Button>
    </form>
  );
}

export default function TutorAssessmentPage() {
  return (
    <Suspense>
      <TutorAssessment />
    </Suspense>
  );
}
