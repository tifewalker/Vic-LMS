"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { CheckboxField, TextArea, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatDateTime } from "@/lib/dates";
import type { ClassItem } from "@/lib/types";

export type Announcement = { id: string; programme_id: string; class_id: string | null; title: string; body: string; pinned: boolean; created_at: string };
type Draft = { id?: string; title: string; body: string; pinned: boolean };

/** Announcements for a programme, or one class. Tutors and admins post, edit, pin and delete. */
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
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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
    setBusy(true);
    const { id, ...body } = draft;
    const res = id
      ? await api(`${base}/announcements/${id}`, { method: "PATCH", body })
      : await api(`${base}/programmes/${programmeId}/announcements`, { body: { ...body, class_id: classId } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast(id ? "Announcement saved." : "Announcement posted.");
    setDraft(null);
    setError("");
    reload();
  }
  async function togglePin(a: Announcement) {
    const res = await api(`${base}/announcements/${a.id}`, { method: "PATCH", body: { pinned: !a.pinned } });
    if (res.ok) toast(a.pinned ? "Unpinned." : "Pinned to the top.");
    else toast(res.error, "error");
    reload();
  }
  async function remove(a: Announcement) {
    if (!(await confirm({ title: "Delete this announcement?", body: `"${a.title}" will be removed for everyone.`, confirmLabel: "Delete" }))) return;
    const res = await api(`${base}/announcements/${a.id}`, { method: "DELETE" });
    if (res.ok) toast("Announcement deleted.");
    else toast(res.error, "error");
    reload();
  }

  const classTitle = (id: string | null) => (id ? classes.find((c) => c.id === id)?.title : null);
  const newButton = canTeach ? <Button onClick={() => setDraft({ title: "", body: "", pinned: false })}>New announcement</Button> : null;

  return (
    <section aria-label="Announcements" className="space-y-6">
      {canTeach && !draft && items?.length ? (
        <Button size="sm" onClick={() => setDraft({ title: "", body: "", pinned: false })}>
          New announcement
        </Button>
      ) : null}
      {error && !draft ? <Notice tone="error">{error}</Notice> : null}

      {draft ? (
        <form onSubmit={save} className="max-w-2xl space-y-6 border border-line bg-paper p-6" noValidate>
          <h2 className="text-ui-md font-semibold">{draft.id ? "Edit announcement" : classId ? "New announcement for this class" : "New announcement"}</h2>
          <TextField label="Title" value={draft.title} maxLength={200} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
          <TextArea label="Message" rows={5} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} required />
          <CheckboxField label="Pin to the top" checked={draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} />
          {error ? <Notice tone="error">{error}</Notice> : null}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={busy} loadingText="Saving…" disabled={!draft.title.trim() || !draft.body.trim()}>
              {draft.id ? "Save" : "Post announcement"}
            </Button>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {items === null && !error ? <SkeletonRows rows={3} /> : null}
      {items?.length === 0 && !draft ? (
        <EmptyState
          title="No announcements yet."
          text={canTeach ? "Post updates for everyone in the programme here." : "Your tutors' updates will appear here."}
          action={newButton}
        />
      ) : null}
      {items?.length ? (
        <ul className="border-t border-line">
          {items.map((a) => (
            <li key={a.id} className={cx("border-b border-line py-6", a.pinned && "border-l-2 border-l-accent pl-4")}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h3 className="text-ui-md font-semibold">{a.title}</h3>
                {a.pinned ? <StatusLabel status="pinned" /> : null}
              </div>
              <p className="mt-1 text-ui-xs text-ink-muted">
                {formatDateTime(a.created_at)}
                {!classId && classTitle(a.class_id) ? ` · ${classTitle(a.class_id)}` : ""}
              </p>
              <p className="mt-3 max-w-measure break-words whitespace-pre-wrap">{a.body}</p>
              {canTeach ? (
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                  <Button variant="quiet" onClick={() => setDraft({ id: a.id, title: a.title, body: a.body, pinned: a.pinned })}>
                    Edit
                  </Button>
                  <Button variant="quiet" onClick={() => togglePin(a)}>
                    {a.pinned ? "Unpin" : "Pin"}
                  </Button>
                  <Button variant="quiet" onClick={() => remove(a)}>
                    Delete
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
