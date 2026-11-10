"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, inputClass, Notice, PageTitle } from "@/components/platform/ui";
import { api } from "@/lib/api";
import { batchStatusLabel, formatDate } from "@/lib/dates";

type Programme = { id: string; name: string; is_active: boolean };
type Batch = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  programme: { id: string; name: string } | null;
  student_count: number;
  tutor_count: number;
};

const initialProgramme = () =>
  typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("programme") ?? "";

export default function BatchesPage() {
  const router = useRouter();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [programmeId, setProgrammeId] = useState(initialProgramme);
  const [status, setStatus] = useState("");
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ programme_id: "", name: "", start_date: "", end_date: "", status: "planned" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ programmes: Programme[] }>("/admin/programmes").then((res) => {
      if (!res.ok) return setError(res.error);
      setProgrammes(res.data.programmes);
      const first = res.data.programmes.find((p) => p.is_active);
      if (first) setDraft((d) => ({ ...d, programme_id: d.programme_id || first.id }));
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (programmeId) params.set("programme_id", programmeId);
    if (status) params.set("status", status);
    api<{ batches: Batch[] }>(`/admin/batches?${params}`).then((res) => {
      if (cancelled) return;
      if (res.ok) setBatches(res.data.batches);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [programmeId, status]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api<{ id: string }>("/admin/batches", { body: draft });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push(`/admin/batches/view/?id=${res.data.id}`);
  }

  return (
    <>
      <PageTitle title="Batches">{!creating ? <Button onClick={() => setCreating(true)}>New batch</Button> : null}</PageTitle>

      {error ? (
        <div className="mt-6">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      {creating ? (
        <form onSubmit={create} className="mt-6 max-w-2xl space-y-5 border border-line p-5 md:p-6" noValidate>
          <h2 className="text-2xl">New batch</h2>
          <label className="block">
            <span className="block text-[0.9375rem] font-semibold">Programme</span>
            <select
              value={draft.programme_id}
              onChange={(e) => setDraft({ ...draft, programme_id: e.target.value })}
              className={`mt-1.5 ${inputClass}`}
            >
              {programmes
                .filter((p) => p.is_active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <Field
            label="Name"
            hint='For example "Cohort 1, January 2027"'
            required
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Start date" type="date" required value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} />
            <Field label="End date" type="date" required value={draft.end_date} onChange={(e) => setDraft({ ...draft, end_date: e.target.value })} />
          </div>
          <label className="block max-w-56">
            <span className="block text-[0.9375rem] font-semibold">Status</span>
            <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={`mt-1.5 ${inputClass}`}>
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy || !draft.programme_id || !draft.name.trim() || !draft.start_date || !draft.end_date}>
              {busy ? "Creating…" : "Create batch"}
            </Button>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="block min-w-0 flex-1 basis-64">
          <span className="block text-sm font-semibold">Programme</span>
          <select value={programmeId} onChange={(e) => setProgrammeId(e.target.value)} className={`mt-1 ${inputClass}`}>
            <option value="">All programmes</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-semibold">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`mt-1 ${inputClass}`}>
            <option value="">All</option>
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </label>
      </div>

      <div className="relative mt-6 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-[0.9375rem]">
          <thead>
            <tr className="border-y border-line text-sm text-ink-muted">
              <th className="py-2.5 pr-4 font-semibold">Batch</th>
              <th className="py-2.5 pr-4 font-semibold">Dates</th>
              <th className="py-2.5 pr-4 font-semibold">Status</th>
              <th className="py-2.5 pr-4 font-semibold">Students</th>
              <th className="py-2.5 font-semibold">Tutors</th>
            </tr>
          </thead>
          <tbody>
            {batches?.map((b) => (
              <tr key={b.id} className="border-b border-line align-top">
                <td className="py-3 pr-4">
                  <a href={`/admin/batches/view/?id=${b.id}`} className="font-semibold text-accent-strong hover:underline">
                    {b.name}
                  </a>
                  <span className="block text-sm text-ink-muted">{b.programme?.name}</span>
                </td>
                <td className="py-3 pr-4 whitespace-nowrap">
                  {formatDate(b.start_date)} to {formatDate(b.end_date)}
                </td>
                <td className="py-3 pr-4">{batchStatusLabel[b.status]}</td>
                <td className="py-3 pr-4 tabular-nums">{b.student_count}</td>
                <td className="py-3 tabular-nums">{b.tutor_count}</td>
              </tr>
            ))}
            {batches && batches.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-ink-muted">
                  No batches match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
