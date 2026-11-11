"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { formatClassTime } from "@/lib/dates";
import type { ClassItem } from "@/lib/types";

/** Classes as a table (cards on phones). Each opens the class page; admins also get Edit. */
export function ClassList({
  classes,
  editable = false,
  showProgramme = false,
  emptyAction,
  emptyText = "Classes will appear here once they are scheduled.",
}: {
  classes: ClassItem[] | null;
  editable?: boolean;
  showProgramme?: boolean;
  emptyAction?: React.ReactNode;
  emptyText?: string;
}) {
  const router = useRouter();
  return (
    <DataTable
      caption="Classes"
      rows={classes}
      rowKey={(c) => c.id}
      onRowClick={(c) => router.push(`/class/?id=${c.id}`)}
      empty={<EmptyState title="No classes yet." text={emptyText} action={emptyAction} />}
      columns={[
        {
          key: "class",
          header: "Class",
          primary: true,
          cell: (c) => (
            <>
              <a href={`/class/?id=${c.id}`} className="font-semibold text-ink hover:text-accent-strong hover:underline">
                {c.title}
              </a>
              <span className="block text-ui-xs text-ink-muted">
                {formatClassTime(c.starts_at, c.ends_at)}
                {showProgramme && c.programme ? ` · ${c.programme.title}` : ""}
              </span>
            </>
          ),
        },
        { key: "status", header: "Status", cell: (c) => <StatusLabel status={c.status} />, className: "w-36" },
        ...(editable
          ? [
              {
                key: "edit",
                header: "Actions",
                hiddenHeader: true,
                className: "w-20 text-right",
                cell: (c: ClassItem) => (
                  <a href={`/admin/classes/edit/?id=${c.id}`} className="font-semibold text-accent-strong underline decoration-accent/40 underline-offset-[0.22em] hover:decoration-accent-strong">
                    Edit
                  </a>
                ),
              },
            ]
          : []),
      ]}
    />
  );
}
