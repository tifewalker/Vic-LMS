"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { useLoad } from "@/lib/useLoad";

type Row = {
  id: string;
  title: string;
  is_active: boolean;
  students: number;
  tutors: number;
  classes_total: number;
  classes_held: number;
  assessments: number;
  handed_in: number;
  to_grade: number;
  released: number;
  open_questions: number;
};

/** One row per programme: people, classes, assessments and grading. */
export default function ReportsPage() {
  const router = useRouter();
  const { data, error } = useLoad<{ programmes: Row[] }>("/admin/reports");
  return (
    <>
      <PageHeader kicker="Reports" title="Reports" description="Each programme at a glance: people, classes held, assessments and grading." />
      {error ? <Notice tone="error" className="mt-6">{error}</Notice> : null}
      <div className="mt-6">
        <DataTable
          caption="Programme report"
          rows={data?.programmes ?? null}
          rowKey={(r) => r.id}
          onRowClick={(r) => router.push(`/admin/programmes/view/?id=${r.id}`)}
          empty={<EmptyState title="No programmes yet." />}
          columns={[
            {
              key: "title",
              header: "Programme",
              primary: true,
              cell: (r) => (
                <>
                  <a href={`/admin/programmes/view/?id=${r.id}`} className="font-semibold text-ink hover:text-accent-strong hover:underline">
                    {r.title}
                  </a>
                  {!r.is_active ? <StatusLabel status="ended" label="Inactive" className="ml-2" /> : null}
                </>
              ),
            },
            { key: "students", header: "Students", numeric: true, cell: (r) => r.students },
            { key: "tutors", header: "Tutors", numeric: true, cell: (r) => r.tutors },
            { key: "classes", header: "Classes held", numeric: true, cell: (r) => `${r.classes_held} of ${r.classes_total}` },
            { key: "assessments", header: "Assessments", numeric: true, cell: (r) => r.assessments },
            { key: "in", header: "Handed in", numeric: true, cell: (r) => r.handed_in },
            { key: "grade", header: "To grade", numeric: true, cell: (r) => (r.to_grade ? <span className="font-semibold text-accent-strong">{r.to_grade}</span> : 0) },
            { key: "released", header: "Grades released", numeric: true, cell: (r) => r.released },
            { key: "questions", header: "Open questions", numeric: true, cell: (r) => r.open_questions },
          ]}
        />
      </div>
    </>
  );
}
