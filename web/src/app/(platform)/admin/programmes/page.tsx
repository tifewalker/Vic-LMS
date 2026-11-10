"use client";

import { useEffect, useState } from "react";
import { Button, Field, Notice, PageTitle } from "@/components/platform/ui";
import { api } from "@/lib/api";

type Programme = {
  id: string;
  title: string;
  description: string;
  cover_note: string;
  is_active: boolean;
  student_count: number;
  tutor_count: number;
  class_count: number;
};
type Draft = { id?: string; title: string; description: string; cover_note: string; is_active: boolean };

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<Programme[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api<{ programmes: Programme[] }>("/admin/programmes").then((res) => (res.ok ? setProgrammes(res.data.programmes) : setError(res.error)));
  }, [reloadKey]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError("");
    const { id, ...body } = draft;
    const res = id ? await api(`/admin/programmes/${id}`, { method: "PATCH", body }) : await api("/admin/programmes", { body });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setNotice(id ? "Programme saved." : "Programme created.");
    setDraft(null);
    setReloadKey((k) => k + 1);
  }

  return (
    <>
      <PageTitle title="Programmes">
        {!draft ? <Button onClick={() => setDraft({ title: "", description: "", cover_note: "", is_active: true })}>New programme</Button> : null}
      </PageTitle>

      <div className="mt-6 space-y-3">
        {notice ? <Notice tone="success">{notice}</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
      </div>

      {draft ? (
        <form onSubmit={save} className="mt-6 max-w-2xl space-y-5 border border-line p-5 md:p-6" noValidate>
          <h2 className="text-2xl">{draft.id ? "Edit programme" : "New programme"}</h2>
          <Field label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <label className="block">
            <span className="block text-[0.9375rem] font-semibold">Description</span>
            <textarea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="mt-1.5 block w-full rounded-sm border border-line bg-white px-3 py-2.5 text-base"
            />
          </label>
          <label className="block">
            <span className="block text-[0.9375rem] font-semibold">What you will gain</span>
            <span className="block text-sm text-ink-muted">A short note shown to students on the programme page.</span>
            <textarea
              rows={3}
              value={draft.cover_note}
              onChange={(e) => setDraft({ ...draft, cover_note: e.target.value })}
              className="mt-1.5 block w-full rounded-sm border border-line bg-white px-3 py-2.5 text-base"
            />
          </label>
          <label className="flex items-center gap-2.5">
            <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} className="size-4 accent-[var(--accent)]" />
            Active
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy || !draft.title.trim()}>
              {busy ? "Saving…" : "Save programme"}
            </Button>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <div className="relative mt-8 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-[0.9375rem]">
          <thead>
            <tr className="border-y border-line text-sm text-ink-muted">
              <th className="py-2.5 pr-4 font-semibold">Programme</th>
              <th className="py-2.5 pr-4 font-semibold">Students</th>
              <th className="py-2.5 pr-4 font-semibold">Tutors</th>
              <th className="py-2.5 pr-4 font-semibold">Classes</th>
              <th className="py-2.5 font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {programmes?.map((p) => (
              <tr key={p.id} className="border-b border-line align-top">
                <td className="py-3 pr-4">
                  <a href={`/admin/programmes/view/?id=${p.id}`} className="font-semibold text-accent-strong hover:underline">
                    {p.title}
                  </a>
                  <span className="block text-sm text-ink-muted">{p.is_active ? p.description : "Inactive"}</span>
                </td>
                <td className="py-3 pr-4 tabular-nums">{p.student_count}</td>
                <td className="py-3 pr-4 tabular-nums">{p.tutor_count}</td>
                <td className="py-3 pr-4 tabular-nums">{p.class_count}</td>
                <td className="py-3 text-right">
                  <Button
                    variant="quiet"
                    onClick={() => {
                      setNotice("");
                      setDraft({ id: p.id, title: p.title, description: p.description, cover_note: p.cover_note, is_active: p.is_active });
                    }}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
            {programmes?.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-ink-muted">
                  No programmes yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
