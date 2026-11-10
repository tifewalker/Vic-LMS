"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Notice, PageTitle } from "@/components/platform/ui";
import { api } from "@/lib/api";
import { batchStatusLabel, formatDate } from "@/lib/dates";

type Roster = {
  batch: { id: string; name: string; start_date: string; end_date: string; status: string; programme: { name: string } | null };
  students: { id: string; full_name: string; email: string; status: string; matric_no: string }[];
};

const accountLabel: Record<string, string> = { invited: "Not activated", active: "Active", suspended: "Suspended" };

function TutorBatch() {
  const id = useSearchParams().get("id") ?? "";
  const [data, setData] = useState<Roster | null>(null);
  const [error, setError] = useState(id ? "" : "No batch was chosen.");

  useEffect(() => {
    if (!id) return;
    api<Roster>(`/tutor/batches/${encodeURIComponent(id)}/students`).then((res) => (res.ok ? setData(res.data) : setError(res.error)));
  }, [id]);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!data) return <p className="text-ink-muted">Loading…</p>;
  const activated = data.students.filter((s) => s.status === "active").length;

  return (
    <>
      <PageTitle kicker={data.batch.programme?.name} title={data.batch.name} />
      <p className="mt-4 text-ink-muted">
        {formatDate(data.batch.start_date)} to {formatDate(data.batch.end_date)} · {batchStatusLabel[data.batch.status]} ·{" "}
        {data.students.length} students, {activated} activated
      </p>

      <div className="relative mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-[0.9375rem]">
          <thead>
            <tr className="border-y border-line text-sm text-ink-muted">
              <th className="py-2.5 pr-4 font-semibold">Name</th>
              <th className="py-2.5 pr-4 font-semibold">Matric no.</th>
              <th className="py-2.5 font-semibold">Account</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((s) => (
              <tr key={s.id} className="border-b border-line align-top">
                <td className="py-3 pr-4">
                  <span className="block">{s.full_name}</span>
                  <span className="block text-sm text-ink-muted">{s.email}</span>
                </td>
                <td className="py-3 pr-4 tabular-nums">{s.matric_no}</td>
                <td className="py-3">{accountLabel[s.status] ?? s.status}</td>
              </tr>
            ))}
            {data.students.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-ink-muted">
                  No students in this batch yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="mt-8">
        <a href="/tutor/" className="text-accent-strong hover:underline">
          Back to my batches
        </a>
      </p>
    </>
  );
}

export default function TutorBatchPage() {
  return (
    <Suspense>
      <TutorBatch />
    </Suspense>
  );
}
