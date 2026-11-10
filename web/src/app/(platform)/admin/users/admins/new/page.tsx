"use client";

import { PersonForm } from "@/components/platform/PersonForm";
import { useMe } from "@/components/platform/RequireRole";
import { Notice, PageTitle } from "@/components/platform/ui";

export default function NewAdminPage() {
  const me = useMe();
  return (
    <>
      <PageTitle kicker="Users" title="Add an admin" />
      {me.role === "super_admin" ? (
        <>
          <p className="mt-6 max-w-xl text-ink-muted">
            Admins can import students, add tutors and manage invites. They get an email with a link to set their password.
          </p>
          <PersonForm kind="admin" />
        </>
      ) : (
        <div className="mt-8 max-w-xl">
          <Notice>Only a super admin can add admins.</Notice>
        </div>
      )}
    </>
  );
}
