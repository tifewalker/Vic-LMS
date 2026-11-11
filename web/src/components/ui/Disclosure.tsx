"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";

type Props = {
  /** Unique id used for the button and panel ids. */
  id: string;
  /** Content shown inside the toggle button. */
  header: React.ReactNode;
  children: React.ReactNode;
  headingLevel?: 2 | 3 | 4;
  buttonClassName?: string;
  panelClassName?: string;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * One accordion row: a heading containing a button with aria-expanded,
 * controlling a labelled region. Rows open independently.
 */
export function Disclosure({
  id,
  header,
  children,
  headingLevel = 3,
  buttonClassName,
  panelClassName,
  defaultOpen = false,
  onOpenChange,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const Heading = `h${headingLevel}` as const;
  const buttonId = `${id}-button`;
  const panelId = `${id}-panel`;

  return (
    <>
      <Heading className="font-sans text-base leading-normal tracking-normal">
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setOpen(!open);
            onOpenChange?.(!open);
          }}
          className={cx(
            "group flex w-full cursor-pointer items-start justify-between gap-5 text-left",
            buttonClassName,
          )}
        >
          <span className="min-w-0 flex-1">{header}</span>
          <PlusMinus open={open} />
        </button>
      </Heading>
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open} className={panelClassName}>
        {children}
      </div>
    </>
  );
}

/** A drawn plus that turns into a minus. Two hairlines, no icon in a circle. */
function PlusMinus({ open }: { open: boolean }) {
  return (
    <span aria-hidden="true" className="relative mt-[0.55em] block size-3.5 shrink-0 text-ink-muted group-hover:text-accent-strong">
      <span className="absolute top-1/2 left-0 h-[1.5px] w-full -translate-y-1/2 bg-current" />
      <span
        className={cx(
          "absolute top-0 left-1/2 h-full w-[1.5px] -translate-x-1/2 bg-current transition-transform duration-200",
          open && "scale-y-0",
        )}
      />
    </span>
  );
}
