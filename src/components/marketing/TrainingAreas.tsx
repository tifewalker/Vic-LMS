import { Disclosure } from "@/components/ui/Disclosure";
import { trainingAreas } from "@/content/landing";
import { Section, SectionHeader } from "./Section";

const pad = (n: number) => String(n).padStart(2, "0");

/** The eight areas as a table of contents. Each row opens to show topics and outcomes. */
export function TrainingAreas() {
  return (
    <Section id="training-areas" labelledBy="training-areas-title">
      <SectionHeader number="03" titleId="training-areas-title" title={trainingAreas.kicker} />

      <ol className="mt-10 border-t border-line md:mt-14">
        {trainingAreas.areas.map((area) => (
          <li key={area.number} className="border-b border-line">
            <Disclosure
              id={`area-${area.number}`}
              buttonClassName="py-6 md:py-7 hover:[&_.area-title]:text-accent-strong"
              panelClassName="pb-10"
              header={
                <span className="grid grid-cols-[2.25rem_1fr] gap-x-3 md:grid-cols-12 md:gap-x-8">
                  <span className="pt-[0.3em] font-serif text-[1.0625rem] text-accent-strong tabular-nums md:col-span-3 md:text-lg">
                    {pad(area.number)}
                  </span>
                  <span className="md:col-span-9">
                    <span className="area-title block font-serif text-[1.375rem] leading-tight text-ink transition-colors md:text-[1.875rem]">
                      {area.title}
                    </span>
                    <span className="mt-1.5 block text-[1rem] leading-snug text-ink-muted">{area.tagline}</span>
                  </span>
                </span>
              }
            >
              <div className="grid grid-cols-[2.25rem_1fr] gap-x-3 md:grid-cols-12 md:gap-x-8 md:pr-[2.125rem]">
                <div className="col-start-2 grid gap-y-8 md:col-span-9 md:col-start-4 lg:grid-cols-9 lg:gap-x-8">
                  <div className="lg:col-span-5">
                    {area.intro.length > 0 ? (
                      <div className="mb-6 max-w-measure space-y-4">
                        {area.intro.map((para) => (
                          <p key={para.slice(0, 24)}>{para}</p>
                        ))}
                      </div>
                    ) : null}
                    <p className="kicker">{trainingAreas.topicsLabel}</p>
                    <ul className="mt-3 border-t border-line text-[1rem]">
                      {area.topics.map((topic) => (
                        <li key={topic} className="border-b border-line py-2.5 leading-snug">
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="self-start border-l-2 border-accent pl-5 lg:col-span-4">
                    <p className="kicker text-accent-strong">{trainingAreas.gainLabel}</p>
                    <p className="mt-2 font-serif text-[1.25rem] leading-snug md:text-[1.375rem]">{area.gain}</p>
                    {area.note ? <p className="mt-5 text-[0.9375rem] text-ink-muted italic">{area.note}</p> : null}
                  </div>
                </div>
              </div>
            </Disclosure>
          </li>
        ))}
      </ol>
    </Section>
  );
}
