"use client";

import { useMe } from "@/components/platform/RequireRole";
import { PageTitle } from "@/components/platform/ui";

export default function StudentDashboard() {
  const me = useMe();
  return (
    <>
      <PageTitle kicker="Student" title={`Welcome, ${me.full_name.split(" ")[0]}`} />
      <dl className="mt-8 max-w-md border-t border-line text-[0.9375rem]">
        <div className="flex justify-between gap-4 border-b border-line py-3">
          <dt className="text-ink-muted">Matric number</dt>
          <dd className="tabular-nums">{me.matric_no}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-line py-3">
          <dt className="text-ink-muted">Email</dt>
          <dd>{me.email}</dd>
        </div>
      </dl>
      <p className="mt-8 max-w-xl text-ink-muted">Your programme, announcements, materials and results will appear here.</p>
    </>
  );
}
