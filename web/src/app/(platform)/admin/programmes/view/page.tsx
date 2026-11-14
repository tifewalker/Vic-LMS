"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Announcements } from "@/components/platform/Announcements";
import { AssessmentForm } from "@/components/platform/AssessmentForm";
import { AssessmentTable } from "@/components/platform/AssessmentTable";
import { ClassForm } from "@/components/platform/ClassForm";
import { ClassList } from "@/components/platform/ClassList";
import { Materials } from "@/components/platform/Materials";
import { PeoplePicker } from "@/components/platform/PeoplePicker";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { AdminBreadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { Assessment, ClassItem } from "@/lib/types";

type Person = { id: string; full_name: string; email: string; status: string; matric_no?: string; tutor_id?: string };
type Detail = {
  programme: { id: string; title: string; description: string; cover_note: string; is_active: boolean };
  students: Person[];
  tutors: Person[];
  classes: ClassItem[];
  assessments: Assessment[];
};
type Tab = "classes" | "students" | "tutors" | "assessments" | "announcements" | "materials";

function ProgrammeView() {
  const id = useSearchParams().get("id") ?? "";
  const toast = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState<Detail | null>(null);
  const [tab, setTab] = useState<Tab>("classes");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(id ? "" : "No programme was chosen.");
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api<Detail>(`/admin/programmes/${encodeURIComponent(id)}`).then((res) => {
      if (cancelled) return;
      if (res.ok) setData(res.data);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  async function remove(kind: "students" | "tutors", p: Person) {
    if (!(await confirm({ title: `Remove ${p.full_name}?`, body: "They will lose access to this programme's classes and materials.", confirmLabel: "Remove" }))) return;
    const res = await api(`/admin/programmes/${id}/${kind}/${p.id}`, { method: "DELETE" });
    toast(res.ok ? `${p.full_name} removed from this programme.` : res.error, res.ok ? "success" : "error");
    reload();
  }

  if (error && !data) return <Notice tone="error">{error}</Notice>;
  if (!data) return <SkeletonPage />;

  const addLabel: Record<Tab, string | null> = {
    classes: "Schedule a class",
    students: "Enrol students",
    tutors: "Assign tutors",
    assessments: "New assessment",
    announcements: null,
    materials: null,
  };
  const addButton = addLabel[tab] ? <Button onClick={() => setAdding(true)}>{addLabel[tab]}</Button> : null;
  const people = tab === "students" ? data.students : data.tutors;

  return (
    <>
      <AdminBreadcrumbs items={[{ label: "Programmes", href: "/admin/programmes/" }, { label: data.programme.title }]} />
      <PageHeader
        kicker="Programme"
        title={data.programme.title}
        description={data.programme.description}
        meta={!data.programme.is_active ? <StatusLabel status="draft" label="Inactive" /> : undefined}
        actions={!adding && addLabel[tab] ? addButton : null}
      />

      <div className="mt-6">
        <Tabs
          label="Programme sections"
          value={tab}
          onChange={(t) => {
            setTab(t);
            setAdding(false);
          }}
          tabs={[
            { id: "classes", label: "Classes", count: data.classes.length },
            { id: "students", label: "Students", count: data.students.length },
            { id: "tutors", label: "Tutors", count: data.tutors.length },
            { id: "assessments", label: "Assessments", count: data.assessments.length },
            { id: "announcements", label: "Announcements" },
            { id: "materials", label: "Materials" },
          ]}
        />
      </div>

      <div className="mt-8 space-y-6">
        {tab === "classes" ? (
          <>
            {adding ? (
              <div className="border border-line bg-paper p-6">
                <h2 className="mb-6 text-ui-md font-semibold">Schedule a class</h2>
                <ClassForm
                  programmeId={id}
                  onCancel={() => setAdding(false)}
                  onSaved={() => {
                    setAdding(false);
                    toast("Class scheduled.");
                    reload();
                  }}
                />
              </div>
            ) : null}
            <ClassList classes={data.classes} editable emptyText="Classes you schedule will appear here." emptyAction={addButton} />
          </>
        ) : null}

        {tab === "students" || tab === "tutors" ? (
          <>
            {adding ? (
              <PeoplePicker
                key={tab}
                programmeId={id}
                type={tab}
                onCancel={() => setAdding(false)}
                onDone={() => {
                  setAdding(false);
                  reload();
                }}
              />
            ) : null}
            <DataTable
              caption={tab === "students" ? "Students" : "Tutors"}
              rows={people}
              rowKey={(p) => p.id}
              empty={
                <EmptyState
                  title={tab === "students" ? "No students enrolled yet." : "No tutors assigned yet."}
                  text={tab === "students" ? "Enrol students so they can see classes and materials." : "Assign a tutor to teach this programme."}
                  action={adding ? undefined : addButton}
                />
              }
              columns={[
                {
                  key: "name",
                  header: "Name",
                  primary: true,
                  cell: (p) => (
                    <>
                      <span className="block font-semibold">{p.full_name}</span>
                      <span className="block text-ui-xs break-all text-ink-muted">{p.email}</span>
                    </>
                  ),
                },
                { key: "id", header: tab === "students" ? "Matric no." : "Tutor ID", cell: (p) => <span className="tabular-nums">{p.matric_no ?? p.tutor_id}</span> },
                { key: "status", header: "Account", cell: (p) => <StatusLabel status={p.status} /> },
                {
                  key: "remove",
                  header: "Actions",
                  hiddenHeader: true,
                  className: "w-20 md:text-right",
                  cell: (p) => (
                    <Button variant="quiet" onClick={() => remove(tab, p)}>
                      Remove
                    </Button>
                  ),
                },
              ]}
            />
          </>
        ) : null}

        {tab === "assessments" ? (
          <>
            {adding ? (
              <AssessmentForm
                programmeId={id}
                classes={data.classes}
                onCancel={() => setAdding(false)}
                onCreated={() => {
                  setAdding(false);
                  toast("Assessment created.");
                  reload();
                }}
              />
            ) : null}
            <AssessmentTable items={data.assessments} classes={data.classes} emptyAction={adding ? undefined : addButton} />
          </>
        ) : null}

        {tab === "announcements" ? <Announcements base="/tutor" programmeId={id} classes={data.classes} canTeach /> : null}
        {tab === "materials" ? <Materials base="/tutor" programmeId={id} canTeach /> : null}
      </div>
    </>
  );
}

export default function ProgrammeViewPage() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <ProgrammeView />
    </Suspense>
  );
}
