"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { FileField, SelectField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { PageHeader, SectionTitle } from "@/components/ui/PageHeader";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { checkSheet, readFile, type PreviewRow } from "@/lib/import-rows";

type ImportResult = {
  created: number;
  skipped: { row: number; reason: string }[];
  errors: { row: number; messages: string[] }[];
  invites: { sent: number; failed: number; stillPending: number };
  enrolled: { added: number } | null;
};
type ProgrammeOption = { id: string; title: string; is_active: boolean };

export default function ImportPage() {
  const toast = useToast();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ data: ImportResult; lines: number[] } | null>(null);
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([]);
  const [programmeId, setProgrammeId] = useState("");

  useEffect(() => {
    api<{ programmes: ProgrammeOption[] }>("/admin/programmes").then((res) => {
      if (res.ok) setProgrammes(res.data.programmes.filter((p) => p.is_active));
    });
  }, []);

  const valid = rows?.filter((r) => r.problems.length === 0) ?? [];
  const invalid = rows ? rows.length - valid.length : 0;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setRows(null);
    setResult(null);
    setError("");
    if (!file) return;
    setFileName(file.name);
    try {
      setRows(checkSheet(await readFile(file)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this file.");
    }
  }

  async function onConfirm() {
    setBusy(true);
    setError("");
    const send = valid.map(({ matric_no, full_name, email }) => ({ matric_no, full_name, email }));
    const res = await api<ImportResult>("/admin/students/import", { body: { rows: send, ...(programmeId ? { programme_id: programmeId } : {}) } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    // The API numbers rows from 1 in the order sent; map back to file line numbers.
    setResult({ data: res.data, lines: valid.map((r) => r.line) });
    toast(`Created ${res.data.created} student${res.data.created === 1 ? "" : "s"}.`);
    setRows(null);
  }

  const notImported = result
    ? [
        ...result.data.skipped.map((s) => ({ row: s.row, text: s.reason })),
        ...result.data.errors.map((e) => ({ row: e.row, text: e.messages.join(" ") })),
      ].sort((a, b) => a.row - b.row)
    : [];

  return (
    <>
      <PageHeader
        kicker="People"
        title="Import students"
        description="Upload a .csv or .xlsx file with matric_no, full_name and email. You see a preview before anything is saved."
        actions={
          <ButtonLink href="/templates/students-template.csv" download variant="secondary">
            Download CSV template
          </ButtonLink>
        }
      />

      <div className="mt-8 grid max-w-2xl gap-6">
        <FileField label="Student list" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onFile} />
        <SelectField label="Enrol in a programme" optional value={programmeId} onChange={(e) => setProgrammeId(e.target.value)}>
          <option value="">Not yet</option>
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </SelectField>
        {error ? <Notice tone="error">{error}</Notice> : null}
      </div>

      {rows ? (
        <section className="mt-12" aria-labelledby="preview-title">
          <SectionTitle
            id="preview-title"
            action={
              <Button onClick={onConfirm} loading={busy} loadingText="Importing…" disabled={valid.length === 0}>
                Import {valid.length} student{valid.length === 1 ? "" : "s"}
              </Button>
            }
          >
            Preview of {fileName}
          </SectionTitle>
          <p className="mt-1 text-ui-sm text-ink-muted">
            {valid.length} ready to import{invalid ? `, ${invalid} with problems (these will be left out)` : ""}.
          </p>
          <div className="mt-4">
            <DataTable
              caption={`Preview of ${fileName}`}
              rows={rows}
              rowKey={(r) => String(r.line)}
              columns={[
                {
                  key: "student",
                  header: "Student",
                  primary: true,
                  cell: (r) => (
                    <>
                      <span className="block font-semibold">{r.full_name || <span className="text-ink-muted">No name</span>}</span>
                      <span className="block text-ui-xs break-all text-ink-muted">{r.email}</span>
                    </>
                  ),
                },
                { key: "matric", header: "Matric no.", cell: (r) => <span className="tabular-nums">{r.matric_no}</span> },
                { key: "line", header: "Line", numeric: true, cell: (r) => r.line },
                {
                  key: "check",
                  header: "Check",
                  cell: (r) =>
                    r.problems.length ? (
                      <span className="text-ui-xs font-semibold text-accent-strong">{r.problems.join(" ")}</span>
                    ) : (
                      <StatusLabel status="ready" label="Ready" tone="sage" />
                    ),
                },
              ]}
            />
          </div>
        </section>
      ) : null}

      {result ? (
        <section className="mt-12 max-w-3xl space-y-6" aria-labelledby="result-title">
          <SectionTitle id="result-title">Import finished</SectionTitle>
          <Notice tone="success">
            Created {result.data.created} student{result.data.created === 1 ? "" : "s"}. Sent {result.data.invites.sent} invite
            {result.data.invites.sent === 1 ? "" : "s"}.{result.data.enrolled ? ` Enrolled ${result.data.enrolled.added} in the programme.` : ""}
            {result.data.invites.stillPending
              ? ` ${result.data.invites.stillPending} invites are waiting for tomorrow's email allowance; use Send pending invites on the Users page.`
              : ""}
          </Notice>
          {notImported.length ? (
            <div>
              <h3 className="ui-label">Not imported</h3>
              <ul className="mt-2 border-t border-line">
                {notImported.map((item) => (
                  <li key={item.row} className="border-b border-line py-3">
                    <span className="text-ink-muted">Line {result.lines[item.row - 1]}:</span> {item.text}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <ButtonLink href="/admin/users/?role=student" variant="secondary">
            Go to students
          </ButtonLink>
        </section>
      ) : null}
    </>
  );
}
