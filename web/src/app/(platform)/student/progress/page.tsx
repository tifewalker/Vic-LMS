"use client";

import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { PageHeader, SectionTitle } from "@/components/ui/PageHeader";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Stats } from "@/components/ui/Stats";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { formatDate } from "@/lib/dates";
import { useLoad } from "@/lib/useLoad";

type Item = {
  id: string;
  title: string;
  due_at: string | null;
  max_score: number;
  mode: "digital" | "paper";
  status: string | null;
  grade: { score: number; feedback: string; graded_at: string } | null;
};
type Programme = { id: string; title: string; classes_total: number; classes_held: number; assessments: Item[] };

/** Per programme: classes held so far, work handed in and grades released. */
export default function ProgressPage() {
  const { data, error } = useLoad<{ programmes: Programme[] }>("/student/progress");

  return (
    <>
      <PageHeader kicker="Learning" title="My progress" description="How far each programme has come, what you have handed in, and the grades your tutors have released." />
      {error ? <Notice tone="error" className="mt-6">{error}</Notice> : null}
      {!data ? (
        <div className="mt-8">
          <SkeletonRows rows={4} />
        </div>
      ) : data.programmes.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="You are not in a programme yet." text="Your programmes appear here once the programme admin adds you." />
        </div>
      ) : (
        data.programmes.map((p) => {
          const handedIn = p.assessments.filter((a) => a.status).length;
          const graded = p.assessments.filter((a) => a.grade);
          return (
            <section key={p.id} aria-labelledby={`p-${p.id}`} className="mt-10">
              <SectionTitle id={`p-${p.id}`}>
                <a href={`/student/programme/?id=${p.id}`} className="hover:text-accent-strong hover:underline">
                  {p.title}
                </a>
              </SectionTitle>
              <div className="mt-4">
                <Stats
                  label={`${p.title} progress`}
                  items={[
                    { label: "Classes held", value: `${p.classes_held} of ${p.classes_total}` },
                    { label: "Handed in", value: `${handedIn} of ${p.assessments.length}` },
                    { label: "Grades released", value: graded.length },
                  ]}
                />
              </div>
              <div className="mt-6">
                <DataTable
                  caption={`${p.title} assessments`}
                  rows={p.assessments}
                  rowKey={(a) => a.id}
                  empty={<EmptyState title="No assessments yet." />}
                  columns={[
                    { key: "title", header: "Assessment", primary: true, cell: (a) => <span className="font-semibold">{a.title}</span> },
                    { key: "due", header: "Due", cell: (a) => (a.due_at ? formatDate(a.due_at) : <span className="text-ink-muted">No due date</span>) },
                    { key: "status", header: "Status", className: "w-40", cell: (a) => <StatusLabel status={a.grade ? "graded" : (a.status ?? "not_submitted")} /> },
                    {
                      key: "grade",
                      header: "Grade",
                      numeric: true,
                      className: "w-28",
                      cell: (a) => (a.grade ? `${a.grade.score} / ${a.max_score}` : <span className="text-ink-muted">Not yet</span>),
                    },
                  ]}
                />
              </div>
            </section>
          );
        })
      )}
    </>
  );
}
