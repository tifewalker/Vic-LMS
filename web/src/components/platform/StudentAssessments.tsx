"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { submissionLabel, type StudentAssessment } from "@/lib/types";
import { ACCEPT_FILES, openFile, uploadFile } from "@/lib/upload";
import { Button, Notice } from "./ui";

/** A student's assessments: due time, status, released grade, and a submit form. */
export function StudentAssessments({ items, onChange }: { items: StudentAssessment[]; onChange: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (items.length === 0) return <p className="text-ink-muted">No assessments yet.</p>;

  return (
    <ul className="border-t border-line">
      {items.map((a) => {
        const sub = a.my_submission;
        const overdue = !!a.due_at && new Date(a.due_at) < new Date();
        const canSubmit = a.mode === "digital" && sub?.status !== "graded" && !sub?.grade;
        return (
          <li key={a.id} className="border-b border-line py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="font-serif text-xl">{a.title}</h3>
              <span className="text-sm text-ink-muted">
                {a.mode === "paper" ? "Hand in on paper" : a.due_at ? `Due ${formatDateTime(a.due_at)}` : "No deadline"} · out of {Number(a.max_score)}
              </span>
            </div>
            <p className="mt-1 text-[0.9375rem]">
              {sub ? (
                <span className={sub.status === "late" ? "text-accent-strong" : "text-sage-strong"}>
                  {submissionLabel[sub.status]} {sub.status !== "received_paper" ? formatDateTime(sub.submitted_at) : ""}
                </span>
              ) : (
                <span className={overdue && a.mode === "digital" ? "text-accent-strong" : "text-ink-muted"}>
                  {a.mode === "paper" ? "Not received yet" : overdue ? "Not submitted. Past the deadline, so it will be marked late." : "Not submitted"}
                </span>
              )}
            </p>
            {sub?.grade ? (
              <div className="mt-3 border-l-2 border-sage pl-4">
                <p className="font-semibold">
                  Grade: {Number(sub.grade.score)} / {Number(a.max_score)}
                </p>
                {sub.grade.feedback ? <p className="mt-1 max-w-measure whitespace-pre-wrap">{sub.grade.feedback}</p> : null}
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-[0.9375rem]">
              {a.instructions || a.attachment_path || canSubmit ? (
                <Button variant="quiet" onClick={() => setOpenId(openId === a.id ? null : a.id)}>
                  {openId === a.id ? "Hide" : canSubmit ? (sub ? "View or resubmit" : "Open and submit") : "View instructions"}
                </Button>
              ) : null}
            </div>
            {openId === a.id ? <Detail a={a} canSubmit={canSubmit} onSubmitted={onChange} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

function Detail({ a, canSubmit, onSubmitted }: { a: StudentAssessment; canSubmit: boolean; onSubmitted: () => void }) {
  const [text, setText] = useState(a.my_submission?.text ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setDone("");
    let file_path: string | undefined;
    if (file) {
      const up = await uploadFile(`/student/assessments/${a.id}/upload-url`, file);
      if ("error" in up) {
        setBusy(false);
        return setError(up.error);
      }
      file_path = up.path;
    }
    const res = await api<{ status: string }>(`/student/assessments/${a.id}/submit`, { body: { text, ...(file_path ? { file_path } : {}) } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setDone(res.data.status === "late" ? "Submitted. It was after the deadline, so it is marked late." : "Submitted.");
    setFile(null);
    onSubmitted();
  }

  return (
    <div className="mt-4 space-y-4 border border-line p-4">
      {a.instructions ? <p className="max-w-measure whitespace-pre-wrap">{a.instructions}</p> : null}
      {a.attachment_path ? (
        <Button variant="quiet" onClick={async () => setError((await openFile(`/student/assessments/${a.id}/attachment`)) ?? "")}>
          Download the brief
        </Button>
      ) : null}
      {a.my_submission?.has_file ? (
        <p className="text-[0.9375rem]">
          <Button variant="quiet" onClick={async () => setError((await openFile(`/student/assessments/${a.id}/my-file`)) ?? "")}>
            Download my submitted file
          </Button>
        </p>
      ) : null}
      {canSubmit ? (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <label className="block">
            <span className="block text-[0.9375rem] font-semibold">Your answer</span>
            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-1.5 block w-full rounded-sm border border-line bg-white px-3 py-2.5 text-base"
            />
          </label>
          <label className="block">
            <span className="block text-[0.9375rem] font-semibold">File (optional)</span>
            <span className="block text-sm text-ink-muted">PDF or Word, up to 10 MB.{a.my_submission?.has_file ? " A new file replaces the one you sent." : ""}</span>
            <input
              type="file"
              accept={ACCEPT_FILES}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1.5 block w-full text-[0.9375rem] file:mr-4 file:cursor-pointer file:rounded-sm file:border file:border-line file:bg-paper file:px-4 file:py-2 file:font-semibold file:text-ink"
            />
          </label>
          {error ? <Notice tone="error">{error}</Notice> : null}
          {done ? <Notice tone="success">{done}</Notice> : null}
          <Button type="submit" disabled={busy || (!text.trim() && !file && !a.my_submission?.has_file)}>
            {busy ? "Submitting…" : a.my_submission ? "Resubmit" : "Submit"}
          </Button>
        </form>
      ) : error ? (
        <Notice tone="error">{error}</Notice>
      ) : null}
    </div>
  );
}
