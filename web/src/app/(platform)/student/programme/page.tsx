"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Announcements } from "@/components/platform/Announcements";
import { ClassList } from "@/components/platform/ClassList";
import { Discussion } from "@/components/platform/Discussion";
import { Materials } from "@/components/platform/Materials";
import { StudentAssessments } from "@/components/platform/StudentAssessments";
import { Tabs } from "@/components/platform/Tabs";
import { Notice, PageTitle } from "@/components/platform/ui";
import { api } from "@/lib/api";
import type { ClassItem, People, StudentAssessment } from "@/lib/types";

type Detail = {
  programme: { id: string; title: string; description: string; cover_note: string };
  classes: ClassItem[];
  tutors: string[];
  assessments: StudentAssessment[];
  people: People;
};
type Tab = "announcements" | "classes" | "materials" | "assessments" | "discussion";

function StudentProgramme() {
  const id = useSearchParams().get("id") ?? "";
  const [data, setData] = useState<Detail | null>(null);
  const [tab, setTab] = useState<Tab>(() =>
    typeof window !== "undefined" && window.location.hash === "#assessments" ? "assessments" : "announcements",
  );
  const [error, setError] = useState(id ? "" : "No programme was chosen.");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    api<Detail>(`/student/programmes/${encodeURIComponent(id)}`).then((res) => (res.ok ? setData(res.data) : setError(res.error)));
  }, [id, reloadKey]);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!data) return <p className="text-ink-muted">Loading…</p>;

  return (
    <>
      <PageTitle kicker="Programme" title={data.programme.title} />
      <dl className="mt-6 grid max-w-4xl border-t border-line text-[0.9375rem] md:grid-cols-2 md:gap-x-10">
        <div className="border-b border-line py-3">
          <dt className="text-sm text-ink-muted">{data.tutors.length === 1 ? "Tutor" : "Tutors"}</dt>
          <dd>{data.tutors.length ? data.tutors.join(", ") : "To be assigned"}</dd>
        </div>
        {data.programme.cover_note ? (
          <div className="border-b border-line py-3">
            <dt className="text-sm text-ink-muted">What you will gain</dt>
            <dd>{data.programme.cover_note}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-8">
        <Tabs
          label="Programme sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "announcements", label: "Announcements" },
            { id: "classes", label: `Classes (${data.classes.length})` },
            { id: "materials", label: "Materials" },
            { id: "assessments", label: `Assessments (${data.assessments.length})` },
            { id: "discussion", label: "Discussion" },
          ]}
        />
      </div>
      <div className="mt-5">
        {tab === "announcements" ? <Announcements base="/student" programmeId={id} classes={data.classes} canTeach={false} /> : null}
        {tab === "classes" ? <ClassList classes={data.classes} /> : null}
        {tab === "materials" ? <Materials base="/student" programmeId={id} canTeach={false} /> : null}
        {tab === "assessments" ? <StudentAssessments items={data.assessments} onChange={() => setReloadKey((k) => k + 1)} /> : null}
        {tab === "discussion" ? <Discussion base="/student" programmeId={id} classId={null} people={data.people} canTeach={false} /> : null}
      </div>
    </>
  );
}

export default function StudentProgrammePage() {
  return (
    <Suspense>
      <StudentProgramme />
    </Suspense>
  );
}
