"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { formatDateTime } from "@/lib/dates";
import { useLoad } from "@/lib/useLoad";

type Row = { id: string; programme_id: string; title: string; body: string; pinned: boolean; created_at: string; programme_title: string; author_name: string | null };

/** Announcements from every programme. Writing and editing stay on each programme's page. */
export default function AdminAnnouncementsPage() {
  const { data, error } = useLoad<{ announcements: Row[] }>("/tutor/announcements");
  return (
    <>
      <PageHeader kicker="Live and community" title="Announcements" description="Every announcement across the programmes. To post or edit one, open its programme." />
      {error ? <Notice tone="error" className="mt-6">{error}</Notice> : null}
      <div className="mt-6">
        {!data ? (
          <SkeletonRows rows={4} />
        ) : data.announcements.length === 0 ? (
          <EmptyState title="No announcements yet." text="Announcements posted in any programme appear here." />
        ) : (
          <ul className="border-t border-line">
            {data.announcements.map((a) => (
              <li key={a.id} className="border-b border-line py-4">
                <p className="text-ui-xs text-ink-muted">
                  <a href={`/admin/programmes/view/?id=${a.programme_id}`} className="underline decoration-line underline-offset-[0.22em] hover:text-ink">
                    {a.programme_title}
                  </a>{" "}
                  · {formatDateTime(a.created_at)}
                  {a.author_name ? ` · ${a.author_name}` : ""}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3">
                  <h2 className="text-ui-md font-semibold">{a.title}</h2>
                  {a.pinned ? <StatusLabel status="pinned" /> : null}
                </div>
                <p className="mt-1 line-clamp-3 max-w-measure text-ui-sm whitespace-pre-wrap text-ink-muted">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
