"use client";

import { PersonForm } from "@/components/platform/PersonForm";
import { useMe } from "@/components/platform/RequireRole";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewAdminPage() {
  const me = useMe();
  return (
    <>
      <PageHeader kicker="People" title="Add an admin" description="Admins can import students, add tutors and manage invites. They get an email with a link to set their password." />
      <div className="mt-8">
        {me.role === "super_admin" ? <PersonForm kind="admin" /> : <EmptyState title="Only a super admin can add admins." text="Ask a super admin to add the person for you." />}
      </div>
    </>
  );
}
