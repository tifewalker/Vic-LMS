"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SiteImage } from "@/content/images";
import { cx } from "@/lib/cx";

/**
 * Grid cells for the wide-screen layout, in display order. Every photo is 4:3, so nothing
 * is cropped; the asymmetry comes from the column spans and the staggered second row.
 * Below md the list is a horizontal strip that snaps one photo at a time.
 */
const cells = [
  "md:col-span-7",
  "md:col-span-5 md:self-end",
  "md:col-span-5",
  "md:col-span-4 md:mt-16",
  "md:col-span-3 md:mt-32",
];
const sizes = ["(min-width: 768px) 58vw, 82vw", "(min-width: 768px) 42vw, 82vw", "(min-width: 768px) 42vw, 82vw", "(min-width: 768px) 33vw, 82vw", "(min-width: 768px) 25vw, 82vw"];

/** Photos from past trainings. Each opens in a simple lightbox: a native modal dialog, Escape closes it. */
export function PastTrainings({ photos, labelledBy }: { photos: SiteImage[]; labelledBy: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const show = (i: number, opener: HTMLButtonElement) => {
    openerRef.current = opener;
    setOpen(i);
  };
  const close = useCallback(() => dialogRef.current?.close(), []);
  const step = useCallback((by: number) => setOpen((i) => (i === null ? i : (i + by + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open !== null && dialog && !dialog.open) dialog.showModal();
  }, [open]);

  return (
    <>
      <ul
        aria-labelledby={labelledBy}
        className={cx(
          "relative -mx-gutter mt-8 flex snap-x snap-mandatory scroll-px-gutter gap-4 overflow-x-auto px-gutter pb-4",
          "md:mx-0 md:mt-10 md:grid md:grid-cols-12 md:items-start md:gap-x-8 md:gap-y-10 md:overflow-visible md:px-0 md:pb-0",
        )}
      >
        {photos.map((photo, i) => (
          <li key={photo.src} className={cx("w-[82%] shrink-0 snap-start sm:w-[60%] md:w-auto", cells[i % cells.length])}>
            <button
              type="button"
              onClick={(e) => show(i, e.currentTarget)}
              className="group block w-full cursor-zoom-in text-left"
              aria-haspopup="dialog"
            >
              <span className="relative block aspect-[4/3] overflow-hidden border border-line bg-paper">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes={sizes[i % sizes.length]}
                  loading="lazy"
                  className="object-cover"
                  style={photo.objectPosition ? { objectPosition: photo.objectPosition } : undefined}
                />
              </span>
              <span className="sr-only"> (open larger)</span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label="Photo from a past training"
        onClose={() => {
          setOpen(null);
          openerRef.current?.focus();
        }}
        onClick={(e) => {
          // A click on the backdrop (the dialog element itself, outside the frame) closes it.
          if (e.target === e.currentTarget) close();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        className={cx(
          "m-0 h-dvh max-h-none w-full max-w-none bg-ink/95 p-4 text-paper backdrop:bg-transparent sm:p-8",
          "opacity-0 transition-opacity duration-200 open:opacity-100 starting:open:opacity-0 motion-reduce:transition-none",
          "open:flex open:flex-col",
        )}
      >
        {open !== null ? (
          <>
            <div className="flex items-center justify-between gap-4 text-ui-sm">
              <p className="tabular-nums" aria-live="polite">
                {open + 1} / {photos.length}
              </p>
              <button type="button" onClick={close} autoFocus className="cursor-pointer rounded-sm border border-paper/40 px-3 py-1.5 font-semibold hover:border-paper">
                Close
              </button>
            </div>
            <div className="relative mt-4 min-h-0 flex-1" onClick={(e) => e.target === e.currentTarget && close()}>
              <Image
                key={photos[open].src}
                src={photos[open].src}
                alt={photos[open].alt}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>
            <div className="mt-4 flex justify-center gap-3 text-ui-sm">
              <button type="button" onClick={() => step(-1)} className="cursor-pointer rounded-sm border border-paper/40 px-4 py-2 font-semibold hover:border-paper">
                Previous
              </button>
              <button type="button" onClick={() => step(1)} className="cursor-pointer rounded-sm border border-paper/40 px-4 py-2 font-semibold hover:border-paper">
                Next
              </button>
            </div>
          </>
        ) : null}
      </dialog>
    </>
  );
}
