"use client";

import { PersonForm } from "@/components/platform/PersonForm";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewTutorPage() {
  return (
    <>
      <PageHeader kicker="People" title="Add a tutor" description="The tutor ID is created automatically. You set the password; no email is sent." />
      <div className="mt-8">
        <PersonForm kind="tutor" />
      </div>
    </>
  );
}
