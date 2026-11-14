/** Password rules, mirrored from the API (api/src/lib/tokens.ts). */
export const passwordRules = [
  { label: "At least 10 characters", test: (p: string) => p.length >= 10 && p.length <= 72 },
  { label: "At least one letter", test: (p: string) => /[A-Za-z]/.test(p) },
  { label: "At least one number", test: (p: string) => /\d/.test(p) },
];

export const passwordOk = (p: string) => passwordRules.every((r) => r.test(p));
