/**
 * Reads a student list (.csv or .xlsx) in the browser and checks each row for the preview.
 * Mirrors api/src/lib/rows.ts; the API validates again and has the final say.
 */

export type Row = { matric_no: string; full_name: string; email: string; department: string; level: string; phone: string; sex: string };
export type PreviewRow = Row & { line: number; problems: string[] };

const HEADERS: Record<keyof Row, string[]> = {
  // 100 Level students have no matric number yet: their registration number goes in this column.
  matric_no: ["matric_no", "matric no", "matric number", "matric", "matriculation number", "reg_no", "reg no", "registration number", "matric or registration number"],
  full_name: ["full_name", "full name", "name"],
  email: ["email", "email address", "e-mail"],
  department: ["department", "dept"],
  level: ["level", "lvl"],
  phone: ["phone", "phone number", "phone_number", "mobile", "telephone"],
  sex: ["sex", "gender"],
};
/** Columns a file may leave out. */
const OPTIONAL: (keyof Row)[] = ["department", "level", "phone", "sex"];
const LEVEL = /^(100|200|300|400|500)\s*(l|lvl|level)?$/i;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MAX_ROWS = 1000;

function columnIndex(header: string[]): Record<keyof Row, number> | null {
  const norm = header.map((h) => String(h ?? "").trim().toLowerCase());
  const out = {} as Record<keyof Row, number>;
  for (const key of Object.keys(HEADERS) as (keyof Row)[]) {
    const i = norm.findIndex((h) => HEADERS[key].includes(h));
    if (i === -1 && !OPTIONAL.includes(key)) return null;
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
    const department = cols.department === -1 ? "" : String(r[cols.department] ?? "").trim().replace(/\s+/g, " ");
    const level = cols.level === -1 ? "" : String(r[cols.level] ?? "").trim();
    const phone = cols.phone === -1 ? "" : String(r[cols.phone] ?? "").trim();
    const sex = cols.sex === -1 ? "" : String(r[cols.sex] ?? "").trim();
    const problems: string[] = [];

    if (!matric_no) problems.push("Matric or registration number is missing.");
    // Same rule as the API: the matric (or registration) number is the first password, which needs 6 characters.
    else if (matric_no.length < 6) problems.push("Matric or registration number is too short to use as a password (at least 6 characters).");
    if (!full_name) problems.push("Full name is missing.");
    if (!email) problems.push("Email is missing.");
    else if (!EMAIL.test(email)) problems.push("Email is not valid.");
    if (department.length > 120) problems.push("Department is too long.");
    if (level && !LEVEL.test(level)) problems.push("Level must be 100, 200, 300, 400 or 500.");
    if (phone && !/^\+?[0-9]{7,15}$/.test(phone.replace(/[\s().-]/g, ""))) problems.push("Phone number is not valid.");
    if (sex && !/^(m|f|male|female)$/i.test(sex)) problems.push("Sex must be male or female.");
    if (matric_no && seenMatric.has(matric_no)) problems.push(`Same matric or registration number as line ${seenMatric.get(matric_no)}.`);
    if (email && seenEmail.has(email)) problems.push(`Same email as line ${seenEmail.get(email)}.`);
    if (matric_no && !seenMatric.has(matric_no)) seenMatric.set(matric_no, line);
    if (email && !seenEmail.has(email)) seenEmail.set(email, line);

    return { line, matric_no, full_name, email, department, level, phone, sex, problems };
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
