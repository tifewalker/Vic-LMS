import { z } from "zod";
import { normaliseEmail, normaliseMatric } from "./identifier.js";

/**
 * Validation for bulk student import rows. The web app runs the same rules in the
 * browser for the preview; the API validates again and is the source of truth.
 */

/** matric_no holds the matric number, or the registration number for students who have none yet (100 Level). */
export type ImportRow = {
  matric_no: string;
  full_name: string;
  email: string;
  department: string | null;
  level: number | null;
  phone: string | null;
  sex: Sex | null;
};

export type Sex = "male" | "female";

/** "M", "male", "F" or "Female". Empty gives null; anything else gives "invalid". */
export function parseSex(raw: unknown): Sex | null | "invalid" {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s === "m" || s === "male") return "male";
  if (s === "f" || s === "female") return "female";
  return "invalid";
}

/**
 * Phone numbers are stored as digits with an optional leading +. A Nigerian number written
 * the local way (0803 123 4567) is stored as +2348031234567. Empty gives null; anything that
 * is not 7 to 15 digits gives "invalid".
 */
export function parsePhone(raw: unknown): string | null | "invalid" {
  const s = String(raw ?? "").trim().replace(/[\s().-]/g, "");
  if (!s) return null;
  if (!/^\+?[0-9]{7,15}$/.test(s)) return "invalid";
  if (/^0[0-9]{10}$/.test(s)) return `+234${s.slice(1)}`;
  if (/^234[0-9]{10}$/.test(s)) return `+${s}`;
  return s;
}

export const LEVELS = [100, 200, 300, 400, 500] as const;

/** "300", "300L", "300 Level" or 300 to 300. Empty gives null; anything else gives NaN. */
export function parseLevel(raw: unknown): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const m = /^(\d{3})\s*(l|lvl|level)?$/i.exec(s);
  const n = m ? Number(m[1]) : NaN;
  return (LEVELS as readonly number[]).includes(n) ? n : NaN;
}
export type RowError = { row: number; messages: string[] };

const emailSchema = z.email();

export function validateRows(input: unknown[]): { valid: (ImportRow & { row: number })[]; errors: RowError[] } {
  const valid: (ImportRow & { row: number })[] = [];
  const errors: RowError[] = [];
  const seenMatric = new Map<string, number>();
  const seenEmail = new Map<string, number>();

  input.forEach((raw, i) => {
    const row = i + 1;
    const r = (raw ?? {}) as Record<string, unknown>;
    const matric = normaliseMatric(String(r.matric_no ?? ""));
    const name = String(r.full_name ?? "").trim().replace(/\s+/g, " ");
    const email = normaliseEmail(String(r.email ?? ""));
    const department = String(r.department ?? "").trim().replace(/\s+/g, " ") || null;
    const level = parseLevel(r.level);
    const phone = parsePhone(r.phone);
    const sex = parseSex(r.sex);
    const messages: string[] = [];

    if (!matric) messages.push("Matric or registration number is missing.");
    else if (matric.length > 40) messages.push("Matric or registration number is too long.");
    // The matric (or registration) number is the student's first password, and passwords need at least 6 characters.
    else if (matric.length < 6) messages.push("Matric or registration number is too short to use as a password (at least 6 characters).");
    if (!name) messages.push("Full name is missing.");
    else if (name.length > 120) messages.push("Full name is too long.");
    if (!email) messages.push("Email is missing.");
    else if (!emailSchema.safeParse(email).success) messages.push("Email is not valid.");
    if (department && department.length > 120) messages.push("Department is too long.");
    if (Number.isNaN(level)) messages.push("Level must be 100, 200, 300, 400 or 500.");
    if (phone === "invalid") messages.push("Phone number is not valid.");
    if (sex === "invalid") messages.push("Sex must be male or female.");

    if (matric && seenMatric.has(matric)) messages.push(`Same matric or registration number as row ${seenMatric.get(matric)}.`);
    if (email && seenEmail.has(email)) messages.push(`Same email as row ${seenEmail.get(email)}.`);
    if (matric && !seenMatric.has(matric)) seenMatric.set(matric, row);
    if (email && !seenEmail.has(email)) seenEmail.set(email, row);

    if (messages.length) errors.push({ row, messages });
    else valid.push({ row, matric_no: matric, full_name: name, email, department, level, phone: phone as string | null, sex: sex as Sex | null });
  });

  return { valid, errors };
}
