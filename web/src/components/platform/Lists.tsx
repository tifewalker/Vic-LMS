"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { Tabs } from "@/components/ui/Tabs";
import { formatDateTime } from "@/lib/dates";
import type { ClassItem } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";
import { ClassList } from "./ClassList";

/* Cross-programme list pages shared by admins, tutors and students. */

type ClassRow = ClassItem & { programme_title: string; live: boolean };

/** Every class across the user's programmes: live and upcoming first, then past. */
export function ClassesPage({ path, kicker, editable = false }: { path: string; kicker: string; editable?: boolean }) {
  const { data, error } = useLoad<{ classes: ClassRow[] }>(path);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [now] = useState(() => Date.now());
  const rows = (data?.classes ?? []).map((c) => ({ ...c, status: c.live ? ("live" as const) : c.status, programme: { title: c.programme_title } }));
  const upcoming = rows.filter((c) => c.live || Date.parse(c.ends_at) > now).sort((a, b) => Number(b.live) - Number(a.live) || a.starts_at.localeCompare(b.starts_at));
  const past = rows.filter((c) => !c.live && Date.parse(c.ends_at) <= now);

  return (
    <>
      <PageHeader kicker={kicker} title="Classes" description="Every class across your programmes. Open one for its live Q&A, materials and discussion." />
      {error ? <Notice tone="error" className="mt-6">{error}</Notice> : null}
      <div className="mt-6">
        <Tabs
          label="Classes"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "upcoming", label: "Live and upcoming", count: data ? upcoming.length : undefined },
            { id: "past", label: "Past", count: data ? past.length : undefined },
          ]}
        />
      </div>
      <div className="mt-6">
        <ClassList classes={data ? (tab === "upcoming" ? upcoming : past) : null} showProgramme editable={editable} emptyText={tab === "upcoming" ? "No classes coming up." : "No past classes yet."} />
      </div>
    </>
  );
}

type AssessmentRow = {
  id: string;
  title: string;
  programme_title: string;
  due_at: string | null;
  mode: "digital" | "paper";
  published: boolean;
  handed_in: number;
  to_grade: number;
};

/** Assessments with hand-in and grading counts, linking to the grading page. */
export function AssessmentsOverview({ kicker, title, description, defaultTab = "to_grade" }: { kicker: string; title: string; description: string; defaultTab?: "to_grade" | "all" }) {
  const router = useRouter();
  const [tab, setTab] = useState<"to_grade" | "all">(defaultTab);
  const { data, error } = useLoad<{ assessments: AssessmentRow[] }>("/tutor/assessments");
  const all = data?.assessments ?? null;
  const toGrade = all?.filter((a) => a.to_grade > 0) ?? null;

  return (
    <>
      <PageHeader kicker={kicker} title={title} description={description} />
      {error ? <Notice tone="error" className="mt-6">{error}</Notice> : null}
      <div className="mt-6">
        <Tabs
          label="Assessments"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "to_grade", label: "To grade", count: toGrade?.length },
            { id: "all", label: "All", count: all?.length },
          ]}
        />
      </div>
      <div className="mt-6">
        <DataTable
          caption="Assessments"
          rows={tab === "to_grade" ? toGrade : all}
          rowKey={(a) => a.id}
          onRowClick={(a) => router.push(`/tutor/assessment/?id=${a.id}`)}
          empty={<EmptyState title={tab === "to_grade" ? "Nothing waiting to be graded." : "No assessments yet."} text={tab === "to_grade" ? "Work that students hand in appears here until it is graded." : undefined} />}
          columns={[
            {
              key: "title",
              header: "Assessment",
              primary: true,
              cell: (a) => (
                <>
                  <a href={`/tutor/assessment/?id=${a.id}`} className="font-semibold text-ink hover:text-accent-strong hover:underline">
                    {a.title}
                  </a>
                  <span className="block text-ui-xs text-ink-muted">{a.programme_title}</span>
                </>
              ),
            },
            { key: "due", header: "Due", cell: (a) => (a.due_at ? formatDateTime(a.due_at) : <span className="text-ink-muted">No due date</span>) },
            { key: "state", header: "Status", cell: (a) => <StatusLabel status={a.published ? "published" : "draft"} />, className: "w-32" },
            { key: "in", header: "Handed in", numeric: true, cell: (a) => a.handed_in, className: "w-28" },
            {
              key: "grade",
              header: "To grade",
              numeric: true,
              className: "w-28",
              cell: (a) => (a.to_grade ? <span className="font-semibold text-accent-strong">{a.to_grade}</span> : <span className="text-ink-muted">0</span>),
            },
          ]}
        />
      </div>
    </>
  );
}
