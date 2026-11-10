"use client";

import { useEffect, useState } from "react";
import { useMe } from "@/components/platform/RequireRole";
import { Notice, PageTitle } from "@/components/platform/ui";
import { api } from "@/lib/api";

type Summary = {
  students: number;
  tutors: number;
  invited: number;
  active: number;
  suspended: number;
  pendingInvites: number;
  emailsRemainingToday: number;
};

export default function AdminDashboard() {
  const me = useMe();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Summary>("/admin/summary").then((res) => (res.ok ? setSummary(res.data) : setError(res.error)));
  }, []);

  const rows: [string, keyof Summary, string?][] = [
    ["Students", "students", "/admin/users/?role=student"],
    ["Tutors", "tutors", "/admin/users/?role=tutor"],
    ["Not activated", "invited", "/admin/users/?status=invited"],
    ["Active", "active"],
    ["Suspended", "suspended"],
    ["Invites waiting to send", "pendingInvites"],
    ["Emails left today", "emailsRemainingToday"],
  ];

  return (
    <>
      <PageTitle kicker={me.role === "super_admin" ? "Super admin" : "Admin"} title={`Welcome, ${me.full_name.split(" ")[0]}`} />
      {error ? (
        <div className="mt-8">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
      <dl className="mt-8 grid border-t border-line sm:grid-cols-2 sm:gap-x-10 lg:max-w-3xl">
        {rows.map(([label, key, href]) => (
          <div key={key} className="flex items-baseline justify-between gap-4 border-b border-line py-4">
            <dt className="text-ink-muted">{href ? <a href={href} className="hover:text-ink hover:underline">{label}</a> : label}</dt>
            <dd className="font-serif text-2xl tabular-nums">{summary ? summary[key] : "…"}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-[0.9375rem]">
        <a href="/admin/users/import/" className="font-semibold text-accent-strong hover:underline">Import students</a>
        <a href="/admin/users/tutors/new/" className="font-semibold text-accent-strong hover:underline">Add a tutor</a>
        {me.role === "super_admin" ? (
          <a href="/admin/users/admins/new/" className="font-semibold text-accent-strong hover:underline">Add an admin</a>
        ) : null}
      </div>
    </>
  );
}
