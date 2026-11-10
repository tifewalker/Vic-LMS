"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime, fromLocalInput } from "@/lib/dates";
import type { ClassItem } from "@/lib/types";
import { ACCEPT_FILES, uploadFile } from "@/lib/upload";
import { Button, Field, inputClass, Notice } from "./ui";

/** Create an assessment for a programme (tutors and admins). Uses the /tutor API. */
export function AssessmentForm({
  programmeId,
  classes,
  defaultClassId,
  onCreated,
  onCancel,
}: {
  programmeId: string;
  classes: ClassItem[];
  defaultClassId?: string;
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState({
    title: "",
    instructions: "",
    class_id: defaultClassId ?? "",
    due_at: "",
    max_score: "100",
    mode: "digital" as "digital" | "paper",
    published: true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api<{ id: string }>(`/tutor/programmes/${programmeId}/assessments`, {
      body: { ...d, class_id: d.class_id || null, due_at: fromLocalInput(d.due_at), max_score: Number(d.max_score) },
    });
    if (!res.ok) {
      setBusy(false);
      return setError(res.error);
    }
    if (file) {
      const up = await uploadFile(`/tutor/assessments/${res.data.id}/attachment-url`, file);
      if ("error" in up) {
        setBusy(false);
        return setError(`The assessment was created, but the file was not attached: ${up.error}`);
      }
      await api(`/tutor/assessments/${res.data.id}`, { method: "PATCH", body: { attachment_path: up.path } });
    }
    setBusy(false);
    onCreated(res.data.id);
  }

  return (
    <form onSubmit={save} className="mt-4 max-w-2xl space-y-5 border border-line p-5" noValidate>
      <h3 className="text-xl">New assessment</h3>
      <Field label="Title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
      <label className="block">
        <span className="block text-[0.9375rem] font-semibold">Instructions</span>
        <textarea
          rows={4}
          value={d.instructions}
          onChange={(e) => setD({ ...d, instructions: e.target.value })}
          className="mt-1.5 block w-full rounded-sm border border-line bg-white px-3 py-2.5 text-base"
        />
      </label>
      <label className="block">
        <span className="block text-[0.9375rem] font-semibold">For</span>
        <select value={d.class_id} onChange={(e) => setD({ ...d, class_id: e.target.value })} className={`mt-1.5 ${inputClass}`}>
          <option value="">The whole programme</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({formatDateTime(c.starts_at)})
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Due (optional)" type="datetime-local" value={d.due_at} onChange={(e) => setD({ ...d, due_at: e.target.value })} className="sm:col-span-2" />
        <Field label="Max score" type="number" min={1} value={d.max_score} onChange={(e) => setD({ ...d, max_score: e.target.value })} />
      </div>
      <fieldset>
        <legend className="text-[0.9375rem] font-semibold">How it is handed in</legend>
        <div className="mt-2 flex flex-wrap gap-6">
          {(["digital", "paper"] as const).map((m) => (
            <label key={m} className="flex items-center gap-2">
              <input type="radio" name="mode" checked={d.mode === m} onChange={() => setD({ ...d, mode: m })} className="size-4 accent-[var(--accent)]" />
              {m === "digital" ? "Online (text or file)" : "On paper"}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="block text-[0.9375rem] font-semibold">Brief (optional)</span>
        <span className="block text-sm text-ink-muted">PDF or Word, up to 10 MB.</span>
        <input
          type="file"
          accept={ACCEPT_FILES}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1.5 block w-full text-[0.9375rem] file:mr-4 file:cursor-pointer file:rounded-sm file:border file:border-line file:bg-paper file:px-4 file:py-2 file:font-semibold file:text-ink"
        />
      </label>
      <label className="flex items-center gap-2.5">
        <input type="checkbox" checked={d.published} onChange={(e) => setD({ ...d, published: e.target.checked })} className="size-4 accent-[var(--accent)]" />
        Publish now (students can see it)
      </label>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex gap-3">
        <Button type="submit" disabled={busy || !d.title.trim()}>
          {busy ? "Saving…" : "Create assessment"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
