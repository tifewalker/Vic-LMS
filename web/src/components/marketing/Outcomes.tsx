import { outcomes } from "@/content/landing";
import { Section, SectionBody, SectionHeader } from "./Section";

/** What you can expect to gain: one ruled list, two columns on wide screens. */
export function Outcomes() {
  return (
    <Section id="outcomes" labelledBy="outcomes-title">
      <SectionHeader titleId="outcomes-title" title={outcomes.heading} />
      <SectionBody className="mt-8 md:mt-10">
        <p className="max-w-measure">{outcomes.listLead}</p>
        <ul className="mt-6 grid border-t border-line sm:grid-cols-2 sm:gap-x-10">
          {outcomes.items.map((item) => (
            <li key={item} className="border-b border-line py-3.5 leading-snug">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-10 max-w-[44ch] font-serif text-[1.375rem] leading-snug md:text-[1.625rem]">
          {outcomes.closing}
        </p>
      </SectionBody>
    </Section>
  );
}
