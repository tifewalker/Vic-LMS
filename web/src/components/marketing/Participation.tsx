import { eligibility, whoShouldParticipate } from "@/content/landing";
import { Section } from "./Section";

type Column = {
  id: string;
  heading: string;
  intro?: string;
  listLead: string;
  items: readonly string[];
  closing: string;
};

const columns: Column[] = [
  { id: "who-title", ...whoShouldParticipate },
  { id: "eligibility-title", ...eligibility },
];

/** Who should participate and eligibility: two plain ruled lists side by side. */
export function Participation() {
  return (
    <Section id="eligibility" labelledBy="who-title" tone="paper-2">
      <div className="grid gap-y-4 border-t border-ink/80 pt-5 md:grid-cols-12 md:gap-x-8">
        <div aria-hidden="true" className="hidden md:col-span-3 md:block" />
        <div className="grid gap-y-16 md:col-span-9 lg:grid-cols-2 lg:gap-x-12">
          {columns.map((col) => (
            <article key={col.id} aria-labelledby={col.id}>
              <h2 id={col.id} className="text-[clamp(1.875rem,3.6vw,2.625rem)]">
                {col.heading}
              </h2>
              {col.intro ? <p className="mt-5 max-w-measure">{col.intro}</p> : null}
              <p className="mt-5 font-semibold">{col.listLead}</p>
              <ul className="mt-3 border-t border-line">
                {col.items.map((item) => (
                  <li key={item} className="border-b border-line py-3 leading-snug">
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-6 max-w-measure text-ink-muted">{col.closing}</p>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
