/** Dates are stored as YYYY-MM-DD and shown in British style, e.g. 11 Jan 2027. */
export function formatDate(iso: string | null | undefined, month: "short" | "long" = "short"): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month, year: "numeric", timeZone: "UTC" });
}

/** Week number (1-based) of `today` in a programme that starts on `start`. Below 1 means not started. */
export function weekOf(start: string, today = new Date()): number {
  const [y, m, d] = start.slice(0, 10).split("-").map(Number);
  const startUtc = Date.UTC(y, m - 1, d);
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((todayUtc - startUtc) / (7 * 86400000)) + 1;
}

export const batchStatusLabel: Record<string, string> = { planned: "Planned", active: "Active", completed: "Completed" };
