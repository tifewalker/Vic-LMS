"use client";

import { PersonForm } from "@/components/platform/PersonForm";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewTutorPage() {
  return (
    <>
      <PageHeader kicker="People" title="Add a tutor" description="The tutor ID is created automatically. The tutor gets an email with a link to set their password." />
      <div className="mt-8">
        <PersonForm kind="tutor" />
      </div>
    </>
  );
}
