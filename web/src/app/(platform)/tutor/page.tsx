"use client";

import { useEffect, useState } from "react";
import { useMe } from "@/components/platform/RequireRole";
import { Notice, PageTitle } from "@/components/platform/ui";
import { api } from "@/lib/api";
import { batchStatusLabel, formatDate } from "@/lib/dates";

type Batch = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  programme: { name: string } | null;
  student_count: number;
};

export default function TutorDashboard() {
  const me = useMe();
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ batches: Batch[] }>("/tutor/batches").then((res) => (res.ok ? setBatches(res.data.batches) : setError(res.error)));
  }, []);

  return (
    <>
      <PageTitle kicker={`Tutor · ${me.tutor_id}`} title={`Welcome, ${me.full_name.split(" ")[0]}`} />
      <h2 className="mt-8 text-2xl">My batches</h2>
      {error ? (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
      <ul className="mt-4 border-t border-line">
        {batches === null && !error ? <li className="py-4 text-ink-muted">Loading…</li> : null}
        {batches?.length === 0 ? (
          <li className="py-4 text-ink-muted">You have not been assigned to a batch yet. The programme admin will add you.</li>
        ) : null}
        {batches?.map((b) => (
          <li key={b.id} className="border-b border-line">
            <a href={`/tutor/batch/?id=${b.id}`} className="group grid gap-1 py-4 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6">
              <span>
                <span className="block font-serif text-xl group-hover:text-accent-strong">{b.name}</span>
                <span className="block text-sm text-ink-muted">{b.programme?.name}</span>
              </span>
              <span className="text-[0.9375rem] text-ink-muted sm:text-right">
                {b.student_count} student{b.student_count === 1 ? "" : "s"} · {batchStatusLabel[b.status]} · {formatDate(b.start_date)} to{" "}
                {formatDate(b.end_date)}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
