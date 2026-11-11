"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Announcements } from "@/components/platform/Announcements";
import { AssessmentForm } from "@/components/platform/AssessmentForm";
import { AssessmentTable } from "@/components/platform/AssessmentTable";
import { ClassList } from "@/components/platform/ClassList";
import { Discussion } from "@/components/platform/Discussion";
import { Materials } from "@/components/platform/Materials";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { AdminBreadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { Tabs } from "@/components/ui/Tabs";
import { api } from "@/lib/api";
import type { Assessment, ClassItem, People } from "@/lib/types";

type Detail = {
  programme: { id: string; title: string; description: string; cover_note: string };
  classes: ClassItem[];
  students: { id: string; full_name: string; email: string; status: string; matric_no: string }[];
  assessments: Assessment[];
};
type Tab = "classes" | "announcements" | "materials" | "students" | "assessments" | "discussion";

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
  if (!data) return <SkeletonPage />;

  const people: People = Object.fromEntries(data.students.map((s) => [s.id, { full_name: s.full_name, role: "student" }]));
  const newAssessment = <Button onClick={() => setCreating(true)}>New assessment</Button>;

  return (
    <>
      <AdminBreadcrumbs items={[{ label: "Programmes", href: "/admin/programmes/" }, { label: data.programme.title }]} />
      <PageHeader
        kicker="Programme"
        title={data.programme.title}
        description={data.programme.description}
        actions={tab === "assessments" && !creating ? newAssessment : null}
      />
      <div className="mt-6">
        <Tabs
          label="Programme sections"
          value={tab}
          onChange={(t) => {
            setTab(t);
            setCreating(false);
          }}
          tabs={[
            { id: "classes", label: "Classes", count: data.classes.length },
            { id: "announcements", label: "Announcements" },
            { id: "materials", label: "Materials" },
            { id: "students", label: "Students", count: data.students.length },
            { id: "assessments", label: "Assessments", count: data.assessments.length },
            { id: "discussion", label: "Discussion" },
          ]}
        />
      </div>

      <div className="mt-8 space-y-6">
        {tab === "classes" ? <ClassList classes={data.classes} emptyText="The programme admin schedules classes; they will appear here." /> : null}
        {tab === "announcements" ? <Announcements base="/tutor" programmeId={id} classes={data.classes} canTeach /> : null}
        {tab === "materials" ? <Materials base="/tutor" programmeId={id} canTeach /> : null}

        {tab === "students" ? (
          <DataTable
            caption="Students"
            rows={data.students}
            rowKey={(s) => s.id}
            empty={<EmptyState title="No students enrolled yet." text="The programme admin enrols students; they will appear here." />}
            columns={[
              {
                key: "name",
                header: "Name",
                primary: true,
                cell: (s) => (
                  <>
                    <span className="block font-semibold">{s.full_name}</span>
                    <span className="block text-ui-xs break-all text-ink-muted">{s.email}</span>
                  </>
                ),
              },
              { key: "matric", header: "Matric no.", cell: (s) => <span className="tabular-nums">{s.matric_no}</span> },
              { key: "status", header: "Account", cell: (s) => <StatusLabel status={s.status} /> },
            ]}
          />
        ) : null}

        {tab === "assessments" ? (
          <>
            {creating ? (
              <AssessmentForm programmeId={id} classes={data.classes} onCancel={() => setCreating(false)} onCreated={(newId) => router.push(`/tutor/assessment/?id=${newId}`)} />
            ) : null}
            <AssessmentTable items={data.assessments} classes={data.classes} emptyAction={creating ? undefined : newAssessment} />
          </>
        ) : null}

        {tab === "discussion" ? <Discussion base="/tutor" programmeId={id} classId={null} people={people} canTeach /> : null}
      </div>
    </>
  );
}

export default function TutorProgrammePage() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <TutorProgramme />
    </Suspense>
  );
}
