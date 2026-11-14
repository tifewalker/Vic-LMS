"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SelectField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { formatDateTime } from "@/lib/dates";
import { useLoad } from "@/lib/useLoad";

type Item = {
  id: string;
  type: string;
  at: string;
  summary: string;
  link: string | null;
  actor: { full_name: string; role: string } | null;
  programme_title: string | null;
};

const typeLabel: Record<string, string> = {
  post: "Live messages",
  question: "Questions",
  thread: "Discussion threads",
  reply: "Replies",
  submission: "Submissions",
  grade: "Grades released",
  announcement: "Announcements",
  material: "Materials added",
  activation: "Account activations",
  import: "Student imports",
};

/** Where an activity row leads. */
function hrefFor(link: string | null): string | null {
  if (!link) return null;
  const [kind, a] = link.split(":");
  if (kind === "class") return `/class/?id=${a}`;
  if (kind === "programme") return `/admin/programmes/view/?id=${a}`;
  if (kind === "thread") return "/admin/discussions/";
  if (kind === "assessment") return `/tutor/assessment/?id=${a}`;
  if (kind === "users") return "/admin/users/";
  return null;
}

const actorName = (a: Item["actor"]) => (!a ? "Someone" : a.role === "admin" || a.role === "super_admin" ? `${a.full_name} (admin)` : a.full_name);

/** A recent feed across every programme, newest first. */
export default function ActivityPage() {
  const [type, setType] = useState("");
  const [programme, setProgramme] = useState("");
  const q = new URLSearchParams();
  if (type) q.set("type", type);
  if (programme) q.set("programme_id", programme);
  const { data, error } = useLoad<{ items: Item[]; types: string[]; programmes: { id: string; title: string }[] }>(`/admin/activity?${q.toString()}`);

  return (
    <>
      <PageHeader kicker="Reports" title="Activity" description="Recent posts, questions, submissions, grades, announcements, materials, activations and imports across every programme." />
      {error ? <Notice tone="error" className="mt-6">{error}</Notice> : null}
      <div className="mt-6 flex flex-wrap gap-4 border-b border-line pb-6">
        <SelectField label="Type" value={type} onChange={(e) => setType(e.target.value)} className="w-full sm:w-64">
          <option value="">Everything</option>
          {Object.entries(typeLabel).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </SelectField>
        <SelectField label="Programme" value={programme} onChange={(e) => setProgramme(e.target.value)} className="w-full sm:w-64" hint={programme ? "Activations and imports are not tied to a programme, so they are left out." : undefined}>
          <option value="">All programmes</option>
          {data?.programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="mt-2">
        {!data ? (
          <div className="mt-4">
            <SkeletonRows rows={6} />
          </div>
        ) : data.items.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Nothing yet." text="Activity appears here as people use the platform." />
          </div>
        ) : (
          <ol>
            {data.items.map((i) => {
              const href = hrefFor(i.link);
              return (
                <li key={i.id} className="grid gap-x-6 gap-y-1 border-b border-line py-3 md:grid-cols-[11rem_1fr]">
                  <p className="text-ui-xs text-ink-muted tabular-nums md:pt-0.5">{formatDateTime(i.at)}</p>
                  <div className="min-w-0">
                    <p className="text-ui-sm break-words">
                      <span className="font-semibold">{actorName(i.actor)}</span>{" "}
                      {href ? (
                        <a href={href} className="hover:text-accent-strong hover:underline">
                          {i.summary.charAt(0).toLowerCase() + i.summary.slice(1)}
                        </a>
                      ) : (
                        i.summary.charAt(0).toLowerCase() + i.summary.slice(1)
                      )}
                    </p>
                    <p className="text-ui-xs text-ink-muted">
                      {typeLabel[i.type] ?? i.type}
                      {i.programme_title ? ` · ${i.programme_title}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}
