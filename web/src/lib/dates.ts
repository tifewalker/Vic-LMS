/** Dates and times, shown in British style in the viewer's own time zone. */

export function formatDate(iso: string | null | undefined, month: "short" | "long" = "short"): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month, year: "numeric" });
}

/** e.g. "Tue 10 Nov 2026, 14:00" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** e.g. "14:00 to 15:30" (same day) */
export function formatTimeRange(start: string, end: string): string {
  const t = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${t(start)} to ${t(end)}`;
}

/** ISO string to the value a <input type="datetime-local"> expects, in local time. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value (local time) to an ISO string, or null if empty. */
export function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export const classStatusLabel: Record<string, string> = { scheduled: "Scheduled", live: "Live now", ended: "Ended" };
