import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyCap } from "./warmup.js";

const on = (day: string) => new Date(`${day}T15:30:00Z`);

test("warm-up ramp: 50, 100, 250, 500, 1000, two days each, then the daily limit", () => {
  const start = "2026-11-20";
  const expected: [string, number, number | null][] = [
    ["2026-11-20", 50, 1],
    ["2026-11-21", 50, 2],
    ["2026-11-22", 100, 3],
    ["2026-11-23", 100, 4],
    ["2026-11-24", 250, 5],
    ["2026-11-25", 250, 6],
    ["2026-11-26", 500, 7],
    ["2026-11-27", 500, 8],
    ["2026-11-28", 1000, 9],
    ["2026-11-29", 1000, 10],
    ["2026-11-30", 2000, null],
    ["2027-01-15", 2000, null],
  ];
  for (const [day, cap, warmupDay] of expected) {
    assert.deepEqual(dailyCap(on(day), start, 2000), { cap, warmupDay }, day);
  }
});

test("warm-up never goes above EMAIL_DAILY_LIMIT", () => {
  assert.deepEqual(dailyCap(on("2026-11-26"), "2026-11-20", 300), { cap: 300, warmupDay: 7 });
});

test("before the start date the day 1 cap applies; without a start date the limit applies", () => {
  assert.deepEqual(dailyCap(on("2026-11-18"), "2026-11-20", 2000), { cap: 50, warmupDay: 1 });
  assert.deepEqual(dailyCap(on("2026-11-18"), undefined, 2000), { cap: 2000, warmupDay: null });
});
