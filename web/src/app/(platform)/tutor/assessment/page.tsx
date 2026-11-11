"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextArea, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { PageHeader, SectionTitle } from "@/components/ui/PageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { Stats } from "@/components/ui/Stats";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import type { Assessment } from "@/lib/types";
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
  const toast = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(id ? "" : "No assessment was chosen.");
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (!id) return;
    api<Data>(`/tutor/assessments/${encodeURIComponent(id)}`).then((res) => (res.ok ? setData(res.data) : setError(res.error)));
  }, [id, reloadKey]);

  useEffect(() => {
    if (gradingId) formRef.current?.scrollIntoView({ block: "nearest" });
  }, [gradingId]);

  if (error && !data) return <Notice tone="error">{error}</Notice>;
  if (!data) return <SkeletonPage />;
  const a = data.assessment;
  const graded = data.rows.filter((r) => r.submission?.grade);
  const unreleased = graded.filter((r) => !r.submission!.grade!.released).length;
  const submitted = data.rows.filter((r) => r.submission).length;

  async function release() {
    const ok = await confirm({
      title: `Release ${unreleased} grade${unreleased === 1 ? "" : "s"}?`,
      body: "Students will see their score and feedback straight away.",
      confirmLabel: "Release grades",
    });
    if (!ok) return;
    const res = await api<{ released: number }>(`/tutor/assessments/${id}/release`, { method: "POST" });
    toast(res.ok ? `Released ${res.data.released} grade${res.data.released === 1 ? "" : "s"}.` : res.error, res.ok ? "success" : "error");
    reload();
  }
  async function setPublished(published: boolean) {
    const res = await api(`/tutor/assessments/${id}`, { method: "PATCH", body: { published } });
    toast(res.ok ? (published ? "Published. Students can see it now." : "Moved back to draft.") : res.error, res.ok ? "success" : "error");
    reload();
  }
  async function paper(r: Row, received: boolean) {
    const res = await api(`/tutor/assessments/${id}/paper`, { body: { student_id: r.student_id, received } });
    if (res.ok) toast(received ? `Paper received from ${r.full_name}.` : `Marked as not received.`);
    else toast(res.error, "error");
    reload();
  }
  async function download(subId: string) {
    const problem = await openFile(`/tutor/submissions/${subId}/file`);
    if (problem) toast(problem, "error");
  }

  const statusOf = (r: Row) => (r.submission ? r.submission.status : "not_submitted");

  return (
    <>
      <PageHeader
        kicker={data.programme.title}
        title={a.title}
        meta={
          <>
            <StatusLabel status={a.published ? "published" : "draft"} />
            <span>{a.due_at ? `Due ${formatDateTime(a.due_at)}` : "No deadline"}</span>
            <span>{a.mode === "paper" ? "Handed in on paper" : "Handed in online"}</span>
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setPublished(!a.published)}>
              {a.published ? "Move to draft" : "Publish"}
            </Button>
            <Button onClick={release} disabled={unreleased === 0}>
              {unreleased ? `Release grades (${unreleased})` : "All grades released"}
            </Button>
          </>
        }
      />

      {a.instructions || a.attachment_path ? (
        <div className="mt-6 max-w-measure space-y-3">
          {a.instructions ? <p className="whitespace-pre-wrap">{a.instructions}</p> : null}
          {a.attachment_path ? (
            <Button variant="quiet" onClick={async () => { const p = await openFile(`/tutor/assessments/${id}/attachment`); if (p) toast(p, "error"); }}>
              Download the brief
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8">
        <Stats
          label="Progress"
          items={[
            { label: "Students", value: data.rows.length },
            { label: a.mode === "paper" ? "Received" : "Submitted", value: submitted },
            { label: "Graded", value: graded.length },
            { label: "Out of", value: Number(a.max_score) },
          ]}
        />
      </div>

      <section className="mt-12" aria-labelledby="subs-title">
        <SectionTitle id="subs-title">Submissions</SectionTitle>
        <div className="mt-4">
          <DataTable
            caption="Submissions"
            rows={data.rows}
            rowKey={(r) => r.student_id}
            onRowClick={(r) => (r.submission || a.mode === "paper" ? setGradingId(r.student_id) : undefined)}
            empty={<EmptyState title="No students enrolled yet." text="Students enrolled in the programme appear here." />}
            columns={[
              {
                key: "student",
                header: "Student",
                primary: true,
                cell: (r) => (
                  <>
                    <span className="block font-semibold">{r.full_name}</span>
                    <span className="block text-ui-xs text-ink-muted tabular-nums">{r.matric_no}</span>
                  </>
                ),
              },
              {
                key: "status",
                header: "Status",
                cell: (r) => (
                  <span className="inline-flex flex-col items-end gap-1 md:items-start">
                    <StatusLabel status={statusOf(r)} label={statusOf(r) === "not_submitted" && a.mode === "paper" ? "Not received" : undefined} />
                    {r.submission && r.submission.status !== "received_paper" ? <span className="text-ui-xs text-ink-muted">{formatDateTime(r.submission.submitted_at)}</span> : null}
                    {a.mode === "paper" && r.submission?.status !== "graded" ? (
                      <label className="flex cursor-pointer items-center gap-2 text-ui-xs">
                        <input type="checkbox" checked={r.submission?.status === "received_paper"} onChange={(e) => paper(r, e.target.checked)} className="size-4 cursor-pointer accent-[var(--accent)]" />
                        Paper received
                      </label>
                    ) : null}
                  </span>
                ),
              },
              {
                key: "work",
                header: "Work",
                className: "max-w-xs",
                cell: (r) => (
                  <span className="inline-flex flex-col items-end gap-1 text-ui-xs md:items-start">
                    {r.submission?.text ? <span className="line-clamp-2 text-left whitespace-pre-wrap">{r.submission.text}</span> : null}
                    {r.submission?.has_file ? (
                      <Button variant="quiet" size="sm" onClick={() => download(r.submission!.id)}>
                        Download file
                      </Button>
                    ) : null}
                    {!r.submission?.text && !r.submission?.has_file ? <span className="text-ink-muted">None</span> : null}
                  </span>
                ),
              },
              {
                key: "grade",
                header: "Grade",
                numeric: true,
                cell: (r) =>
                  r.submission?.grade ? (
                    <span className="inline-flex flex-col items-end gap-1">
                      <span className="font-semibold">
                        {Number(r.submission.grade.score)} / {Number(a.max_score)}
                      </span>
                      <StatusLabel status={r.submission.grade.released ? "released" : "unreleased"} />
                    </span>
                  ) : (
                    <span className="text-ink-muted">Not graded</span>
                  ),
              },
              {
                key: "actions",
                header: "Actions",
                hiddenHeader: true,
                className: "w-24 md:text-right",
                cell: (r) =>
                  r.submission || a.mode === "paper" ? (
                    <Button variant="quiet" onClick={() => setGradingId(r.student_id)}>
                      {r.submission?.grade ? "Edit grade" : "Grade"}
                    </Button>
                  ) : null,
              },
            ]}
          />
        </div>
      </section>

      {gradingId ? (
        <div ref={formRef} className="mt-8">
          <GradeForm
            key={gradingId}
            assessmentId={id}
            maxScore={Number(a.max_score)}
            row={data.rows.find((r) => r.student_id === gradingId)!}
            onCancel={() => setGradingId(null)}
            onSaved={(name) => {
              setGradingId(null);
              toast(`Grade saved for ${name}. It stays hidden until you release grades.`);
              reload();
            }}
          />
        </div>
      ) : null}
    </>
  );
}

function GradeForm({ assessmentId, maxScore, row, onSaved, onCancel }: { assessmentId: string; maxScore: number; row: Row; onSaved: (name: string) => void; onCancel: () => void }) {
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
    <form onSubmit={save} className="max-w-2xl space-y-6 border border-line bg-paper p-6" aria-label={`Grade ${row.full_name}`}>
      <h2 className="text-ui-md font-semibold">Grade: {row.full_name}</h2>
      {row.submission?.text ? <p className="max-h-60 max-w-measure overflow-y-auto border-l-2 border-line pl-4 whitespace-pre-wrap">{row.submission.text}</p> : null}
      <TextField label={`Score (out of ${maxScore})`} type="number" min={0} max={maxScore} step="0.5" value={score} onChange={(e) => setScore(e.target.value)} className="max-w-48" error={error || undefined} />
      <TextArea label="Feedback" optional rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={busy} loadingText="Saving…" disabled={score === ""}>
          Save grade
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function TutorAssessmentPage() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <TutorAssessment />
    </Suspense>
  );
}
