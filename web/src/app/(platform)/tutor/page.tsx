"use client";

import { useEffect, useState } from "react";
import { ClassList } from "@/components/platform/ClassList";
import { useMe } from "@/components/platform/RequireRole";
import { Notice, PageTitle } from "@/components/platform/ui";
import { api } from "@/lib/api";
import type { ClassItem } from "@/lib/types";

type Programme = { id: string; title: string; description: string; student_count: number };

export default function TutorDashboard() {
  const me = useMe();
  const [data, setData] = useState<{ programmes: Programme[]; upcoming: ClassItem[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ programmes: Programme[]; upcoming: ClassItem[] }>("/tutor/programmes").then((res) => (res.ok ? setData(res.data) : setError(res.error)));
  }, []);

  return (
    <>
      <PageTitle kicker={me.tutor_id ? `Tutor · ${me.tutor_id}` : "Teaching"} title={`Welcome, ${me.full_name.split(" ")[0]}`} />
      {error ? (
        <div className="mt-6">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      <section className="mt-8" aria-labelledby="upcoming-title">
        <h2 id="upcoming-title" className="text-2xl">
          Upcoming classes
        </h2>
        <div className="mt-3">{data ? <ClassList classes={data.upcoming} showProgramme /> : <p className="text-ink-muted">Loading…</p>}</div>
      </section>

      <section className="mt-10" aria-labelledby="programmes-title">
        <h2 id="programmes-title" className="text-2xl">
          My programmes
        </h2>
        <ul className="mt-3 border-t border-line">
          {data?.programmes.length === 0 ? (
            <li className="py-4 text-ink-muted">You have not been assigned to a programme yet. The programme admin will add you.</li>
          ) : null}
          {data?.programmes.map((p) => (
            <li key={p.id} className="border-b border-line">
              <a href={`/tutor/programme/?id=${p.id}`} className="group grid gap-1 py-4 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6">
                <span>
                  <span className="block font-serif text-xl group-hover:text-accent-strong">{p.title}</span>
                  <span className="block text-sm text-ink-muted">{p.description}</span>
                </span>
                <span className="text-[0.9375rem] text-ink-muted">
                  {p.student_count} student{p.student_count === 1 ? "" : "s"}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
