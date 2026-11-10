"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button, inputClass, Notice } from "./ui";

type Candidate = { id: string; full_name: string; email: string; status: string; matric_no?: string; tutor_id?: string };

/**
 * Searchable multi-select of people who can join a batch: students not yet in a batch of this
 * programme, or tutors not yet on this batch.
 */
export function PeoplePicker({
  batchId,
  type,
  onDone,
  onCancel,
}: {
  batchId: string;
  type: "students" | "tutors";
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ type, q: search });
    api<{ candidates: Candidate[] }>(`/admin/batches/${batchId}/candidates?${params}`).then((res) => {
      if (cancelled) return;
      if (res.ok) setCandidates(res.data.candidates);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [batchId, type, search]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function add() {
    setBusy(true);
    const key = type === "students" ? "student_ids" : "tutor_ids";
    const res = await api<{ added: number; skipped: number }>(`/admin/batches/${batchId}/${type}`, {
      body: { [key]: [...selected] },
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    const noun = type === "students" ? "student" : "tutor";
    onDone(
      `Added ${res.data.added} ${noun}${res.data.added === 1 ? "" : "s"}.${res.data.skipped ? ` ${res.data.skipped} skipped (already placed).` : ""}`,
    );
  }

  const label = type === "students" ? "Add students" : "Assign tutors";

  return (
    <section aria-label={label} className="mt-6 border border-line bg-paper p-4 md:p-5">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
        }}
      >
        <label className="block min-w-0 flex-1 basis-56">
          <span className="block text-sm font-semibold">
            {type === "students" ? "Search students not yet in a batch for this programme" : "Search tutors"}
          </span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className={`mt-1 ${inputClass}`} />
        </label>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {error ? (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      <ul className="mt-4 max-h-80 overflow-y-auto border-y border-line">
        {candidates === null ? (
          <li className="py-3 text-sm text-ink-muted">Loading…</li>
        ) : candidates.length === 0 ? (
          <li className="py-3 text-sm text-ink-muted">No one to add{search ? " for this search" : ""}.</li>
        ) : (
          candidates.map((c) => (
            <li key={c.id} className="border-b border-line last:border-b-0">
              <label className="flex cursor-pointer items-start gap-3 py-2.5">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="mt-1 size-4 accent-[var(--accent)]" />
                <span className="min-w-0">
                  <span className="block">{c.full_name}</span>
                  <span className="block text-sm break-words text-ink-muted">
                    {[c.matric_no ?? c.tutor_id, c.email, c.status === "invited" ? "not activated" : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </label>
            </li>
          ))
        )}
      </ul>
      {candidates && candidates.length === 50 ? (
        <p className="mt-2 text-sm text-ink-muted">Showing the first 50. Search to narrow the list.</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={add} disabled={busy || selected.size === 0}>
          {busy ? "Adding…" : `${label}${selected.size ? ` (${selected.size})` : ""}`}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Close
        </Button>
      </div>
    </section>
  );
}
