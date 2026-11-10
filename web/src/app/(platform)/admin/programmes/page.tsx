"use client";

import { useEffect, useState } from "react";
import { Button, Field, Notice, PageTitle } from "@/components/platform/ui";
import { api } from "@/lib/api";

type Programme = {
  id: string;
  name: string;
  slug: string;
  description: string;
  duration_weeks: number;
  is_active: boolean;
  training_areas: { id: string; title: string; position: number }[];
  batch_count: number;
};

type Draft = { id?: string; name: string; description: string; duration_weeks: string; is_active: boolean; areas: string };

const empty: Draft = { name: "", description: "", duration_weeks: "26", is_active: true, areas: "" };

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<Programme[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api<{ programmes: Programme[] }>("/admin/programmes").then((res) =>
      res.ok ? setProgrammes(res.data.programmes) : setError(res.error),
    );
  }, [reloadKey]);

  function edit(p: Programme) {
    setNotice("");
    setDraft({
      id: p.id,
      name: p.name,
      description: p.description,
      duration_weeks: String(p.duration_weeks),
      is_active: p.is_active,
      areas: p.training_areas.map((a) => a.title).join("\n"),
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError("");
    const body = {
      name: draft.name,
      description: draft.description,
      duration_weeks: Number(draft.duration_weeks),
      is_active: draft.is_active,
      training_areas: draft.areas.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    const res = draft.id
      ? await api(`/admin/programmes/${draft.id}`, { method: "PATCH", body })
      : await api("/admin/programmes", { body });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setNotice(draft.id ? "Programme saved." : "Programme created.");
    setDraft(null);
    setReloadKey((k) => k + 1);
  }

  return (
    <>
      <PageTitle title="Programmes">
        {!draft ? (
          <Button
            onClick={() => {
              setNotice("");
              setDraft(empty);
            }}
          >
            New programme
          </Button>
        ) : null}
      </PageTitle>

      <div className="mt-6 space-y-3">
        {notice ? <Notice tone="success">{notice}</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
      </div>

      {draft ? (
        <form onSubmit={save} className="mt-6 max-w-2xl space-y-5 border border-line p-5 md:p-6" noValidate>
          <h2 className="text-2xl">{draft.id ? "Edit programme" : "New programme"}</h2>
          <Field label="Name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <label className="block">
            <span className="block text-[0.9375rem] font-semibold">Description</span>
            <textarea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="mt-1.5 block w-full rounded-sm border border-line bg-white px-3 py-2.5 text-base"
            />
          </label>
          <Field
            label="Duration in weeks"
            type="number"
            min={1}
            max={260}
            required
            value={draft.duration_weeks}
            onChange={(e) => setDraft({ ...draft, duration_weeks: e.target.value })}
            className="max-w-40"
          />
          <label className="block">
            <span className="block text-[0.9375rem] font-semibold">Training areas</span>
            <span className="block text-sm text-ink-muted">One per line, in order.</span>
            <textarea
              rows={8}
              value={draft.areas}
              onChange={(e) => setDraft({ ...draft, areas: e.target.value })}
              className="mt-1.5 block w-full rounded-sm border border-line bg-white px-3 py-2.5 text-base"
            />
          </label>
          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
              className="size-4 accent-[var(--accent)]"
            />
            <span>Active (can be used for new batches)</span>
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy || !draft.name.trim() || !Number(draft.duration_weeks)}>
              {busy ? "Saving…" : "Save programme"}
            </Button>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <div className="relative mt-8 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-[0.9375rem]">
          <thead>
            <tr className="border-y border-line text-sm text-ink-muted">
              <th className="py-2.5 pr-4 font-semibold">Programme</th>
              <th className="py-2.5 pr-4 font-semibold">Weeks</th>
              <th className="py-2.5 pr-4 font-semibold">Training areas</th>
              <th className="py-2.5 pr-4 font-semibold">Batches</th>
              <th className="py-2.5 font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {programmes?.map((p) => (
              <tr key={p.id} className="border-b border-line align-top">
                <td className="py-3 pr-4">
                  <span className="block">{p.name}</span>
                  <span className="block text-sm text-ink-muted">{p.is_active ? "Active" : "Inactive"}</span>
                </td>
                <td className="py-3 pr-4 tabular-nums">{p.duration_weeks}</td>
                <td className="py-3 pr-4 tabular-nums">{p.training_areas.length}</td>
                <td className="py-3 pr-4 tabular-nums">
                  <a href={`/admin/batches/?programme=${p.id}`} className="text-accent-strong hover:underline">
                    {p.batch_count}
                  </a>
                </td>
                <td className="py-3 text-right">
                  <Button variant="quiet" onClick={() => edit(p)}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
            {programmes && programmes.length === 0 ? (
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
