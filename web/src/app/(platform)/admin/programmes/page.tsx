"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { CheckboxField, TextArea, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

type Programme = {
  id: string;
  title: string;
  description: string;
  cover_note: string;
  is_active: boolean;
  sort_order: number;
  outline: string[];
  student_count: number;
  tutor_count: number;
  class_count: number;
};
/** outline is edited as text, one topic per line. */
type Draft = { id?: string; title: string; description: string; cover_note: string; is_active: boolean; sort_order: number; outline: string };
const blank: Draft = { title: "", description: "", cover_note: "", is_active: true, sort_order: 100, outline: "" };
const outlineLines = (text: string) => text.split("\n").map((t) => t.trim().replace(/\s+/g, " ")).filter(Boolean);
/** sort_order 0 marks the main course (Entrepreneurship), listed first everywhere. */
const MAIN = 0;

export default function ProgrammesPage() {
  const toast = useToast();
  const router = useRouter();
  const [programmes, setProgrammes] = useState<Programme[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api<{ programmes: Programme[] }>("/admin/programmes").then((res) => (res.ok ? setProgrammes(res.data.programmes) : setError(res.error)));
  }, [reloadKey]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError("");
    const { id, outline, ...rest } = draft;
    const body = { ...rest, outline: outlineLines(outline) };
    const res = id ? await api(`/admin/programmes/${id}`, { method: "PATCH", body }) : await api("/admin/programmes", { body });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast(id ? "Course saved." : "Course created.");
    setDraft(null);
    setReloadKey((k) => k + 1);
  }

  return (
    <>
      <PageHeader
        kicker="Teaching"
        title="Courses"
        description="Entrepreneurship and Innovation is the course, and the training areas are the topics in its outline. Every student takes every active course and is enrolled automatically when they register or are imported. Tutors are assigned per course."
        actions={!draft ? <Button onClick={() => setDraft(blank)}>New course</Button> : null}
      />

      {draft ? (
        <form onSubmit={save} className="mt-8 max-w-2xl space-y-6 border border-line bg-paper p-6" noValidate>
          <h2 className="text-ui-md font-semibold">{draft.id ? "Edit course" : "New course"}</h2>
          <TextField label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
          <TextArea label="Description" optional rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <TextArea
            label="What you will gain"
            optional
            hint="A short note shown to students on the course page."
            rows={3}
            value={draft.cover_note}
            onChange={(e) => setDraft({ ...draft, cover_note: e.target.value })}
          />
          <TextArea
            label="Course outline"
            optional
            hint="One topic per line, in teaching order. Students see it on the course page, and each class can name its topic."
            rows={9}
            value={draft.outline}
            onChange={(e) => setDraft({ ...draft, outline: e.target.value })}
          />
          <CheckboxField label="Active" hint="Inactive courses are hidden from the registration form, and new students are not enrolled in them." checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />
          <CheckboxField
            label="Main course"
            hint="Listed first for students and tutors. Entrepreneurship is the main course; the others follow in title order."
            checked={draft.sort_order === MAIN}
            onChange={(e) => setDraft({ ...draft, sort_order: e.target.checked ? MAIN : 100 })}
          />
          {error ? <Notice tone="error">{error}</Notice> : null}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={busy} loadingText="Saving…" disabled={!draft.title.trim()}>
              Save course
            </Button>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : error ? (
        <Notice tone="error" className="mt-6">{error}</Notice>
      ) : null}

      <div className="mt-8">
        <DataTable
          caption="Courses"
          rows={programmes}
          rowKey={(p) => p.id}
          onRowClick={(p) => router.push(`/admin/programmes/view/?id=${p.id}`)}
          empty={<EmptyState title="No courses yet." text="Create a course to start scheduling classes." action={<Button onClick={() => setDraft(blank)}>New course</Button>} />}
          columns={[
            {
              key: "title",
              header: "Course",
              primary: true,
              cell: (p) => (
                <>
                  <a href={`/admin/programmes/view/?id=${p.id}`} className="font-semibold text-ink hover:text-accent-strong hover:underline">
                    {p.title}
                  </a>
                  <span className="block max-w-measure text-ui-xs text-ink-muted">{p.description}</span>
                  {p.outline.length ? <span className="block text-ui-xs text-ink-muted">{p.outline.length} topics in the outline</span> : null}
                </>
              ),
            },
            {
              key: "state",
              header: "Status",
              cell: (p) => (
                <span className="flex flex-wrap gap-2">
                  <StatusLabel status={p.is_active ? "active" : "draft"} label={p.is_active ? "Active" : "Inactive"} />
                  {p.sort_order === MAIN ? <StatusLabel status="pinned" label="Main course" /> : null}
                </span>
              ),
            },
            { key: "students", header: "Students", numeric: true, cell: (p) => p.student_count },
            { key: "tutors", header: "Tutors", numeric: true, cell: (p) => p.tutor_count },
            { key: "classes", header: "Classes", numeric: true, cell: (p) => p.class_count },
            {
              key: "edit",
              header: "Actions",
              hiddenHeader: true,
              className: "w-16 md:text-right",
              cell: (p) => (
                <Button variant="quiet" onClick={() => setDraft({ id: p.id, title: p.title, description: p.description, cover_note: p.cover_note, is_active: p.is_active, sort_order: p.sort_order, outline: p.outline.join("\n") })}>
                  Edit
                </Button>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
