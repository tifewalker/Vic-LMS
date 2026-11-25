import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCalendar, foldLine, icsDate, icsText } from "./ics.js";

test("dates are UTC basic format", () => {
  assert.equal(icsDate("2026-12-02T14:00:00+01:00"), "20261202T130000Z");
});

test("text is escaped", () => {
  assert.equal(icsText("Data, AI; and\nmore \\ end"), "Data\\, AI\\; and\\nmore \\\\ end");
});

test("long lines fold at 75 octets without splitting characters", () => {
  const line = "SUMMARY:" + "é".repeat(60);
  const folded = foldLine(line);
  for (const part of folded.split("\r\n")) assert.ok(Buffer.byteLength(part, "utf8") <= 75);
  assert.equal(folded.replace(/\r\n /g, ""), line);
});

test("a calendar has one event per class with a reminder", () => {
  const ics = buildCalendar({
    name: "Timetable",
    now: new Date("2026-11-25T10:00:00Z"),
    events: [
      { uid: "a@x", start: "2026-12-02T13:00:00Z", end: "2026-12-02T15:00:00Z", title: "Pitching", url: "https://x/class/?id=a", alarmMinutes: 60 },
      { uid: "b@x", start: "2026-12-05T13:00:00Z", end: "2026-12-05T15:00:00Z", title: "Moved", cancelled: true, alarmMinutes: 60 },
    ],
  });
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 2);
  assert.equal(ics.match(/BEGIN:VALARM/g)?.length, 1);
  assert.ok(ics.includes("TRIGGER:-PT60M"));
  assert.ok(ics.includes("STATUS:CANCELLED"));
  assert.ok(ics.includes("DTSTAMP:20261125T100000Z"));
});
