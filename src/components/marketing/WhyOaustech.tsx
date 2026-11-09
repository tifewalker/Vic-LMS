import { PhotoFigure } from "@/components/ui/PhotoFigure";
import { TextLink } from "@/components/ui/TextLink";
import { imageSlots } from "@/content/images";
import { whyOaustech } from "@/content/landing";
import { site } from "@/lib/site";
import { Section, SectionBody, SectionHeader } from "./Section";

export function WhyOaustech() {
  const photo = imageSlots.whyOaustech;
  const websiteLabel = site.institution.website.replace(/^https?:\/\//, "");

  return (
    <Section id="why-oaustech" labelledBy="why-oaustech-title" tone="paper-2">
      <SectionHeader
        kicker={whyOaustech.kicker}
        titleId="why-oaustech-title"
        title={whyOaustech.heading}
      />

      {/* The motto, set large. */}
      <figure className="mt-12 border-y border-line py-10 md:mt-16 md:py-14">
        <blockquote>
          <p className="font-serif text-[clamp(2.375rem,7.4vw,6rem)] leading-[1.02] tracking-[-0.02em] italic">
            <span aria-hidden="true">“</span>
            {whyOaustech.motto}
            <span aria-hidden="true">”</span>
          </p>
        </blockquote>
      </figure>

      <SectionBody className="mt-10 md:mt-14">
        <div className="grid gap-y-10 lg:grid-cols-9 lg:gap-x-8">
          <div className="max-w-measure space-y-5 lg:col-span-6">
            {whyOaustech.body.map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
            <p>{whyOaustech.mottoSentence}</p>
            <p>{whyOaustech.closing}</p>
          </div>

          <dl className="self-start border-t border-line text-[1rem] lg:col-span-3">
            <div className="border-b border-line py-4">
              <dt className="kicker">Location</dt>
              <dd className="mt-1.5 leading-snug">{whyOaustech.location}</dd>
            </div>
            <div className="border-b border-line py-4">
              <dt className="kicker">{whyOaustech.websiteLabel}</dt>
              <dd className="mt-1.5">
                <TextLink href={site.institution.website} external>
                  {websiteLabel}
                </TextLink>
              </dd>
            </div>
          </dl>
        </div>

        {/* Photo slot: set imageSlots.whyOaustech in src/content/images.ts, or null for none. */}
        <PhotoFigure
          image={photo}
          aspect="aspect-[3/2] md:aspect-[16/7]"
          sizes="(min-width: 1312px) 900px, (min-width: 768px) 75vw, 100vw"
          className="mt-14"
        />
      </SectionBody>
    </Section>
  );
}
