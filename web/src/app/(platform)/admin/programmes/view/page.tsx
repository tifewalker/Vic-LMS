"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Announcements } from "@/components/platform/Announcements";
import { AssessmentForm } from "@/components/platform/AssessmentForm";
import { AssessmentTable } from "@/components/platform/AssessmentTable";
import { ClassForm } from "@/components/platform/ClassForm";
import { ClassList } from "@/components/platform/ClassList";
import { ConfirmButton } from "@/components/platform/ConfirmButton";
import { Materials } from "@/components/platform/Materials";
import { PeoplePicker } from "@/components/platform/PeoplePicker";
import { Tabs } from "@/components/platform/Tabs";
import { Button, Notice, PageTitle } from "@/components/platform/ui";
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

const accountLabel: Record<string, string> = { invited: "Not activated", active: "Active", suspended: "Suspended" };

function ProgrammeView() {
  const id = useSearchParams().get("id") ?? "";
  const [data, setData] = useState<Detail | null>(null);
  const [tab, setTab] = useState<Tab>("classes");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(id ? "" : "No programme was chosen.");
  const [notice, setNotice] = useState("");
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
    const res = await api(`/admin/programmes/${id}/${kind}/${p.id}`, { method: "DELETE" });
    setNotice(res.ok ? `${p.full_name} removed from this programme.` : res.error);
    reload();
  }

  if (error && !data) return <Notice tone="error">{error}</Notice>;
  if (!data) return <p className="text-ink-muted">Loading…</p>;

  // Announcements and Materials have their own add buttons.
  const addLabel = { classes: "New class", students: "Enrol students", tutors: "Assign tutors", assessments: "New assessment", announcements: null, materials: null }[tab];
  const people = tab === "students" ? data.students : data.tutors;

  return (
    <>
      <PageTitle kicker="Programme" title={data.programme.title} />
      {data.programme.description ? <p className="mt-4 max-w-measure text-ink-muted">{data.programme.description}</p> : null}

      <div className="mt-6 space-y-3">
        {notice ? <Notice>{notice}</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Tabs
            label="Programme sections"
            value={tab}
            onChange={(t) => {
              setTab(t);
              setAdding(false);
            }}
            tabs={[
              { id: "classes", label: `Classes (${data.classes.length})` },
              { id: "students", label: `Students (${data.students.length})` },
              { id: "tutors", label: `Tutors (${data.tutors.length})` },
              { id: "assessments", label: `Assessments (${data.assessments.length})` },
              { id: "announcements", label: "Announcements" },
              { id: "materials", label: "Materials" },
            ]}
          />
        </div>
        {!adding && addLabel ? (
          <Button size="sm" onClick={() => setAdding(true)}>
            {addLabel}
          </Button>
        ) : null}
      </div>

      <div className="mt-5">
        {tab === "classes" ? (
          <>
            {adding ? (
              <div className="mb-6 border border-line p-5">
                <h2 className="mb-4 text-xl">New class</h2>
                <ClassForm
                  programmeId={id}
                  onCancel={() => setAdding(false)}
                  onSaved={() => {
                    setAdding(false);
                    setNotice("Class created.");
                    reload();
                  }}
                />
              </div>
            ) : null}
            <ClassList classes={data.classes} editable />
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
                onDone={(message) => {
                  setAdding(false);
                  setNotice(message);
                  reload();
                }}
              />
            ) : null}
            <div className="relative mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-[0.9375rem]">
                <thead>
                  <tr className="border-y border-line text-sm text-ink-muted">
                    <th className="py-2.5 pr-4 font-semibold">Name</th>
                    <th className="py-2.5 pr-4 font-semibold">{tab === "students" ? "Matric no." : "Tutor ID"}</th>
                    <th className="py-2.5 pr-4 font-semibold">Account</th>
                    <th className="py-2.5 font-semibold">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => (
                    <tr key={p.id} className="border-b border-line align-top">
                      <td className="py-3 pr-4">
                        <span className="block">{p.full_name}</span>
                        <span className="block text-sm text-ink-muted">{p.email}</span>
                      </td>
                      <td className="py-3 pr-4 tabular-nums">{p.matric_no ?? p.tutor_id}</td>
                      <td className="py-3 pr-4">{accountLabel[p.status] ?? p.status}</td>
                      <td className="py-3 text-right">
                        <ConfirmButton label="Remove" question={`Remove ${p.full_name.split(" ")[0]}?`} confirmLabel="Remove" onConfirm={() => remove(tab, p)} />
                      </td>
                    </tr>
                  ))}
                  {people.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-ink-muted">
                        {tab === "students" ? "No students enrolled yet." : "No tutors assigned yet."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {tab === "announcements" ? <Announcements base="/tutor" programmeId={id} classes={data.classes} canTeach /> : null}
        {tab === "materials" ? <Materials base="/tutor" programmeId={id} canTeach /> : null}

        {tab === "assessments" ? (
          <>
            {adding ? (
              <AssessmentForm
                programmeId={id}
                classes={data.classes}
                onCancel={() => setAdding(false)}
                onCreated={() => {
                  setAdding(false);
                  setNotice("Assessment created.");
                  reload();
                }}
              />
            ) : null}
            <AssessmentTable items={data.assessments} classes={data.classes} />
          </>
        ) : null}
      </div>
    </>
  );
}

export default function ProgrammeViewPage() {
  return (
    <Suspense>
      <ProgrammeView />
    </Suspense>
  );
}
