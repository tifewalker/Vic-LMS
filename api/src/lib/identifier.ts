/**
 * Login identifiers: an email, a matric number or a tutor ID (VEC-TUT-0001).
 * Pure functions, unit tested.
 */

export type Identifier =
  | { kind: "email"; value: string }
  | { kind: "tutor_id"; value: string }
  | { kind: "matric_no"; value: string };

const TUTOR_ID = /^VEC-TUT-\d{4,}$/;

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Matric numbers are stored trimmed and uppercase, with inner spaces removed. */
export function normaliseMatric(matric: string): string {
  return matric.trim().toUpperCase().replace(/\s+/g, "");
}

export function parseIdentifier(raw: string): Identifier | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.includes("@")) return { kind: "email", value: normaliseEmail(value) };
  const upper = value.toUpperCase();
  if (TUTOR_ID.test(upper)) return { kind: "tutor_id", value: upper };
  return { kind: "matric_no", value: normaliseMatric(value) };
}
