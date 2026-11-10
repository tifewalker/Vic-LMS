"use client";

import { formatDateTime, formatTimeRange } from "@/lib/dates";
import type { ClassItem } from "@/lib/types";
import { ClassStatus } from "./Tabs";

/** Classes as a ruled list. Each opens the class page; admins also get an edit link. */
export function ClassList({ classes, editable = false, showProgramme = false }: { classes: ClassItem[]; editable?: boolean; showProgramme?: boolean }) {
  if (classes.length === 0) return <p className="py-4 text-ink-muted">No classes yet.</p>;
  return (
    <ul className="border-t border-line">
      {classes.map((c) => (
        <li key={c.id} className="grid gap-1 border-b border-line py-3 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6">
          <div className="min-w-0">
            <a href={`/class/?id=${c.id}`} className="font-serif text-lg text-ink hover:text-accent-strong">
              {c.title}
            </a>
            <p className="text-sm text-ink-muted">
              {formatDateTime(c.starts_at)}, {formatTimeRange(c.starts_at, c.ends_at)}
              {showProgramme && c.programme ? ` · ${c.programme.title}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ClassStatus status={c.status} />
            {editable ? (
              <a href={`/admin/classes/edit/?id=${c.id}`} className="text-[0.9375rem] font-semibold text-accent-strong hover:underline">
                Edit
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
