"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileField, TextArea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import type { StudentAssessment } from "@/lib/types";
import { ACCEPT_FILES, openFile, uploadFile } from "@/lib/upload";

/** A student's assessments: due time, status, released grade and a submit form. */
export function StudentAssessments({ items, onChange }: { items: StudentAssessment[]; onChange: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (items.length === 0) return <EmptyState title="No assessments yet." text="Assessments your tutors publish will appear here." />;

  return (
    <ul className="border-t border-line">
      {items.map((a) => {
        const sub = a.my_submission;
        const overdue = !!a.due_at && new Date(a.due_at) < new Date();
        const canSubmit = a.mode === "digital" && sub?.status !== "graded" && !sub?.grade;
        const status = sub ? sub.status : a.mode === "paper" ? "not_submitted" : overdue ? "late" : "not_submitted";
        const label = !sub && a.mode === "paper" ? "Not received" : !sub && overdue ? "Overdue" : undefined;
        return (
          <li key={a.id} className="border-b border-line py-6">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <h3 className="text-ui-md font-semibold">{a.title}</h3>
              <StatusLabel status={status} label={label} />
            </div>
            <p className="mt-1 text-ui-xs text-ink-muted">
              {a.mode === "paper" ? "Hand in on paper" : a.due_at ? `Due ${formatDateTime(a.due_at)}` : "No deadline"} · out of {Number(a.max_score)}
              {sub && sub.status !== "received_paper" ? ` · sent ${formatDateTime(sub.submitted_at)}` : ""}
            </p>
            {sub?.grade ? (
              <div className="mt-4 max-w-measure border-l-2 border-sage pl-4">
                <p>
                  <span className="font-serif text-ui-lg tabular-nums">{Number(sub.grade.score)}</span>
                  <span className="text-ink-muted"> / {Number(a.max_score)}</span>
                </p>
                {sub.grade.feedback ? <p className="mt-1 whitespace-pre-wrap">{sub.grade.feedback}</p> : null}
              </div>
            ) : null}
            {a.instructions || a.attachment_path || canSubmit ? (
              <Button variant="quiet" className="mt-3" onClick={() => setOpenId(openId === a.id ? null : a.id)} aria-expanded={openId === a.id}>
                {openId === a.id ? "Hide" : canSubmit ? (sub ? "View or resubmit" : "Open and submit") : "View instructions"}
              </Button>
            ) : null}
            {openId === a.id ? <Detail a={a} canSubmit={canSubmit} onSubmitted={onChange} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

function Detail({ a, canSubmit, onSubmitted }: { a: StudentAssessment; canSubmit: boolean; onSubmitted: () => void }) {
  const toast = useToast();
  const [text, setText] = useState(a.my_submission?.text ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
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
    toast(res.data.status === "late" ? "Submitted. It was after the deadline, so it is marked late." : "Submitted.");
    setFile(null);
    onSubmitted();
  }
  async function open(endpoint: string) {
    const problem = await openFile(endpoint);
    if (problem) toast(problem, "error");
  }

  return (
    <div className="mt-4 max-w-2xl space-y-6 border border-line bg-paper p-6">
      {a.instructions ? <p className="max-w-measure whitespace-pre-wrap">{a.instructions}</p> : null}
      {a.attachment_path || a.my_submission?.has_file ? (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {a.attachment_path ? (
            <Button variant="quiet" onClick={() => open(`/student/assessments/${a.id}/attachment`)}>
              Download the brief
            </Button>
          ) : null}
          {a.my_submission?.has_file ? (
            <Button variant="quiet" onClick={() => open(`/student/assessments/${a.id}/my-file`)}>
              Download my submitted file
            </Button>
          ) : null}
        </div>
      ) : null}
      {canSubmit ? (
        <form onSubmit={submit} className="space-y-6" noValidate>
          <TextArea label="Your answer" rows={5} value={text} onChange={(e) => setText(e.target.value)} />
          <FileField
            label="File"
            optional
            hint={`PDF or Word, up to 10 MB.${a.my_submission?.has_file ? " A new file replaces the one you sent." : ""}`}
            accept={ACCEPT_FILES}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button type="submit" loading={busy} loadingText="Submitting…" disabled={!text.trim() && !file && !a.my_submission?.has_file}>
            {a.my_submission ? "Resubmit" : "Submit"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
