"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SelectField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { Tabs } from "@/components/ui/Tabs";
import { cx } from "@/lib/cx";
import { formatDateTime } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { useLoad } from "@/lib/useLoad";
import { ThreadView } from "./Discussion";
import { useModeration } from "./useModeration";

type Row = {
  id: string;
  programme_id: string;
  kind: "question" | "discussion";
  title: string;
  pinned: boolean;
  answered: boolean;
  hidden?: boolean;
  created_at: string;
  reply_count: number;
  programme_title: string;
  class_title?: string | null;
  author: { full_name: string; role: string } | null;
};
type Filter = "all" | "unanswered" | "pinned" | "hidden";

/**
 * Threads across programmes. Admins: every programme, filters for unanswered, pinned and hidden,
 * and moderation on each row. Tutors: their own programmes.
 */
export function ThreadsBrowser({ admin }: { admin: boolean }) {
  const mod = useModeration();
  const [filter, setFilter] = useState<Filter>("all");
  const [programme, setProgramme] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const q = new URLSearchParams();
  if (filter !== "all") q.set("filter", filter);
  if (programme) q.set("programme_id", programme);
  const { data, error, reload } = useLoad<{ threads: Row[]; programmes?: { id: string; title: string }[] }>(`${admin ? "/admin/discussions" : "/tutor/threads"}?${q.toString()}`);

  // New threads and replies anywhere: reload the list.
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const bump = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(reload, 300);
    };
    const channel = supabase()
      .channel(`threads-browser-${admin ? "admin" : "tutor"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "threads" }, bump)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "replies" }, bump)
      .subscribe();
    return () => {
      window.clearTimeout(timer.current);
      supabase().removeChannel(channel);
    };
  }, [admin, reload]);

  const after = (p: Promise<boolean>) => p.then((okay) => okay && reload());
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unanswered", label: "Unanswered" },
    { id: "pinned", label: "Pinned" },
    ...(admin ? [{ id: "hidden" as const, label: "Hidden" }] : []),
  ];

  if (openId) {
    return (
      <>
        <PageHeader kicker={admin ? "Live and community" : "Teaching"} title="Discussions" />
        <div className="mt-6">
          <ThreadView
            base="/tutor"
            threadId={openId}
            canTeach
            onBack={() => {
              setOpenId(null);
              reload();
            }}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        kicker={admin ? "Live and community" : "Teaching"}
        title="Discussions"
        description={admin ? "Every thread across the programmes. Hidden threads stay visible to admins only." : "Threads from all of your programmes, newest first."}
      />
      {error ? <Notice tone="error" className="mt-6">{error}</Notice> : null}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <Tabs label="Filter threads" value={filter} onChange={setFilter} tabs={filters} />
        {admin ? (
          <SelectField label="Programme" value={programme} onChange={(e) => setProgramme(e.target.value)} className="w-full sm:w-64">
            <option value="">All programmes</option>
            {data?.programmes?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </SelectField>
        ) : null}
      </div>

      <div className="mt-6">
        {!data ? (
          <SkeletonRows rows={4} />
        ) : data.threads.length === 0 ? (
          <EmptyState title={filter === "all" ? "No threads yet." : "Nothing matches this filter."} text="Questions and discussions from the programmes appear here." />
        ) : (
          <ul className="border-t border-line">
            {data.threads.map((t) => (
              <li key={t.id} className={cx("border-b border-line py-4", t.hidden && "bg-paper-2/60 px-4 text-ink-muted")}>
                <p className="text-ui-xs text-ink-muted">
                  {t.programme_title}
                  {t.class_title ? ` · ${t.class_title}` : ""}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <button type="button" onClick={() => setOpenId(t.id)} className={cx("cursor-pointer text-left font-semibold hover:text-accent-strong hover:underline", t.hidden ? "text-ink-muted" : "text-ink")}>
                    {t.title}
                  </button>
                  {t.hidden ? <StatusLabel status="hidden" /> : null}
                  {t.pinned ? <StatusLabel status="pinned" /> : null}
                  {t.kind === "question" ? <StatusLabel status={t.answered ? "answered" : "question"} /> : null}
                </div>
                <p className="mt-1 text-ui-xs text-ink-muted">
                  {t.author?.role === "admin" || t.author?.role === "super_admin" ? "Programme admin" : (t.author?.full_name ?? "Unknown")} · {formatDateTime(t.created_at)} · {t.reply_count} repl{t.reply_count === 1 ? "y" : "ies"}
                </p>
                {admin ? (
                  <div className="mt-2 flex flex-wrap gap-x-1 gap-y-1">
                    {t.kind === "question" ? (
                      <Button variant="quiet" size="sm" onClick={() => after(mod.answered("threads", t.id, !t.answered))}>
                        {t.answered ? "Mark unanswered" : "Mark answered"}
                      </Button>
                    ) : null}
                    <Button variant="quiet" size="sm" onClick={() => after(mod.pin(t.id, !t.pinned))}>
                      {t.pinned ? "Unpin" : "Pin"}
                    </Button>
                    <Button variant="quiet" size="sm" onClick={() => after(mod.hide("threads", t.id, !t.hidden))}>
                      {t.hidden ? "Unhide" : "Hide"}
                    </Button>
                    <Button variant="quiet" size="sm" onClick={() => setOpenId(t.id)}>
                      Open and reply
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
