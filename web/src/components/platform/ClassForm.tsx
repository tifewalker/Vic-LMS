"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextArea, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { api } from "@/lib/api";
import { fromLocalInput, toLocalInput } from "@/lib/dates";
import { nextWednesdaySlot, timetableWarning } from "@/lib/timetable";
import type { ClassItem } from "@/lib/types";

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
  live_mode: ClassItem["live_mode"];
  topic: string;
};

// A new class starts in the next Wednesday lecture slot (2 pm to 6 pm).
const fromClass = (c?: ClassItem): Draft => ({
  title: c?.title ?? "",
  description: c?.description ?? "",
  ...(c ? { starts_at: toLocalInput(c.starts_at), ends_at: toLocalInput(c.ends_at) } : nextWednesdaySlot()),
  youtube_url: c?.youtube_url ?? "",
  zoom_url: c?.zoom_url ?? "",
  zoom_passcode: c?.zoom_passcode ?? "",
  recording_url: c?.recording_url ?? "",
  status: c?.status ?? "scheduled",
  live_mode: c?.live_mode ?? "realtime",
  topic: c?.topic ?? "",
});

/** Create (programmeId) or edit (existing) a class. Admins only; uses the /admin API. topics is the course outline. */
export function ClassForm({
  programmeId,
  existing,
  topics = [],
  onSaved,
  onCancel,
}: {
  programmeId?: string;
  existing?: ClassItem;
  topics?: string[];
  onSaved: (id: string) => void;
  onCancel?: () => void;
}) {
  const [d, setD] = useState<Draft>(() => fromClass(existing));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const outside = timetableWarning(d.starts_at, d.ends_at);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });

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
    <form onSubmit={save} className="max-w-2xl space-y-6" noValidate>
      <TextField label="Title" value={d.title} onChange={set("title")} required />
      {topics.length || d.topic ? (
        <SelectField label="Topic" optional hint="The course outline topic this class covers. Students see it on their timetable." value={d.topic} onChange={set("topic")}>
          <option value="">No topic</option>
          {/* Keep a topic that has since been renamed or removed from the outline. */}
          {(d.topic && !topics.includes(d.topic) ? [...topics, d.topic] : topics).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </SelectField>
      ) : null}
      <TextArea label="Description" optional rows={3} value={d.description} onChange={set("description")} />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField label="Starts" type="datetime-local" value={d.starts_at} onChange={set("starts_at")} required />
        <TextField label="Ends" type="datetime-local" value={d.ends_at} onChange={set("ends_at")} required />
      </div>
      {outside ? <Notice>{outside}</Notice> : null}
      <TextField
        label="YouTube link"
        hint="Students watch here, inside the app. Paste any YouTube link (watch, youtu.be, /live/ or embed). The stream must be Unlisted, not Private, with embedding allowed."
        inputMode="url"
        placeholder="https://youtu.be/…"
        value={d.youtube_url}
        onChange={set("youtube_url")}
      />
      <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
        <TextField label="Zoom link" hint="Only tutors and admins see this." type="url" placeholder="https://zoom.us/j/…" value={d.zoom_url} onChange={set("zoom_url")} />
        <TextField label="Zoom passcode" hint="Tutors only." value={d.zoom_passcode} onChange={set("zoom_passcode")} />
      </div>
      <TextField label="Recording link" hint="Add it after the class. Any YouTube link; Unlisted, with embedding allowed." inputMode="url" placeholder="https://youtu.be/…" value={d.recording_url} onChange={set("recording_url")} />
      <SelectField label="Status" value={d.status} onChange={set("status")} className="max-w-56">
        <option value="scheduled">Scheduled</option>
        <option value="live">Live now</option>
        <option value="ended">Ended</option>
      </SelectField>
      <SelectField
        label="Live updates for students"
        hint="Light mode refreshes Q&A and polls every 25 seconds instead of keeping a live connection. Use it when students are on weak or expensive data."
        value={d.live_mode}
        onChange={set("live_mode")}
        className="max-w-72"
      >
        <option value="realtime">Realtime</option>
        <option value="light">Light (refresh every 25 seconds)</option>
      </SelectField>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={busy} loadingText="Saving…" disabled={!d.title.trim() || !d.starts_at || !d.ends_at}>
          {existing ? "Save class" : "Create class"}
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
