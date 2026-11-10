"use client";

import { useEffect, useState } from "react";
import { PhaseRuler } from "@/components/marketing/PhaseRuler";
import { useMe } from "@/components/platform/RequireRole";
import { Notice, PageTitle } from "@/components/platform/ui";
import { structure } from "@/content/landing";
import { api } from "@/lib/api";
import { batchStatusLabel, formatDate, weekOf } from "@/lib/dates";

type Overview = {
  batch: { id: string; name: string; start_date: string; end_date: string; status: string } | null;
  programme: { name: string; description: string; duration_weeks: number; training_areas: { title: string }[] } | null;
  tutors: string[];
};

function whereWeAre(start: string, weeks: number): { week: number | null; text: string } {
  const week = weekOf(start);
  if (week < 1) return { week: null, text: `The programme starts on ${formatDate(start, "long")}.` };
  if (week > weeks) return { week: null, text: "The programme has finished." };
  const phase = structure.phases.find((p) => week >= p.weeks.from && week <= p.weeks.to);
  return { week, text: `This is week ${week} of ${weeks}${phase ? `: ${phase.label}, ${phase.title}` : ""}.` };
}

export default function StudentDashboard() {
  const me = useMe();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Overview>("/student/overview").then((res) => (res.ok ? setData(res.data) : setError(res.error)));
  }, []);

  const first = me.full_name.split(" ")[0];
  if (error) return <Notice tone="error">{error}</Notice>;
  if (!data) return <p className="text-ink-muted">Loading…</p>;

  if (!data.batch || !data.programme) {
    return (
      <>
        <PageTitle kicker={`Student · ${me.matric_no}`} title={`Welcome, ${first}`} />
        <p className="mt-8 max-w-xl">You have not been placed in a batch yet. The programme admin will add you before the programme starts.</p>
      </>
    );
  }

  const { batch, programme } = data;
  const now = whereWeAre(batch.start_date, programme.duration_weeks);
  // The phase bar describes the 26-week OAUSTECH structure.
  const showBar = programme.duration_weeks === structure.phases.at(-1)!.weeks.to;

  return (
    <>
      <PageTitle kicker={`Student · ${me.matric_no}`} title={`Welcome, ${first}`} />

      <dl className="mt-8 grid max-w-4xl border-t border-line text-[0.9375rem] md:grid-cols-2 md:gap-x-10">
        <div className="border-b border-line py-3 md:col-span-2">
          <dt className="text-sm text-ink-muted">Programme</dt>
          <dd className="font-serif text-xl leading-snug">{programme.name}</dd>
        </div>
        <div className="border-b border-line py-3">
          <dt className="text-sm text-ink-muted">Batch</dt>
          <dd>
            {batch.name} · {batchStatusLabel[batch.status]}
          </dd>
        </div>
        <div className="border-b border-line py-3">
          <dt className="text-sm text-ink-muted">Dates</dt>
          <dd>
            {formatDate(batch.start_date, "long")} to {formatDate(batch.end_date, "long")}
          </dd>
        </div>
        <div className="border-b border-line py-3 md:col-span-2">
          <dt className="text-sm text-ink-muted">{data.tutors.length === 1 ? "Tutor" : "Tutors"}</dt>
          <dd>{data.tutors.length ? data.tutors.join(", ") : "To be assigned"}</dd>
        </div>
      </dl>

      <section className="mt-10" aria-labelledby="progress-title">
        <h2 id="progress-title" className="text-2xl">
          Where we are
        </h2>
        <p className="mt-2">{now.text}</p>
        {showBar ? <PhaseRuler currentWeek={now.week} compact className="mt-6" /> : null}
      </section>

      {programme.training_areas.length ? (
        <section className="mt-10 max-w-3xl" aria-labelledby="areas-title">
          <h2 id="areas-title" className="text-2xl">
            Training areas
          </h2>
          <ol className="mt-4 border-t border-line">
            {programme.training_areas.map((a, i) => (
              <li key={a.title} className="grid grid-cols-[2.25rem_1fr] border-b border-line py-2.5">
                <span className="font-serif text-accent-strong tabular-nums" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{a.title}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </>
  );
}
