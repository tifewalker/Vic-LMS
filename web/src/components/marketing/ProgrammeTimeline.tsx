import { programme, structure } from "@/content/landing";
import { cx } from "@/lib/cx";
import { KEY_WEEKS, PhaseRuler, span, tones, WEEKS } from "./PhaseRuler";
import { Section, SectionBody, SectionHeader } from "./Section";

export function ProgrammeTimeline() {
  return (
    <Section id="structure" labelledBy="structure-title" tone="paper-2">
      <SectionHeader kicker={structure.kicker} titleId="structure-title" title={structure.heading} />
      <SectionBody className="mt-6 md:mt-8">
        <p className="max-w-measure">{structure.intro}</p>
      </SectionBody>

      <PhaseRuler className="mt-14 hidden md:block" />
      <VerticalRuler />

      <ol className="mt-12 grid gap-y-14 md:mt-14 md:grid-cols-12 md:gap-x-8">
        {structure.phases.map((phase) => {
          const tone = tones[phase.id];
          return (
            <li
              key={phase.id}
              className={cx("border-t-2 pt-6", tone.rule, phase.id === "virtual" ? "md:col-span-5" : "md:col-span-7")}
            >
              <p className={cx("kicker", tone.text)}>
                {phase.label} <span aria-hidden="true">·</span> {phase.weeksLabel}
              </p>
              <h3 className="mt-3 text-[1.75rem] md:text-[2rem]">{phase.title}</h3>
              <p className="mt-3 font-serif text-[1.25rem] leading-snug italic">{phase.lede}</p>
              <div className="mt-5 max-w-measure space-y-4">
                {phase.body.map((para) => (
                  <p key={para.slice(0, 24)}>{para}</p>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

/** The same ruler turned on its side for narrow screens. One row per week. Decorative. */
function VerticalRuler() {
  return (
    <div
      aria-hidden="true"
      className="mt-10 grid grid-cols-[2rem_1fr] md:hidden"
      style={{ gridTemplateRows: `repeat(${programme.durationWeeks}, 0.875rem)` }}
    >
      {WEEKS.map((week) => {
        const key = KEY_WEEKS.has(week);
        return (
          <div key={week} style={{ gridRow: week, gridColumn: 1 }} className="relative border-r border-ink">
            <span className={cx("absolute top-0 right-0 h-px bg-ink", key ? "w-3" : "w-1.5")} />
            {key ? (
              <span className="absolute top-0 right-4 -translate-y-1/2 text-[0.6875rem] leading-none font-semibold tabular-nums">
                {week}
              </span>
            ) : null}
          </div>
        );
      })}
      {structure.phases.map((phase) => (
        <div
          key={phase.id}
          style={{ gridRow: span(phase), gridColumn: 2 }}
          className={cx("border-l-2 px-3 py-2.5", tones[phase.id].band)}
        >
          <p className={cx("kicker", tones[phase.id].text)}>{phase.label}</p>
          <p className="mt-0.5 font-serif text-[1.0625rem] leading-tight">{phase.title}</p>
        </div>
      ))}
    </div>
  );
}
