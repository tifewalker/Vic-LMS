/** Password rules, mirrored from the API (api/src/lib/tokens.ts). */
export const passwordRules = [
  { label: "At least 10 characters", test: (p: string) => p.length >= 10 && p.length <= 72 },
  { label: "At least one letter", test: (p: string) => /[A-Za-z]/.test(p) },
  { label: "At least one number", test: (p: string) => /\d/.test(p) },
];

export const passwordOk = (p: string) => passwordRules.every((r) => r.test(p));

/** The first rule a password breaks, as a field error, or "" when it passes. */
export function passwordProblem(p: string): string {
  if (p.length > 72) return "Use 72 characters or fewer.";
  const broken = passwordRules.find((r) => !r.test(p));
  return broken ? `${broken.label}.` : "";
}

export const PASSWORD_HINT = "At least 10 characters, with a letter and a number.";
