"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { fromLocalInput, toLocalInput } from "@/lib/dates";
import type { ClassItem } from "@/lib/types";
import { Button, Field, inputClass, Notice } from "./ui";

type Draft = {
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  youtube_url: string;
  zoom_url: string;
  zoom_passcode: string;
  recording_url: string;
  status: ClassItem["status"];
};

const fromClass = (c?: ClassItem): Draft => ({
  title: c?.title ?? "",
  description: c?.description ?? "",
  starts_at: toLocalInput(c?.starts_at),
  ends_at: toLocalInput(c?.ends_at),
  youtube_url: c?.youtube_url ?? "",
  zoom_url: c?.zoom_url ?? "",
  zoom_passcode: c?.zoom_passcode ?? "",
  recording_url: c?.recording_url ?? "",
  status: c?.status ?? "scheduled",
});

/** Create (programmeId) or edit (existing) a class. Admins only; uses the /admin API. */
export function ClassForm({
  programmeId,
  existing,
  onSaved,
  onCancel,
}: {
  programmeId?: string;
  existing?: ClassItem;
  onSaved: (id: string) => void;
  onCancel?: () => void;
}) {
  const [d, setD] = useState<Draft>(() => fromClass(existing));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setD({ ...d, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body = { ...d, starts_at: fromLocalInput(d.starts_at), ends_at: fromLocalInput(d.ends_at) };
    const res = existing
      ? await api<{ id: string }>(`/admin/classes/${existing.id}`, { method: "PATCH", body })
      : await api<{ id: string }>(`/admin/programmes/${programmeId}/classes`, { body });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onSaved(res.data.id);
  }

  return (
    <form onSubmit={save} className="max-w-2xl space-y-5" noValidate>
      <Field label="Title" value={d.title} onChange={set("title")} />
      <label className="block">
        <span className="block text-[0.9375rem] font-semibold">Description</span>
        <textarea rows={3} value={d.description} onChange={set("description")} className="mt-1.5 block w-full rounded-sm border border-line bg-white px-3 py-2.5 text-base" />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Starts" type="datetime-local" value={d.starts_at} onChange={set("starts_at")} />
        <Field label="Ends" type="datetime-local" value={d.ends_at} onChange={set("ends_at")} />
      </div>
      <Field label="YouTube link" hint="Students join here." type="url" placeholder="https://www.youtube.com/…" value={d.youtube_url} onChange={set("youtube_url")} />
      <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
        <Field label="Zoom link" hint="Only tutors and admins can see this." type="url" placeholder="https://zoom.us/j/…" value={d.zoom_url} onChange={set("zoom_url")} />
        <Field label="Zoom passcode" hint="Tutors only." value={d.zoom_passcode} onChange={set("zoom_passcode")} />
      </div>
      <Field label="Recording link" hint="Add after the class." type="url" value={d.recording_url} onChange={set("recording_url")} />
      <label className="block max-w-56">
        <span className="block text-[0.9375rem] font-semibold">Status</span>
        <select value={d.status} onChange={set("status")} className={`mt-1.5 ${inputClass}`}>
          <option value="scheduled">Scheduled</option>
          <option value="live">Live now</option>
          <option value="ended">Ended</option>
        </select>
      </label>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex gap-3">
        <Button type="submit" disabled={busy || !d.title.trim() || !d.starts_at || !d.ends_at}>
          {busy ? "Saving…" : existing ? "Save class" : "Create class"}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
