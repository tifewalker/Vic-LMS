import { Disclosure } from "@/components/ui/Disclosure";
import { RichText } from "@/components/ui/RichText";
import { faq } from "@/content/landing";
import { Section, SectionBody, SectionHeader } from "./Section";

export function Faq() {
  return (
    <Section id="faq" labelledBy="faq-title">
      <SectionHeader titleId="faq-title" title={faq.heading} />
      <SectionBody className="mt-8 md:mt-10">
        <ol className="border-t border-line">
          {faq.items.map((item, i) => (
            <li key={item.question} className="border-b border-line">
              <Disclosure
                id={`faq-${i + 1}`}
                buttonClassName="py-5 md:py-6 hover:[&_.faq-q]:text-accent-strong"
                panelClassName="pb-7"
                header={
                  <span className="grid grid-cols-[1.75rem_1fr] gap-x-2">
                    <span className="pt-[0.2em] text-[0.9375rem] text-ink-muted tabular-nums">{i + 1}.</span>
                    <span className="faq-q font-serif text-[1.25rem] leading-snug text-ink transition-colors md:text-[1.4375rem]">
                      {item.question}
                    </span>
                  </span>
                }
              >
                <p className="max-w-measure pl-[2.25rem]">
                  <RichText value={item.answer} />
                </p>
              </Disclosure>
            </li>
          ))}
        </ol>
      </SectionBody>
    </Section>
  );
}
