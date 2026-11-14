"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckboxField, FileField, RadioGroup, SelectField, TextArea, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { api } from "@/lib/api";
import { formatClassTime, fromLocalInput } from "@/lib/dates";
import type { ClassItem } from "@/lib/types";
import { ACCEPT_FILES, uploadFile } from "@/lib/upload";

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
    <form onSubmit={save} className="max-w-2xl space-y-6 border border-line bg-paper p-6" noValidate>
      <h2 className="text-ui-md font-semibold">New assessment</h2>
      <TextField label="Title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} required />
      <TextArea label="Instructions" optional rows={4} value={d.instructions} onChange={(e) => setD({ ...d, instructions: e.target.value })} />
      <SelectField label="For" value={d.class_id} onChange={(e) => setD({ ...d, class_id: e.target.value })}>
        <option value="">The whole programme</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title} ({formatClassTime(c.starts_at, c.ends_at)})
          </option>
        ))}
      </SelectField>
      <div className="grid gap-6 sm:grid-cols-3">
        <TextField label="Due" optional type="datetime-local" value={d.due_at} onChange={(e) => setD({ ...d, due_at: e.target.value })} className="sm:col-span-2" />
        <TextField label="Max score" type="number" min={1} value={d.max_score} onChange={(e) => setD({ ...d, max_score: e.target.value })} />
      </div>
      <RadioGroup
        legend="How it is handed in"
        name="mode"
        value={d.mode}
        onChange={(mode) => setD({ ...d, mode })}
        options={[
          { value: "digital", label: "Online (text or file)" },
          { value: "paper", label: "On paper" },
        ]}
      />
      <FileField label="Brief" optional hint="PDF or Word, up to 10 MB." accept={ACCEPT_FILES} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <CheckboxField label="Publish now" hint="Students can see it straight away." checked={d.published} onChange={(e) => setD({ ...d, published: e.target.checked })} />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={busy} loadingText="Saving…" disabled={!d.title.trim()}>
          Create assessment
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
