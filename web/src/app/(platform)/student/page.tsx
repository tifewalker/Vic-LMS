"use client";

import { useEffect, useState } from "react";
import { PhaseRuler } from "@/components/marketing/PhaseRuler";
import { useMe } from "@/components/platform/RequireRole";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { PageHeader, SectionTitle } from "@/components/ui/PageHeader";
import { SkeletonLines, SkeletonPage } from "@/components/ui/Skeleton";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { structure } from "@/content/landing";
import { api } from "@/lib/api";
import { formatClassTime, formatDateTime } from "@/lib/dates";
import type { ClassItem, StudentAssessment } from "@/lib/types";

type Overview = {
  programmes: { id: string; title: string; description: string }[];
  next_class: ClassItem | null;
  recent_grades: StudentAssessment[];
  due: StudentAssessment[];
  announcements: { id: string; programme_id: string; title: string; body: string; pinned: boolean; created_at: string; programme: { title: string } | null }[];
};

const linkClass = "font-semibold text-ink hover:text-accent-strong hover:underline";

/** The next class: the main block. Join is the primary action only while the class is live. */
function NextClass({ c }: { c: ClassItem | null }) {
  if (!c) {
    return (
      <section aria-labelledby="next-title" className="border-y border-line py-8">
        <p className="ui-label">Next class</p>
        <h2 id="next-title" className="mt-2 font-serif text-ui-lg">
          No upcoming classes.
        </h2>
        <p className="mt-1 text-ui-sm text-ink-muted">When your next class is scheduled, it will appear here with a Join button.</p>
      </section>
    );
  }
  const live = c.status === "live";
  return (
    <section aria-labelledby="next-title" className={live ? "border-y border-l-2 border-line border-l-sage bg-paper-2/60 px-6 py-8" : "border-y border-line py-8"}>
      <div className="flex flex-wrap items-center gap-3">
        <p className="ui-label">{live ? "Happening now" : "Next class"}</p>
        <StatusLabel status={c.status} />
      </div>
      <h2 id="next-title" className="mt-2 font-serif text-ui-xl">
        {c.title}
      </h2>
      <p className="mt-2 text-ui-md text-ink">{formatClassTime(c.starts_at, c.ends_at)}</p>
      {c.programme ? <p className="text-ui-sm text-ink-muted">{c.programme.title}</p> : null}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        {live && c.youtube_url ? (
          <ButtonLink href={c.youtube_url} external className="h-12 px-6 text-ui-md">
            Join class on YouTube
          </ButtonLink>
        ) : (
          <span className="text-ui-sm text-ink-muted">{c.youtube_url ? "The Join button appears here when the class goes live." : "The joining link will appear here before the class."}</span>
        )}
        <a href={`/class/?id=${c.id}`} className="text-ui-sm font-semibold text-accent-strong underline decoration-accent/40 underline-offset-[0.22em] hover:decoration-accent-strong">
          Class page, Q&amp;A and materials
        </a>
      </div>
    </section>
  );
}

export default function StudentDashboard() {
  const me = useMe();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Overview>("/student/overview").then((res) => (res.ok ? setData(res.data) : setError(res.error)));
  }, []);

  const header = <PageHeader kicker={`Student · ${me.matric_no}`} title={`Welcome, ${me.full_name.split(" ")[0]}`} />;
  if (error) return <>{header}<Notice tone="error" className="mt-6">{error}</Notice></>;
  if (!data) return <SkeletonPage />;

  if (data.programmes.length === 0) {
    return (
      <>
        {header}
        <div className="mt-8">
          <EmptyState title="You are not in a programme yet." text="The programme admin will enrol you. Your classes and materials will appear here." />
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="mt-8">
        <NextClass c={data.next_class} />
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="due-title">
          <SectionTitle id="due-title">Due</SectionTitle>
          {data.due.length === 0 ? (
            <p className="mt-4 border-y border-line py-6 text-ui-sm text-ink-muted">Nothing due right now.</p>
          ) : (
            <ul className="mt-4 border-t border-line">
              {data.due.map((a) => (
                <li key={a.id} className="border-b border-line py-4">
                  <a href={`/student/programme/?id=${a.programme_id}#assessments`} className={linkClass}>
                    {a.title}
                  </a>
                  <span className="block text-ui-xs text-ink-muted">
                    {a.due_at ? `Due ${formatDateTime(a.due_at)}` : "No deadline"} · {a.programme?.title}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="news-title">
          <SectionTitle id="news-title">Latest announcements</SectionTitle>
          {data.announcements.length === 0 ? (
            <p className="mt-4 border-y border-line py-6 text-ui-sm text-ink-muted">No announcements yet.</p>
          ) : (
            <ul className="mt-4 border-t border-line">
              {data.announcements.map((a) => (
                <li key={a.id} className="border-b border-line py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <a href={`/student/programme/?id=${a.programme_id}`} className={linkClass}>
                      {a.title}
                    </a>
                    {a.pinned ? <StatusLabel status="pinned" /> : null}
                  </div>
                  <span className="block text-ui-xs text-ink-muted">
                    {a.programme?.title} · {formatDateTime(a.created_at)}
                  </span>
                  <p className="mt-1 line-clamp-2 max-w-measure">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-12" aria-labelledby="phases-title">
        <SectionTitle id="phases-title">The 26 weeks</SectionTitle>
        <p className="mt-1 max-w-measure text-ui-sm text-ink-muted">
          {structure.phases.map((p) => `${p.label} (${p.weeksLabel.toLowerCase()}): ${p.title}`).join(". ")}.
        </p>
        <PhaseRuler compact className="mt-6" />
      </section>

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="grades-title">
          <SectionTitle id="grades-title">Recent grades</SectionTitle>
          {data.recent_grades.length === 0 ? (
            <p className="mt-4 border-y border-line py-6 text-ui-sm text-ink-muted">No grades released yet.</p>
          ) : (
            <ul className="mt-4 border-t border-line">
              {data.recent_grades.map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-4 border-b border-line py-4">
                  <span className="min-w-0">
                    <span className="block font-semibold">{a.title}</span>
                    <span className="block text-ui-xs text-ink-muted">{a.programme?.title}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <span className="font-serif text-ui-lg">{Number(a.my_submission!.grade!.score)}</span>
                    <span className="text-ink-muted"> / {Number(a.max_score)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="programmes-title">
          <SectionTitle id="programmes-title">My programmes</SectionTitle>
          {data.programmes ? (
            <ul className="mt-4 border-t border-line">
              {data.programmes.map((p) => (
                <li key={p.id} className="border-b border-line py-4">
                  <a href={`/student/programme/?id=${p.id}`} className={linkClass}>
                    {p.title}
                  </a>
                  <span className="block text-ui-xs text-ink-muted">{p.description}</span>
                </li>
              ))}
            </ul>
          ) : (
            <SkeletonLines />
          )}
        </section>
      </div>
    </>
  );
}
