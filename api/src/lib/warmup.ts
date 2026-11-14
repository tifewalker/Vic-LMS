/** Warm-up for a new sending domain: the daily cap grows over the first ten days. Pure, so it can be tested. */

/** Daily caps for the first ten days of a new sending domain, two days per step. */
export const WARMUP_RAMP = [50, 50, 100, 100, 250, 250, 500, 500, 1000, 1000] as const;
const DAY_MS = 24 * 3600 * 1000;

export const utcDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/**
 * Today's cap. During warm-up (days 1 to 10 from EMAIL_WARMUP_START) it follows the ramp,
 * never above EMAIL_DAILY_LIMIT. Before the start date the day 1 cap applies.
 */
export function dailyCap(
  now: Date,
  warmupStart: string | undefined,
  limit: number,
): { cap: number; warmupDay: number | null } {
  if (!warmupStart) return { cap: limit, warmupDay: null };
  const day = Math.max(1, Math.floor((utcDay(now) - Date.parse(`${warmupStart}T00:00:00Z`)) / DAY_MS) + 1);
  if (day > WARMUP_RAMP.length) return { cap: limit, warmupDay: null };
  return { cap: Math.min(WARMUP_RAMP[day - 1], limit), warmupDay: day };
}
