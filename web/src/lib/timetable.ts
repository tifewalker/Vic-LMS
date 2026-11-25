/**
 * The lecture timetable agreed with the school (25 November 2026): Wednesdays from 2 pm to
 * 6 pm, and Saturdays at the same time when needed. Times are the viewer's local time, which
 * for this programme is Nigeria time.
 */

export const TIMETABLE_TEXT = "Lectures hold on Wednesdays from 2 pm to 6 pm, and on some Saturdays at the same time.";

const START_HOUR = 14;
const END_HOUR = 18;
const WEDNESDAY = 3;
const SATURDAY = 6;

const pad = (n: number) => String(n).padStart(2, "0");
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** The next Wednesday lecture slot (today counts if it has not started), as datetime-local values. */
export function nextWednesdaySlot(now = new Date()): { starts_at: string; ends_at: string } {
  const start = new Date(now);
  start.setHours(START_HOUR, 0, 0, 0);
  let days = (WEDNESDAY - now.getDay() + 7) % 7;
  if (days === 0 && now >= start) days = 7;
  start.setDate(start.getDate() + days);
  const end = new Date(start);
  end.setHours(END_HOUR);
  return { starts_at: localInput(start), ends_at: localInput(end) };
}

/** A warning when a class (datetime-local values) falls outside the timetable, or "" when it fits. */
export function timetableWarning(startsAt: string, endsAt: string): string {
  if (!startsAt || !endsAt) return "";
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return "";
  const day = start.getDay();
  const sameDay = start.toDateString() === end.toDateString();
  const minutes = (d: Date) => d.getHours() * 60 + d.getMinutes();
  const inHours = sameDay && minutes(start) >= START_HOUR * 60 && minutes(end) <= END_HOUR * 60;
  if ((day === WEDNESDAY || day === SATURDAY) && inHours) return "";
  return "This class is outside the timetable (Wednesdays, or Saturdays when needed, from 2 pm to 6 pm). You can still save it.";
}
