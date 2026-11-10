"use client";

import { useEffect, useState } from "react";
import { ClassStatus } from "@/components/platform/Tabs";
import { useMe } from "@/components/platform/RequireRole";
import { buttonClass, Notice, PageTitle } from "@/components/platform/ui";
import { api } from "@/lib/api";
import { formatDateTime, formatTimeRange } from "@/lib/dates";
import type { ClassItem, StudentAssessment } from "@/lib/types";

type Overview = {
  programmes: { id: string; title: string; description: string }[];
  next_class: ClassItem | null;
  recent_grades: StudentAssessment[];
  due: StudentAssessment[];
};

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
  const next = data.next_class;

  return (
    <>
      <PageTitle kicker={`Student · ${me.matric_no}`} title={`Welcome, ${first}`} />

      {data.programmes.length === 0 ? (
        <p className="mt-8 max-w-xl">You have not been enrolled in a programme yet. The programme admin will add you.</p>
      ) : (
        <>
          <section className="mt-8 border border-line p-5 md:p-6" aria-labelledby="next-title">
            <p className="kicker">Next class</p>
            {next ? (
              <>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h2 id="next-title" className="text-[1.75rem]">
                    {next.title}
                  </h2>
                  <ClassStatus status={next.status} />
                </div>
                <p className="mt-1 text-ink-muted">
                  {formatDateTime(next.starts_at)}, {formatTimeRange(next.starts_at, next.ends_at)} · {next.programme?.title}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                  {next.youtube_url ? (
                    <a href={next.youtube_url} target="_blank" rel="noopener noreferrer" className={buttonClass()}>
                      Join class
                      <span className="sr-only"> on YouTube (opens in a new tab)</span>
                    </a>
                  ) : (
                    <span className="text-ink-muted">The joining link will appear here before the class.</span>
                  )}
                  <a href={`/class/?id=${next.id}`} className="font-semibold text-accent-strong hover:underline">
                    Class page, Q&amp;A and discussion
                  </a>
                </div>
              </>
            ) : (
              <h2 id="next-title" className="mt-2 text-xl text-ink-muted">
                No upcoming classes.
              </h2>
            )}
          </section>

          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            <section aria-labelledby="due-title">
              <h2 id="due-title" className="text-2xl">
                Due
              </h2>
              <ul className="mt-3 border-t border-line">
                {data.due.length === 0 ? <li className="py-3 text-ink-muted">Nothing due right now.</li> : null}
                {data.due.map((a) => (
                  <li key={a.id} className="border-b border-line py-3">
                    <a href={`/student/programme/?id=${a.programme_id}#assessments`} className="font-semibold text-accent-strong hover:underline">
                      {a.title}
                    </a>
                    <span className="block text-sm text-ink-muted">
                      {a.due_at ? `Due ${formatDateTime(a.due_at)}` : "No deadline"} · {a.programme?.title}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="grades-title">
              <h2 id="grades-title" className="text-2xl">
                Recent grades
              </h2>
              <ul className="mt-3 border-t border-line">
                {data.recent_grades.length === 0 ? <li className="py-3 text-ink-muted">No grades released yet.</li> : null}
                {data.recent_grades.map((a) => (
                  <li key={a.id} className="flex items-baseline justify-between gap-4 border-b border-line py-3">
                    <span>
                      <span className="block">{a.title}</span>
                      <span className="block text-sm text-ink-muted">{a.programme?.title}</span>
                    </span>
                    <span className="font-serif text-xl tabular-nums">
                      {Number(a.my_submission!.grade!.score)}/{Number(a.max_score)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="mt-10" aria-labelledby="programmes-title">
            <h2 id="programmes-title" className="text-2xl">
              My programmes
            </h2>
            <ul className="mt-3 border-t border-line">
              {data.programmes.map((p) => (
                <li key={p.id} className="border-b border-line">
                  <a href={`/student/programme/?id=${p.id}`} className="group block py-4">
                    <span className="block font-serif text-xl group-hover:text-accent-strong">{p.title}</span>
                    <span className="block text-sm text-ink-muted">{p.description}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
