import Image from "next/image";
import { PhotoFigure } from "@/components/ui/PhotoFigure";
import { TextLink } from "@/components/ui/TextLink";
import { images, imageSlots } from "@/content/images";
import { behind } from "@/content/landing";
import { site } from "@/lib/site";
import { Section, SectionBody, SectionHeader } from "./Section";

/** Who's behind the programme: OAUSTECH, then its partner Crystal Entrepreneurship Centre, side by side. */
export function Behind() {
  const { crystal, oaustech } = behind;
  const websiteLabel = site.institution.website.replace(/^https?:\/\//, "");

  return (
    <Section id="about-us" labelledBy="about-us-title" tone="paper-2">
      <SectionHeader kicker={behind.kicker} titleId="about-us-title" title={behind.heading} />
      <SectionBody className="mt-5">
        <p className="max-w-measure text-ink-muted">{behind.intro}</p>
      </SectionBody>

      <div className="mt-10 grid gap-y-16 md:mt-14 lg:grid-cols-12 lg:gap-x-8">
        <article aria-labelledby="oaustech-title" className="lg:col-span-6">
          <h3 id="oaustech-title" className="border-t border-line pt-5 text-[1.75rem] md:text-[2rem]">
            {oaustech.heading}
          </h3>
          <figure className="mt-6">
            <blockquote>
              <p className="font-serif text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.04] tracking-[-0.015em] italic">
                <span aria-hidden="true">“</span>
                {oaustech.motto}
                <span aria-hidden="true">”</span>
              </p>
            </blockquote>
            <figcaption className="sr-only">{oaustech.mottoLabel}</figcaption>
          </figure>
          <div className="mt-6 max-w-measure space-y-5">
            {oaustech.body.map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
            <p className="text-[1rem]">
              <span className="text-ink-muted">{oaustech.websiteLabel}: </span>
              <TextLink href={site.institution.website} external>
                {websiteLabel}
              </TextLink>
            </p>
          </div>
          <PhotoFigure
            image={imageSlots.oaustech}
            aspect="aspect-[3/2] md:aspect-[16/7]"
            sizes="(min-width: 1312px) 600px, (min-width: 1024px) 48vw, 100vw"
            className="mt-8"
          />
        </article>
        <article aria-labelledby="crystal-title" className="lg:col-span-5 lg:col-start-8">
          <h3 id="crystal-title" className="border-t border-line pt-5 text-[1.75rem] md:text-[2rem]">
            {crystal.heading}
          </h3>
          <Image
            src={images.crystalLogo.src}
            alt={images.crystalLogo.alt}
            width={images.crystalLogo.width}
            height={images.crystalLogo.height}
            sizes="320px"
            className="mt-6 h-auto w-full max-w-[320px]"
          />
          <p className="mt-6 max-w-measure font-serif text-[1.3125rem] leading-snug md:text-[1.5rem]">{crystal.body}</p>
        </article>

      </div>

    </Section>
  );
}
