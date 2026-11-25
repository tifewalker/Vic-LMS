"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatClassTime } from "@/lib/dates";
import type { ClassItem } from "@/lib/types";

/**
 * The course outline: its topics in teaching order, like a table of contents. Each topic shows
 * how many classes cover it and when the next one is.
 */
export function CourseOutline({ outline, classes }: { outline: string[]; classes: ClassItem[] }) {
  const [now] = useState(() => Date.now());
  if (!outline.length) return <EmptyState title="No outline yet." text="The course topics will appear here once the programme admin adds them." />;
  return (
    <ol className="max-w-3xl border-t border-line" aria-label="Course outline">
      {outline.map((topic, i) => {
        const mine = classes.filter((c) => c.topic === topic);
        const next = mine.filter((c) => Date.parse(c.ends_at) > now).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
        return (
          <li key={topic} className="grid grid-cols-[2.5rem_1fr] gap-x-3 border-b border-line py-4">
            <span className="font-serif text-ui-md text-ink-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            <span>
              <span className="block font-semibold">{topic}</span>
              <span className="block text-ui-xs text-ink-muted">
                {mine.length ? `${mine.length} ${mine.length === 1 ? "class" : "classes"}` : "No classes yet"}
                {next ? (
                  <>
                    {" · Next: "}
                    <a href={`/class/?id=${next.id}`} className="hover:text-accent-strong hover:underline">
                      {formatClassTime(next.starts_at, next.ends_at)}
                    </a>
                  </>
                ) : null}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
