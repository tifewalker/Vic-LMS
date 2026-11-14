"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { pastTrainings as photos } from "@/content/images";
import { pastTrainingsGallery as copy } from "@/content/landing";
import { Section, SectionBody, SectionHeader } from "./Section";

/**
 * "From our past trainings": a uniform grid of 4:3 photos (2 columns on mobile, 3 on tablet,
 * 4 from 1024px, at most 1100px wide). At most `copy.maxInGrid` photos show; any others are
 * reached through "View all photos", which opens the lightbox at photo 1.
 *
 * Cells are at most about 270px wide (330px on tablet), well under every source width, so no
 * photo is ever upscaled. The lightbox caps each photo at its own source width for the same reason.
 */
export function PastTrainings() {
  const [open, setOpen] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const shown = photos.slice(0, copy.maxInGrid);

  const show = (i: number, opener: HTMLButtonElement) => {
    openerRef.current = opener;
    setOpen(i);
  };
  const close = useCallback(() => dialogRef.current?.close(), []);
  const step = useCallback((by: number) => setOpen((i) => (i === null ? i : (i + by + photos.length) % photos.length)), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open !== null && dialog && !dialog.open) dialog.showModal();
  }, [open]);

  const current = open === null ? null : photos[open];

  return (
    <Section id="past-trainings" labelledBy="past-trainings-title">
      <SectionHeader kicker={copy.kicker} titleId="past-trainings-title" title={copy.heading} />
      <SectionBody className="mt-5">
        <p className="max-w-measure text-ink-muted">{copy.intro}</p>
      </SectionBody>

      <div className="mx-auto mt-10 max-w-[1100px] md:mt-14">
        <ul aria-labelledby="past-trainings-title" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 lg:gap-3">
          {shown.map((photo, i) => (
            <li key={photo.src}>
              <button
                type="button"
                onClick={(e) => show(i, e.currentTarget)}
                aria-haspopup="dialog"
                className="group block w-full cursor-zoom-in"
              >
                <span className="relative block aspect-[4/3] overflow-hidden border border-line bg-paper-2 outline-2 outline-transparent transition-[outline-color] duration-150 group-hover:outline-accent motion-reduce:transition-none">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(min-width: 1024px) 270px, (min-width: 640px) 33vw, 50vw"
                    loading="lazy"
                    className="object-cover"
                    style={{ objectPosition: "center" }}
                  />
                </span>
                <span className="sr-only"> (open larger)</span>
              </button>
            </li>
          ))}
        </ul>

        {photos.length > shown.length ? (
          <p className="mt-6">
            <button
              type="button"
              onClick={(e) => show(0, e.currentTarget)}
              aria-haspopup="dialog"
              className="cursor-pointer font-semibold text-accent-strong underline underline-offset-4 hover:text-ink"
            >
              {copy.viewAll}
            </button>
          </p>
        ) : null}
      </div>

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
        className={[
          "m-0 h-dvh max-h-none w-full max-w-none bg-ink/95 p-4 text-paper backdrop:bg-transparent sm:p-8",
          "opacity-0 transition-opacity duration-200 open:opacity-100 starting:open:opacity-0 motion-reduce:transition-none",
          "open:flex open:flex-col",
        ].join(" ")}
      >
        {current && open !== null ? (
          <>
            <div className="flex items-center justify-between gap-4 text-ui-sm">
              <p className="tabular-nums" aria-live="polite">
                {open + 1} / {photos.length}
              </p>
              <button type="button" onClick={close} autoFocus className="cursor-pointer rounded-sm border border-paper/40 px-3 py-1.5 font-semibold hover:border-paper">
                Close
              </button>
            </div>
            <div className="mt-4 flex min-h-0 flex-1 justify-center" onClick={(e) => e.target === e.currentTarget && close()}>
              {/* Never wider than the source photo. */}
              <div className="relative h-full w-full" style={{ maxWidth: current.width }}>
                <Image key={current.src} src={current.src} alt={current.alt} fill sizes={`${current.width}px`} className="object-contain" />
              </div>
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
    </Section>
  );
}
