import Image from "next/image";
import type { SiteImage } from "@/content/images";
import { cx } from "@/lib/cx";

type Props = {
  image: SiteImage | null;
  /** Aspect ratio classes for the frame, e.g. "aspect-[4/3] md:aspect-[16/9]". */
  aspect: string;
  sizes: string;
  /**
   * When there is no image: show a plain captioned placeholder with this text.
   * Leave undefined to render nothing, so the section reads fine without a photo.
   */
  placeholderCaption?: string;
  preload?: boolean;
  className?: string;
};

/** A photo slot that works with or without a photo. Real photos only. */
export function PhotoFigure({ image, aspect, sizes, placeholderCaption, preload, className }: Props) {
  if (!image) {
    if (!placeholderCaption) return null;
    return (
      <figure className={className}>
        <div aria-hidden="true" className={cx("rounded-sm border border-line bg-paper-2", aspect)} />
        <figcaption className="mt-3 text-sm text-ink-muted">{placeholderCaption}</figcaption>
      </figure>
    );
  }

  return (
    <figure className={className}>
      <div className={cx("relative overflow-hidden rounded-sm bg-paper-2", aspect)}>
        <Image src={image.src} alt={image.alt} fill sizes={sizes} preload={preload} className="object-cover" />
      </div>
      {image.caption ? <figcaption className="mt-3 text-sm text-ink-muted">{image.caption}</figcaption> : null}
    </figure>
  );
}
