import { PhotoFigure } from "@/components/ui/PhotoFigure";
import { imageSlots } from "@/content/images";
import { about } from "@/content/landing";
import { Section, SectionHeader } from "./Section";

const pad = (n: number) => String(n).padStart(2, "0");

/** The intro paragraphs, then one list of what participants gain and who it is for. */
export function About() {
  const [lead, ...rest] = about.body;

  return (
    <Section id="about" labelledBy="about-title">
      <SectionHeader kicker={about.kicker} titleId="about-title" title={about.heading} />

      <div className="mt-10 grid gap-y-14 md:mt-14 lg:grid-cols-12 lg:gap-x-8">
        <div className="lg:col-span-7 xl:col-span-6">
          <p className="max-w-measure font-serif text-[1.3125rem] leading-snug md:text-[1.5rem]">{lead}</p>
          <div className="mt-6 max-w-measure space-y-5">
            {rest.map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
          </div>
          {/* Photo slot: set imageSlots.about in src/content/images.ts, or null for none. */}
          <PhotoFigure
            image={imageSlots.about}
            aspect="aspect-[3/2] sm:aspect-[16/9]"
            sizes="(min-width: 1312px) 620px, (min-width: 1024px) 55vw, 100vw"
            className="mt-12"
          />
        </div>

        <div className="lg:col-span-5 lg:col-start-8 xl:col-start-8">
          <h3 className="text-[1.625rem]">{about.benefitsHeading}</h3>
          <ol className="mt-5 border-t border-line">
            {about.benefits.map((item, i) => (
              <li key={item.term} className="grid grid-cols-[2.25rem_1fr] gap-x-3 border-b border-line py-5">
                <span aria-hidden="true" className="font-serif text-accent-strong tabular-nums">
                  {pad(i + 1)}
                </span>
                <div>
                  <p className="font-semibold leading-snug">{item.term}</p>
                  <p className="mt-1.5 text-[1rem] leading-relaxed text-ink-muted">{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 font-serif text-[1.25rem] leading-snug">{about.audience}</p>
        </div>
      </div>
    </Section>
  );
}
