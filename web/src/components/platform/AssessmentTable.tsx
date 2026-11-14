"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { formatDateTime } from "@/lib/dates";
import type { Assessment, ClassItem } from "@/lib/types";

/** Assessments for a programme; each row opens the submissions and grading page. */
export function AssessmentTable({ items, classes, emptyAction }: { items: Assessment[] | null; classes: ClassItem[]; emptyAction?: React.ReactNode }) {
  const router = useRouter();
  const classTitle = (cid: string | null) => (cid ? (classes.find((c) => c.id === cid)?.title ?? "A class") : "Whole programme");
  return (
    <DataTable
      caption="Assessments"
      rows={items}
      rowKey={(a) => a.id}
      onRowClick={(a) => router.push(`/tutor/assessment/?id=${a.id}`)}
      empty={<EmptyState title="No assessments yet." text="Create one for a class or for the whole programme." action={emptyAction} />}
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
              <span className="block text-ui-xs text-ink-muted">{classTitle(a.class_id)}</span>
            </>
          ),
        },
        { key: "due", header: "Due", cell: (a) => (a.due_at ? formatDateTime(a.due_at) : "No deadline") },
        { key: "mode", header: "Hand in", cell: (a) => (a.mode === "paper" ? "On paper" : "Online") },
        { key: "state", header: "Status", cell: (a) => <StatusLabel status={a.published ? "published" : "draft"} /> },
        { key: "subs", header: "Submissions", numeric: true, cell: (a) => a.submission_count ?? 0 },
      ]}
    />
  );
}
