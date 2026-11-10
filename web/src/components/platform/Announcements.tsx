"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import type { ClassItem } from "@/lib/types";
import { ConfirmButton } from "./ConfirmButton";
import { Button, Field, Notice } from "./ui";

export type Announcement = {
  id: string;
  programme_id: string;
  class_id: string | null;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
};
type Draft = { id?: string; title: string; body: string; pinned: boolean };

/**
 * Announcements for a programme, or for one class when classId is set.
 * Tutors and admins can post, edit, pin and delete; students read.
 */
export function Announcements({
  base,
  programmeId,
  classId = null,
  classes = [],
  canTeach,
}: {
  base: string;
  programmeId: string;
  classId?: string | null;
  classes?: ClassItem[];
  canTeach: boolean;
}) {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    const q = classId ? `?class_id=${classId}` : "";
    api<{ announcements: Announcement[] }>(`${base}/programmes/${programmeId}/announcements${q}`).then((res) => {
      if (cancelled) return;
      if (res.ok) setItems(res.data.announcements);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [base, programmeId, classId, reloadKey]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setError("");
    const { id, ...body } = draft;
    const res = id
      ? await api(`${base}/announcements/${id}`, { method: "PATCH", body })
      : await api(`${base}/programmes/${programmeId}/announcements`, { body: { ...body, class_id: classId } });
    if (!res.ok) return setError(res.error);
    setDraft(null);
    reload();
  }
  async function togglePin(a: Announcement) {
    const res = await api(`${base}/announcements/${a.id}`, { method: "PATCH", body: { pinned: !a.pinned } });
    if (!res.ok) setError(res.error);
    reload();
  }
  async function remove(a: Announcement) {
    const res = await api(`${base}/announcements/${a.id}`, { method: "DELETE" });
    if (!res.ok) setError(res.error);
    reload();
  }

  const classTitle = (id: string | null) => (id ? classes.find((c) => c.id === id)?.title : null);

  return (
    <section aria-label="Announcements">
      {canTeach && !draft ? (
        <Button size="sm" onClick={() => setDraft({ title: "", body: "", pinned: false })}>
          New announcement
        </Button>
      ) : null}
      {error ? (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      {draft ? (
        <form onSubmit={save} className="mt-4 max-w-2xl space-y-4 border border-line p-4" noValidate>
          <h3 className="text-xl">{draft.id ? "Edit announcement" : classId ? "New announcement for this class" : "New announcement"}</h3>
          <Field label="Title" value={draft.title} maxLength={200} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <label className="block">
            <span className="block text-[0.9375rem] font-semibold">Message</span>
            <textarea
              rows={5}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              className="mt-1.5 block w-full rounded-sm border border-line bg-white px-3 py-2.5 text-base"
            />
          </label>
          <label className="flex items-center gap-2.5">
            <input type="checkbox" checked={draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} className="size-4 accent-[var(--accent)]" />
            Pin to the top
          </label>
          <div className="flex gap-3">
            <Button type="submit" disabled={!draft.title.trim() || !draft.body.trim()}>
              {draft.id ? "Save" : "Post announcement"}
            </Button>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <ul className="mt-4 border-t border-line">
        {items === null && !error ? <li className="py-4 text-ink-muted">Loading…</li> : null}
        {items?.length === 0 ? <li className="py-4 text-ink-muted">No announcements yet.</li> : null}
        {items?.map((a) => (
          <li key={a.id} className={a.pinned ? "border-b border-line border-l-2 border-l-accent py-4 pl-4" : "border-b border-line py-4"}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="font-serif text-xl">{a.title}</h3>
              <p className="text-sm text-ink-muted">
                {a.pinned ? <span className="font-semibold text-accent-strong">Pinned · </span> : null}
                {formatDateTime(a.created_at)}
                {!classId && classTitle(a.class_id) ? ` · ${classTitle(a.class_id)}` : ""}
              </p>
            </div>
            <p className="mt-2 max-w-measure break-words whitespace-pre-wrap">{a.body}</p>
            {canTeach ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
                <Button variant="quiet" onClick={() => setDraft({ id: a.id, title: a.title, body: a.body, pinned: a.pinned })}>
                  Edit
                </Button>
                <Button variant="quiet" onClick={() => togglePin(a)}>
                  {a.pinned ? "Unpin" : "Pin"}
                </Button>
                <ConfirmButton label="Delete" question="Delete this announcement?" confirmLabel="Delete" onConfirm={() => remove(a)} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
