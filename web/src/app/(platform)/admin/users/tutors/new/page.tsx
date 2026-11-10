"use client";

import { PersonForm } from "@/components/platform/PersonForm";
import { PageTitle } from "@/components/platform/ui";

export default function NewTutorPage() {
  return (
    <>
      <PageTitle kicker="Users" title="Add a tutor" />
      <p className="mt-6 max-w-xl text-ink-muted">
        The tutor ID is created automatically. The tutor gets an email with a link to set their password.
      </p>
      <PersonForm kind="tutor" />
    </>
  );
}
