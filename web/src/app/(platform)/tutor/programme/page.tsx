"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Announcements } from "@/components/platform/Announcements";
import { AssessmentForm } from "@/components/platform/AssessmentForm";
import { AssessmentTable } from "@/components/platform/AssessmentTable";
import { ClassList } from "@/components/platform/ClassList";
import { Discussion } from "@/components/platform/Discussion";
import { Materials } from "@/components/platform/Materials";
import { Tabs } from "@/components/platform/Tabs";
import { Button, Notice, PageTitle } from "@/components/platform/ui";
import { api } from "@/lib/api";
import type { Assessment, ClassItem, People } from "@/lib/types";

type Detail = {
  programme: { id: string; title: string; description: string; cover_note: string };
  classes: ClassItem[];
  students: { id: string; full_name: string; email: string; status: string; matric_no: string }[];
  assessments: Assessment[];
};
type Tab = "classes" | "announcements" | "materials" | "students" | "assessments" | "discussion";
const accountLabel: Record<string, string> = { invited: "Not activated", active: "Active", suspended: "Suspended" };

function TutorProgramme() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [tab, setTab] = useState<Tab>("classes");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(id ? "" : "No programme was chosen.");

  useEffect(() => {
    if (!id) return;
    api<Detail>(`/tutor/programmes/${encodeURIComponent(id)}`).then((res) => (res.ok ? setData(res.data) : setError(res.error)));
  }, [id]);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!data) return <p className="text-ink-muted">Loading…</p>;

  const people: People = Object.fromEntries(data.students.map((s) => [s.id, { full_name: s.full_name, role: "student" }]));

  return (
    <>
      <PageTitle kicker="Programme" title={data.programme.title} />
      <div className="mt-8">
        <Tabs
          label="Programme sections"
          value={tab}
          onChange={(t) => {
            setTab(t);
            setCreating(false);
          }}
          tabs={[
            { id: "classes", label: `Classes (${data.classes.length})` },
            { id: "announcements", label: "Announcements" },
            { id: "materials", label: "Materials" },
            { id: "students", label: `Students (${data.students.length})` },
            { id: "assessments", label: `Assessments (${data.assessments.length})` },
            { id: "discussion", label: "Discussion" },
          ]}
        />
      </div>

      <div className="mt-5">
        {tab === "classes" ? <ClassList classes={data.classes} /> : null}
        {tab === "announcements" ? <Announcements base="/tutor" programmeId={id} classes={data.classes} canTeach /> : null}
        {tab === "materials" ? <Materials base="/tutor" programmeId={id} canTeach /> : null}

        {tab === "students" ? (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-[0.9375rem]">
              <thead>
                <tr className="border-y border-line text-sm text-ink-muted">
                  <th className="py-2.5 pr-4 font-semibold">Name</th>
                  <th className="py-2.5 pr-4 font-semibold">Matric no.</th>
                  <th className="py-2.5 font-semibold">Account</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => (
                  <tr key={s.id} className="border-b border-line align-top">
                    <td className="py-3 pr-4">
                      <span className="block">{s.full_name}</span>
                      <span className="block text-sm text-ink-muted">{s.email}</span>
                    </td>
                    <td className="py-3 pr-4 tabular-nums">{s.matric_no}</td>
                    <td className="py-3">{accountLabel[s.status] ?? s.status}</td>
                  </tr>
                ))}
                {data.students.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-ink-muted">
                      No students enrolled yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "assessments" ? (
          <>
            {!creating ? (
              <Button size="sm" onClick={() => setCreating(true)}>
                New assessment
              </Button>
            ) : (
              <AssessmentForm
                programmeId={id}
                classes={data.classes}
                onCancel={() => setCreating(false)}
                onCreated={(newId) => router.push(`/tutor/assessment/?id=${newId}`)}
              />
            )}
            <AssessmentTable items={data.assessments} classes={data.classes} />
          </>
        ) : null}

        {tab === "discussion" ? (
          <Discussion base="/tutor" programmeId={id} classId={null} people={people} canTeach />
        ) : null}
      </div>
    </>
  );
}

export default function TutorProgrammePage() {
  return (
    <Suspense>
      <TutorProgramme />
    </Suspense>
  );
}
