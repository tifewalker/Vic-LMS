/**
 * A minimal iCalendar (RFC 5545) feed for class timetables. Pure functions, unit tested.
 * Calendar apps subscribe to the feed and refresh it, so moved or new classes appear by themselves.
 */

export type CalendarEvent = {
  uid: string;
  start: string; // ISO
  end: string; // ISO
  title: string;
  description?: string;
  url?: string;
  /** Minutes before the start for the phone's own reminder. */
  alarmMinutes?: number;
  cancelled?: boolean;
};

/** 2026-12-02T13:00:00.000Z to 20261202T130000Z */
export function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escapes text values: backslash, semicolon, comma and newlines. */
export function icsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds a content line at 75 octets, continuing with CRLF and one space. */
export function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Do not split a multi-byte character: back up to a character boundary.
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74; // continuation lines start with a space
  }
  return parts.join("\r\n ");
}

export function buildCalendar(opts: { name: string; events: CalendarEvent[]; now?: Date }): string {
  const stamp = icsDate((opts.now ?? new Date()).toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OAUSTECH and Crystal Entrepreneurship Centre//Training platform//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsText(opts.name)}`,
    "X-WR-TIMEZONE:Africa/Lagos",
    // Ask calendar apps to check for changes every few hours (not all of them honour it).
    "REFRESH-INTERVAL;VALUE=DURATION:PT3H",
    "X-PUBLISHED-TTL:PT3H",
  ];
  for (const e of opts.events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(e.start)}`,
      `DTEND:${icsDate(e.end)}`,
      `SUMMARY:${icsText(e.title)}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${icsText(e.description)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    if (e.cancelled) lines.push("STATUS:CANCELLED");
    if (e.alarmMinutes && !e.cancelled) {
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsText(e.title)}`, `TRIGGER:-PT${e.alarmMinutes}M`, "END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
