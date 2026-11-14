/**
 * Reads a student list (.csv or .xlsx) in the browser and checks each row for the preview.
 * Mirrors api/src/lib/rows.ts; the API validates again and has the final say.
 */

export type Row = { matric_no: string; full_name: string; email: string };
export type PreviewRow = Row & { line: number; problems: string[] };

const HEADERS: Record<keyof Row, string[]> = {
  matric_no: ["matric_no", "matric no", "matric number", "matric", "matriculation number"],
  full_name: ["full_name", "full name", "name"],
  email: ["email", "email address", "e-mail"],
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MAX_ROWS = 1000;

function columnIndex(header: string[]): Record<keyof Row, number> | null {
  const norm = header.map((h) => String(h ?? "").trim().toLowerCase());
  const out = {} as Record<keyof Row, number>;
  for (const key of Object.keys(HEADERS) as (keyof Row)[]) {
    const i = norm.findIndex((h) => HEADERS[key].includes(h));
    if (i === -1) return null;
    out[key] = i;
  }
  return out;
}

/** Turns a sheet (first row = headers) into checked rows. Throws a readable error. */
export function checkSheet(sheet: unknown[][]): PreviewRow[] {
  const nonEmpty = sheet.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  if (nonEmpty.length < 2) throw new Error("The file has no student rows.");
  const cols = columnIndex(nonEmpty[0] as string[]);
  if (!cols) throw new Error("The first row must have the columns matric_no, full_name and email. Use the CSV template.");
  const body = nonEmpty.slice(1);
  if (body.length > MAX_ROWS) throw new Error(`The file has ${body.length} rows. Upload at most ${MAX_ROWS} at a time.`);

  const seenMatric = new Map<string, number>();
  const seenEmail = new Map<string, number>();

  return body.map((r, i) => {
    const line = i + 2; // spreadsheet line number, counting the header row
    const matric_no = String(r[cols.matric_no] ?? "").trim().toUpperCase().replace(/\s+/g, "");
    const full_name = String(r[cols.full_name] ?? "").trim().replace(/\s+/g, " ");
    const email = String(r[cols.email] ?? "").trim().toLowerCase();
    const problems: string[] = [];

    if (!matric_no) problems.push("Matric number is missing.");
    if (!full_name) problems.push("Full name is missing.");
    if (!email) problems.push("Email is missing.");
    else if (!EMAIL.test(email)) problems.push("Email is not valid.");
    if (matric_no && seenMatric.has(matric_no)) problems.push(`Same matric number as line ${seenMatric.get(matric_no)}.`);
    if (email && seenEmail.has(email)) problems.push(`Same email as line ${seenEmail.get(email)}.`);
    if (matric_no && !seenMatric.has(matric_no)) seenMatric.set(matric_no, line);
    if (email && !seenEmail.has(email)) seenEmail.set(email, line);

    return { line, matric_no, full_name, email, problems };
  });
}

/** Reads a File into rows of cells. The parsers load only when a file is chosen. */
export async function readFile(file: File): Promise<unknown[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const Papa = (await import("papaparse")).default;
    const text = await file.text();
    const result = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: true });
    return result.data;
  }
  if (name.endsWith(".xlsx")) {
    const { readSheet } = await import("read-excel-file/browser");
    return (await readSheet(file)) as unknown[][];
  }
  throw new Error("Choose a .csv or .xlsx file.");
}
