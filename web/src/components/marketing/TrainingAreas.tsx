"use client";

import Image from "next/image";
import { useState } from "react";
import { Disclosure } from "@/components/ui/Disclosure";
import { programmePhotos, type SiteImage } from "@/content/images";
import { trainingAreas } from "@/content/landing";
import { cx } from "@/lib/cx";
import { Section, SectionHeader } from "./Section";

const pad = (n: number) => String(n).padStart(2, "0");

function Photo({ image, sizes, className }: { image: SiteImage; sizes: string; className?: string }) {
  return (
    <div className={cx("relative overflow-hidden border border-line bg-paper-2", className)}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        loading="lazy"
        className="object-cover"
        style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined}
      />
    </div>
  );
}

/**
 * The eight areas as a table of contents. Each row opens to show its photo, topics and one short line on what you will gain.
 * On wide screens a fixed panel on the right previews the photo of the row being hovered or focused.
 */
export function TrainingAreas() {
  const [preview, setPreview] = useState(0);
  const areas = trainingAreas.areas;

  return (
    <Section id="training-areas" labelledBy="training-areas-title">
      <SectionHeader titleId="training-areas-title" title={trainingAreas.kicker} />

      <div className="mt-10 md:mt-14 lg:grid lg:grid-cols-12 lg:gap-x-8">
        <ol className="border-t border-line lg:col-span-8">
          {areas.map((area, i) => {
            const photo = programmePhotos[i];
            return (
              <li
                key={area.number}
                className="border-b border-line"
                onMouseEnter={() => setPreview(i)}
                onFocus={() => setPreview(i)}
              >
                <Disclosure
                  id={`area-${area.number}`}
                  buttonClassName={cx("py-6 md:py-7 hover:[&_.area-title]:text-accent-strong", preview === i && "lg:[&_.area-title]:text-accent-strong")}
                  panelClassName="pb-10"
                  onOpenChange={(open) => open && setPreview(i)}
                  header={
                    <span className="grid grid-cols-[2.25rem_1fr] gap-x-3 md:grid-cols-[5rem_1fr] md:gap-x-6">
                      <span className="pt-[0.3em] font-serif text-[1.0625rem] text-accent-strong tabular-nums md:text-lg">{pad(area.number)}</span>
                      <span>
                        <span className="area-title block font-serif text-[1.375rem] leading-tight text-ink transition-colors md:text-[1.875rem]">
                          {area.title}
                        </span>
                        <span className="mt-1.5 block text-[1rem] leading-snug text-ink-muted">{area.tagline}</span>
                      </span>
                    </span>
                  }
                >
                  <div className="grid grid-cols-[2.25rem_1fr] gap-x-3 md:grid-cols-[5rem_1fr] md:gap-x-6 md:pr-[2.125rem]">
                    <div className="col-start-2 grid gap-y-8 md:grid-cols-5 md:gap-x-8">
                      {photo ? (
                        // The photo sits beside the topics. On wide screens the side panel shows it instead.
                        <Photo image={photo} sizes="(min-width: 768px) 30vw, 90vw" className="aspect-[4/5] md:col-span-2 lg:hidden" />
                      ) : null}
                      <div className="md:col-span-3 lg:col-span-5 lg:grid lg:grid-cols-9 lg:gap-x-8">
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
                        <div className="mt-8 self-start border-l-2 border-accent pl-5 lg:col-span-4 lg:mt-0">
                          <p className="kicker text-accent-strong">{trainingAreas.gainLabel}</p>
                          <p className="mt-2 font-serif text-[1.25rem] leading-snug md:text-[1.375rem]">{area.gain}</p>
                          {area.note ? <p className="mt-5 text-[0.9375rem] text-ink-muted italic">{area.note}</p> : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </Disclosure>
              </li>
            );
          })}
        </ol>

        {/* Desktop preview panel. Decorative duplicate of the row photos, so hidden from assistive tech. */}
        <div aria-hidden="true" className="hidden lg:col-span-4 lg:block">
          <div className="sticky top-28">
            <div className="relative aspect-[4/5] overflow-hidden border border-line bg-paper-2">
              {programmePhotos.map((photo, i) => (
                <Image
                  key={photo.src}
                  src={photo.src}
                  alt=""
                  fill
                  sizes="30vw"
                  loading="lazy"
                  className={cx(
                    "object-cover transition-opacity duration-200 motion-reduce:transition-none",
                    preview === i ? "opacity-100" : "opacity-0",
                  )}
                  style={photo.objectPosition ? { objectPosition: photo.objectPosition } : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
