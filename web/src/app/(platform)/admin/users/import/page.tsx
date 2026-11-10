"use client";

import { useState } from "react";
import { Button, Notice, PageTitle } from "@/components/platform/ui";
import { api } from "@/lib/api";
import { checkSheet, readFile, type PreviewRow } from "@/lib/import-rows";
import { cx } from "@/lib/cx";

type ImportResult = {
  created: number;
  skipped: { row: number; reason: string }[];
  errors: { row: number; messages: string[] }[];
  invites: { sent: number; failed: number; stillPending: number };
};

export default function ImportPage() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ data: ImportResult; lines: number[] } | null>(null);

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
    const res = await api<ImportResult>("/admin/students/import", { body: { rows: send } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    // The API numbers rows from 1 in the order sent; map back to file line numbers.
    setResult({ data: res.data, lines: valid.map((r) => r.line) });
    setRows(null);
  }

  return (
    <>
      <PageTitle kicker="Users" title="Import students">
        <a href="/templates/students-template.csv" download className="text-[0.9375rem] font-semibold text-accent-strong hover:underline">
          Download CSV template
        </a>
      </PageTitle>

      <div className="mt-8 max-w-2xl space-y-4">
        <p>
          Upload a .csv or .xlsx file with the columns <code>matric_no</code>, <code>full_name</code> and <code>email</code>. You will
          see a preview before anything is saved.
        </p>
        <label className="block">
          <span className="block text-[0.9375rem] font-semibold">Student list</span>
          <input
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={onFile}
            className="mt-1.5 block w-full text-[0.9375rem] file:mr-4 file:cursor-pointer file:rounded-sm file:border file:border-line file:bg-paper file:px-4 file:py-2 file:font-semibold file:text-ink"
          />
        </label>
        {error ? <Notice tone="error">{error}</Notice> : null}
      </div>

      {rows ? (
        <section className="mt-10" aria-labelledby="preview-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="preview-title" className="text-2xl">
                Preview of {fileName}
              </h2>
              <p className="mt-1 text-ink-muted">
                {valid.length} ready to import{invalid ? `, ${invalid} with problems (these will be left out)` : ""}.
              </p>
            </div>
            <Button onClick={onConfirm} disabled={busy || valid.length === 0}>
              {busy ? "Importing…" : `Import ${valid.length} student${valid.length === 1 ? "" : "s"}`}
            </Button>
          </div>
          <div className="mt-4 max-h-[60vh] overflow-auto border-y border-line">
            <table className="w-full min-w-[720px] border-collapse text-left text-[0.9375rem]">
              <thead className="sticky top-0 bg-paper">
                <tr className="border-b border-line text-sm text-ink-muted">
                  <th className="py-2 pr-4 font-semibold">Line</th>
                  <th className="py-2 pr-4 font-semibold">Matric no.</th>
                  <th className="py-2 pr-4 font-semibold">Full name</th>
                  <th className="py-2 pr-4 font-semibold">Email</th>
                  <th className="py-2 font-semibold">Check</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line} className={cx("border-b border-line align-top", r.problems.length > 0 && "bg-accent-soft/50")}>
                    <td className="py-2 pr-4 tabular-nums text-ink-muted">{r.line}</td>
                    <td className="py-2 pr-4">{r.matric_no}</td>
                    <td className="py-2 pr-4">{r.full_name}</td>
                    <td className="py-2 pr-4">{r.email}</td>
                    <td className={cx("py-2 text-sm", r.problems.length ? "text-accent-strong" : "text-sage-strong")}>
                      {r.problems.length ? r.problems.join(" ") : "Ready"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {result ? (
        <section className="mt-10 max-w-3xl space-y-4" aria-labelledby="result-title">
          <h2 id="result-title" className="text-2xl">
            Import finished
          </h2>
          <Notice tone="success">
            Created {result.data.created} student{result.data.created === 1 ? "" : "s"}. Sent {result.data.invites.sent} invite
            {result.data.invites.sent === 1 ? "" : "s"}.
            {result.data.invites.stillPending
              ? ` ${result.data.invites.stillPending} invites are waiting for tomorrow's email allowance; use Send pending invites on the Users page.`
              : ""}
          </Notice>
          {result.data.skipped.length || result.data.errors.length ? (
            <div>
              <h3 className="text-lg">Not imported</h3>
              <ul className="mt-2 border-t border-line text-[0.9375rem]">
                {[
                  ...result.data.skipped.map((s) => ({ row: s.row, text: s.reason })),
                  ...result.data.errors.map((e) => ({ row: e.row, text: e.messages.join(" ") })),
                ]
                  .sort((a, b) => a.row - b.row)
                  .map((item) => (
                    <li key={item.row} className="border-b border-line py-2">
                      <span className="text-ink-muted">Line {result.lines[item.row - 1]}:</span> {item.text}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
          <p>
            <a href="/admin/users/?role=student" className="font-semibold text-accent-strong hover:underline">
              Go to students
            </a>
          </p>
        </section>
      ) : null}
    </>
  );
}
