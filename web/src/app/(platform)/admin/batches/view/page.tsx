"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ConfirmButton } from "@/components/platform/ConfirmButton";
import { PeoplePicker } from "@/components/platform/PeoplePicker";
import { Button, Field, inputClass, Notice, PageTitle } from "@/components/platform/ui";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { batchStatusLabel, formatDate } from "@/lib/dates";

type Person = { id: string; full_name: string; email: string; status: string };
type Detail = {
  batch: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    status: string;
    programme: { id: string; name: string; duration_weeks: number } | null;
    student_count: number;
    tutor_count: number;
  };
  students: (Person & { matric_no: string; joined_at: string })[];
  tutors: (Person & { tutor_id: string; assigned_at: string })[];
};

const accountLabel: Record<string, string> = { invited: "Not activated", active: "Active", suspended: "Suspended" };

function BatchView() {
  const id = useSearchParams().get("id") ?? "";
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"students" | "tutors">("students");
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<null | { name: string; start_date: string; end_date: string; status: string }>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api<Detail>(`/admin/batches/${encodeURIComponent(id)}`).then((res) => {
      if (cancelled) return;
      if (res.ok) setData(res.data);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  async function remove(kind: "students" | "tutors", personId: string, name: string) {
    const res = await api(`/admin/batches/${id}/${kind}/${personId}`, { method: "DELETE" });
    setNotice(res.ok ? `${name} removed from this batch.` : res.error);
    reload();
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const res = await api(`/admin/batches/${id}`, { method: "PATCH", body: editing });
    if (!res.ok) return setError(res.error);
    setEditing(null);
    setError("");
    setNotice("Batch saved.");
    reload();
  }

  if (!id) return <Notice tone="error">No batch was chosen.</Notice>;
  if (!data) return error ? <Notice tone="error">{error}</Notice> : <p className="text-ink-muted">Loading…</p>;

  const { batch } = data;
  const rows = tab === "students" ? data.students : data.tutors;

  return (
    <>
      <PageTitle kicker={batch.programme?.name} title={batch.name}>
        {!editing ? (
          <Button
            variant="secondary"
            onClick={() => setEditing({ name: batch.name, start_date: batch.start_date, end_date: batch.end_date, status: batch.status })}
          >
            Edit details
          </Button>
        ) : null}
      </PageTitle>

      <dl className="mt-6 grid max-w-3xl border-t border-line text-[0.9375rem] sm:grid-cols-3 sm:gap-x-8">
        <div className="border-b border-line py-3">
          <dt className="text-sm text-ink-muted">Dates</dt>
          <dd>
            {formatDate(batch.start_date)} to {formatDate(batch.end_date)}
          </dd>
        </div>
        <div className="border-b border-line py-3">
          <dt className="text-sm text-ink-muted">Status</dt>
          <dd>{batchStatusLabel[batch.status]}</dd>
        </div>
        <div className="border-b border-line py-3">
          <dt className="text-sm text-ink-muted">People</dt>
          <dd>
            {batch.student_count} student{batch.student_count === 1 ? "" : "s"}, {batch.tutor_count} tutor
            {batch.tutor_count === 1 ? "" : "s"}
          </dd>
        </div>
      </dl>

      {editing ? (
        <form onSubmit={saveDetails} className="mt-6 max-w-2xl space-y-5 border border-line p-5" noValidate>
          <Field label="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Start date" type="date" value={editing.start_date} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} />
            <Field label="End date" type="date" value={editing.end_date} onChange={(e) => setEditing({ ...editing, end_date: e.target.value })} />
          </div>
          <label className="block max-w-56">
            <span className="block text-[0.9375rem] font-semibold">Status</span>
            <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className={`mt-1.5 ${inputClass}`}>
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <div className="flex gap-3">
            <Button type="submit">Save</Button>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <div className="mt-6 space-y-3">
        {notice ? <Notice>{notice}</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-line">
        <div role="tablist" aria-label="People in this batch" className="flex gap-6">
          {(["students", "tutors"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => {
                setTab(t);
                setPicking(false);
              }}
              className={cx(
                "-mb-px cursor-pointer border-b-2 pb-2.5 text-[0.9375rem]",
                tab === t ? "border-accent font-semibold text-ink" : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {t === "students" ? `Students (${data.students.length})` : `Tutors (${data.tutors.length})`}
            </button>
          ))}
        </div>
        {!picking ? (
          <Button size="sm" className="mb-2" onClick={() => setPicking(true)}>
            {tab === "students" ? "Add students" : "Assign tutor"}
          </Button>
        ) : null}
      </div>

      {picking ? (
        <PeoplePicker
          key={tab}
          batchId={id}
          type={tab}
          onCancel={() => setPicking(false)}
          onDone={(message) => {
            setPicking(false);
            setNotice(message);
            reload();
          }}
        />
      ) : null}

      <div className="relative mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-[0.9375rem]">
          <thead>
            <tr className="border-b border-line text-sm text-ink-muted">
              <th className="py-2.5 pr-4 font-semibold">Name</th>
              <th className="py-2.5 pr-4 font-semibold">{tab === "students" ? "Matric no." : "Tutor ID"}</th>
              <th className="py-2.5 pr-4 font-semibold">Account</th>
              <th className="py-2.5 font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-line align-top">
                <td className="py-3 pr-4">
                  <span className="block">{p.full_name}</span>
                  <span className="block text-sm text-ink-muted">{p.email}</span>
                </td>
                <td className="py-3 pr-4 tabular-nums">{"matric_no" in p ? p.matric_no : p.tutor_id}</td>
                <td className="py-3 pr-4">{accountLabel[p.status] ?? p.status}</td>
                <td className="py-3 text-right">
                  <ConfirmButton
                    label="Remove"
                    question={`Remove ${p.full_name.split(" ")[0]}?`}
                    confirmLabel="Remove"
                    onConfirm={() => remove(tab, p.id, p.full_name)}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-ink-muted">
                  {tab === "students" ? "No students in this batch yet." : "No tutors assigned yet."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="mt-8">
        <a href="/admin/batches/" className="text-accent-strong hover:underline">
          Back to batches
        </a>
      </p>
    </>
  );
}

export default function BatchViewPage() {
  return (
    <Suspense>
      <BatchView />
    </Suspense>
  );
}
