import { programme, structure, type Phase } from "@/content/landing";
import { cx } from "@/lib/cx";

/** Shared pieces of the 26-week timeline, used by the landing page and the student dashboard. */

export const WEEKS = Array.from({ length: programme.durationWeeks }, (_, i) => i + 1);

/** Weeks that get a long tick and a bold number: the start and end of each phase. */
export const KEY_WEEKS = new Set(structure.phases.flatMap((p) => [p.weeks.from, p.weeks.to]));

export const tones: Record<Phase["id"], { band: string; text: string; rule: string }> = {
  virtual: { band: "bg-accent-soft border-accent", text: "text-accent-strong", rule: "border-accent" },
  physical: { band: "bg-sage-soft border-sage", text: "text-sage-strong", rule: "border-sage" },
};

export const span = (p: Phase) => `${p.weeks.from} / ${p.weeks.to + 1}`;

/**
 * 26 equal columns: phase bands above a week ruler. Decorative (aria-hidden): pages that use it
 * describe the same information in text. `currentWeek` shades that week's column.
 * `compact` tightens the labels and hides minor week numbers on narrow screens.
 */
export function PhaseRuler({
  currentWeek,
  compact = false,
  className,
}: {
  currentWeek?: number | null;
  compact?: boolean;
  className?: string;
}) {
  const marked = currentWeek && currentWeek >= 1 && currentWeek <= WEEKS.length ? currentWeek : null;
  return (
    <div aria-hidden="true" className={cx("relative", className)}>
      {marked ? (
        <div
          className="pointer-events-none absolute top-0 bottom-6 z-10 bg-ink/12"
          style={{ left: `${((marked - 1) / WEEKS.length) * 100}%`, width: `${100 / WEEKS.length}%` }}
        />
      ) : null}
      <div className="grid grid-cols-[repeat(26,minmax(0,1fr))]">
        {structure.phases.map((phase) => (
          <div
            key={phase.id}
            style={{ gridColumn: span(phase) }}
            className={cx(
              "border-l-2",
              compact ? "px-1.5 py-2 sm:px-3 sm:py-3" : "px-3 py-3.5 lg:px-4 lg:py-4",
              tones[phase.id].band,
            )}
          >
            <p className={cx("kicker", tones[phase.id].text, compact && "text-[0.625rem] sm:text-[0.8125rem]")}>{phase.label}</p>
            <p className={cx("mt-1 font-serif leading-tight", compact ? "text-[0.8125rem] sm:text-base" : "text-base lg:text-xl")}>
              {phase.title}
            </p>
          </div>
        ))}
      </div>
      <ol className="relative grid grid-cols-[repeat(26,minmax(0,1fr))] border-t border-ink">
        {WEEKS.map((week) => {
          const key = KEY_WEEKS.has(week);
          const current = week === marked;
          return (
            <li key={week} className="relative h-9">
              <span className={cx("absolute top-0 left-0 w-px", current ? "h-4 bg-accent-strong" : key ? "h-4 bg-ink" : "h-2 bg-ink")} />
              <span
                className={cx(
                  "absolute top-5 left-0 text-[0.6875rem] leading-none tabular-nums",
                  current ? "font-semibold text-accent-strong" : key ? "font-semibold text-ink" : "text-ink-muted",
                  compact && !key && !current && "hidden sm:block",
                )}
              >
                {week}
              </span>
            </li>
          );
        })}
        <span className="absolute top-0 right-0 h-4 w-px bg-ink" />
      </ol>
      <p className="kicker mt-1">Week</p>
    </div>
  );
}
