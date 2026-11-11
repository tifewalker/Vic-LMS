"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { controlClass } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";

type Candidate = { id: string; full_name: string; email: string; status: string; matric_no?: string; tutor_id?: string };

/** Searchable multi-select of students or tutors not yet enrolled in a programme. */
export function PeoplePicker({
  programmeId,
  type,
  onDone,
  onCancel,
}: {
  programmeId: string;
  type: "students" | "tutors";
  onDone: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ type, q: search });
    api<{ candidates: Candidate[] }>(`/admin/programmes/${programmeId}/candidates?${params}`).then((res) => {
      if (cancelled) return;
      if (res.ok) setCandidates(res.data.candidates);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [programmeId, type, search]);

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
    const res = await api<{ added: number; skipped: number }>(`/admin/programmes/${programmeId}/${type}`, { body: { [key]: [...selected] } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    const noun = type === "students" ? "student" : "tutor";
    toast(`Added ${res.data.added} ${noun}${res.data.added === 1 ? "" : "s"}.${res.data.skipped ? ` ${res.data.skipped} skipped.` : ""}`);
    onDone();
  }

  const label = type === "students" ? "Enrol students" : "Assign tutors";

  return (
    <section aria-label={label} className="border border-line bg-paper p-6">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
        }}
      >
        <label className="block min-w-0 flex-1 basis-60">
          <span className="block text-ui-sm font-semibold">{type === "students" ? "Search students not yet in this programme" : "Search tutors not yet in this programme"}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or ID" className={cx(controlClass, "mt-2 h-11")} />
        </label>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {error ? <Notice tone="error" className="mt-4">{error}</Notice> : null}

      <div className="mt-4 max-h-80 overflow-y-auto border-y border-line">
        {candidates === null ? (
          <SkeletonLines lines={4} className="py-4" />
        ) : candidates.length === 0 ? (
          <p className="py-4 text-ui-sm text-ink-muted">No one to add{search ? " for this search" : ""}.</p>
        ) : (
          <ul>
            {candidates.map((c) => (
              <li key={c.id} className="border-b border-line last:border-b-0">
                <label className="flex cursor-pointer items-start gap-3 px-1 py-3 hover:bg-paper-2/70">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--accent)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{c.full_name}</span>
                    <span className="block text-ui-xs break-words text-ink-muted">{[c.matric_no ?? c.tutor_id, c.email].filter(Boolean).join(" · ")}</span>
                  </span>
                  {c.status === "invited" ? <StatusLabel status="invited" /> : null}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      {candidates?.length === 50 ? <p className="mt-2 text-ui-xs text-ink-muted">Showing the first 50. Search to narrow the list.</p> : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={add} loading={busy} loadingText="Adding…" disabled={selected.size === 0}>
          {label}
          {selected.size ? ` (${selected.size})` : ""}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Close
        </Button>
      </div>
    </section>
  );
}
