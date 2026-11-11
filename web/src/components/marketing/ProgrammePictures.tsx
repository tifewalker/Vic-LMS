import Image from "next/image";
import { galleryPhotos, type SiteImage } from "@/content/images";
import { cx } from "@/lib/cx";
import { Section, SectionHeader } from "./Section";

/**
 * "Programme in pictures": an asymmetric grid of photos with small captions.
 * Square corners, hairline frames, no overlays or filters. Fixed aspect ratios, lazy loaded.
 */
const tiles: { image: SiteImage; cell: string; aspect: string; sizes: string }[] = [
  { image: galleryPhotos.ai, cell: "col-span-2 lg:col-span-7 lg:self-end", aspect: "aspect-[3/2]", sizes: "(min-width: 1024px) 58vw, 100vw" },
  { image: galleryPhotos.drone, cell: "col-span-1 lg:col-span-5", aspect: "aspect-[4/5]", sizes: "(min-width: 1024px) 40vw, 50vw" },
  { image: galleryPhotos.classroom, cell: "col-span-1 lg:col-span-4", aspect: "aspect-[4/5]", sizes: "(min-width: 1024px) 33vw, 50vw" },
  { image: galleryPhotos.data, cell: "col-span-1 lg:col-span-3", aspect: "aspect-[4/5] lg:aspect-[3/4]", sizes: "(min-width: 1024px) 25vw, 50vw" },
  { image: galleryPhotos.workshop, cell: "col-span-1 lg:col-span-5", aspect: "aspect-[4/5] lg:aspect-[5/4]", sizes: "(min-width: 1024px) 42vw, 50vw" },
  { image: galleryPhotos.campus, cell: "col-span-2 lg:col-span-12", aspect: "aspect-[16/7] lg:aspect-[1920/550]", sizes: "100vw" },
];

export function ProgrammePictures() {
  return (
    <Section id="pictures" labelledBy="pictures-title">
      <SectionHeader titleId="pictures-title" title="Programme in pictures" />
      <ul className="mt-10 grid grid-cols-2 items-start gap-x-4 gap-y-8 md:mt-14 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-12">
        {tiles.map(({ image, cell, aspect, sizes }) => (
          <li key={image.src} className={cell}>
            <figure>
              <div className={cx("relative overflow-hidden border border-line bg-paper-2", aspect)}>
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
              <figcaption className="mt-2.5 text-[0.875rem] leading-snug text-ink-muted">{image.caption}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </Section>
  );
}
