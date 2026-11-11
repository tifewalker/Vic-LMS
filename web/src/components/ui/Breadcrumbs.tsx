"use client";

import Link from "next/link";
import { useMe } from "@/components/platform/RequireRole";

export type Crumb = { label: string; href?: string };

/**
 * "Programmes / Drone Technology / Class 3" for admins looking at tutor and class pages,
 * so they can step back up. Tutors and students do not see it: their sidebar is enough.
 */
export function AdminBreadcrumbs({ items }: { items: Crumb[] }) {
  const me = useMe();
  if (me.role !== "admin" && me.role !== "super_admin") return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ui-xs text-ink-muted">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${i}-${c.label}`} className="flex items-center gap-x-2">
              {c.href && !last ? (
                <Link href={c.href} className="underline decoration-line underline-offset-[0.22em] hover:text-ink hover:decoration-ink-muted">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-ink" : undefined}>
                  {c.label}
                </span>
              )}
              {!last ? <span aria-hidden="true">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
