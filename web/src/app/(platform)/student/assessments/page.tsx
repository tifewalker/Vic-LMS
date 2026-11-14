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
import type { StudentAssessment } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

type Row = StudentAssessment & { programme_title: string };

/** Every published assessment across my programmes. Handing in happens on the programme page. */
export default function StudentAssessmentsPage() {
  const [tab, setTab] = useState<"todo" | "all">("todo");
  const { data, error } = useLoad<{ assessments: Row[] }>("/student/assessments");
  const router = useRouter();
  const [now] = useState(() => new Date().toISOString());
  const all = data?.assessments ?? null;
  const todo = all?.filter((a) => !a.my_submission && a.mode === "digital" && (!a.due_at || a.due_at >= now)) ?? null;

  return (
    <>
      <PageHeader kicker="Learning" title="Assessments" description="What is due across your programmes. Open one to hand it in." />
      {error ? <Notice tone="error" className="mt-6">{error}</Notice> : null}
      <div className="mt-6">
        <Tabs
          label="Assessments"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "todo", label: "To hand in", count: todo?.length },
            { id: "all", label: "All", count: all?.length },
          ]}
        />
      </div>
      <div className="mt-6">
        <DataTable
          caption="Assessments"
          rows={tab === "todo" ? todo : all}
          rowKey={(a) => a.id}
          onRowClick={(a) => router.push(`/student/programme/?id=${a.programme_id}`)}
          empty={<EmptyState title={tab === "todo" ? "Nothing to hand in." : "No assessments yet."} text={tab === "todo" ? "New assessments appear here when your tutors publish them." : undefined} />}
          columns={[
            {
              key: "title",
              header: "Assessment",
              primary: true,
              cell: (a) => (
                <>
                  <a href={`/student/programme/?id=${a.programme_id}`} className="font-semibold text-ink hover:text-accent-strong hover:underline">
                    {a.title}
                  </a>
                  <span className="block text-ui-xs text-ink-muted">{a.programme_title}</span>
                </>
              ),
            },
            { key: "due", header: "Due", cell: (a) => (a.due_at ? formatDateTime(a.due_at) : <span className="text-ink-muted">No due date</span>) },
            { key: "mode", header: "Hand in", cell: (a) => (a.mode === "paper" ? "On paper" : "Online"), className: "w-28" },
            {
              key: "status",
              header: "Status",
              className: "w-40",
              cell: (a) =>
                a.my_submission?.grade ? (
                  <span className="tabular-nums">
                    {a.my_submission.grade.score} / {a.max_score}
                  </span>
                ) : (
                  <StatusLabel status={a.my_submission?.status ?? "not_submitted"} />
                ),
            },
          ]}
        />
      </div>
    </>
  );
}
