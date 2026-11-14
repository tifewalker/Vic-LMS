import { z } from "zod";
import { normaliseEmail, normaliseMatric } from "./identifier.js";

/**
 * Validation for bulk student import rows. The web app runs the same rules in the
 * browser for the preview; the API validates again and is the source of truth.
 */

export type ImportRow = { matric_no: string; full_name: string; email: string };
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
    const messages: string[] = [];

    if (!matric) messages.push("Matric number is missing.");
    else if (matric.length > 40) messages.push("Matric number is too long.");
    if (!name) messages.push("Full name is missing.");
    else if (name.length > 120) messages.push("Full name is too long.");
    if (!email) messages.push("Email is missing.");
    else if (!emailSchema.safeParse(email).success) messages.push("Email is not valid.");

    if (matric && seenMatric.has(matric)) messages.push(`Same matric number as row ${seenMatric.get(matric)}.`);
    if (email && seenEmail.has(email)) messages.push(`Same email as row ${seenEmail.get(email)}.`);
    if (matric && !seenMatric.has(matric)) seenMatric.set(matric, row);
    if (email && !seenEmail.has(email)) seenEmail.set(email, row);

    if (messages.length) errors.push({ row, messages });
    else valid.push({ row, matric_no: matric, full_name: name, email });
  });

  return { valid, errors };
}
