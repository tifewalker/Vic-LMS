import { createHash, randomBytes } from "node:crypto";

export const INVITE_TTL_HOURS = 72;

/** 32 random bytes, base64url. Only the hash is stored. */
export function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function looksLikeToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

/** Password rules, mirrored in the web app. */
export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 10) problems.push("Use at least 10 characters.");
  if (password.length > 72) problems.push("Use 72 characters or fewer.");
  if (!/[A-Za-z]/.test(password)) problems.push("Include at least one letter.");
  if (!/\d/.test(password)) problems.push("Include at least one number.");
  return problems;
}
