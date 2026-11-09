import { cx } from "@/lib/cx";

type SectionProps = {
  id: string;
  labelledBy: string;
  tone?: "paper" | "paper-2";
  className?: string;
  children: React.ReactNode;
};

/** A landing page section: anchor target, background tone and vertical rhythm. */
export function Section({ id, labelledBy, tone = "paper", className, children }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cx("anchor-section py-section", tone === "paper-2" && "bg-paper-2", className)}
    >
      <div className="container-site">{children}</div>
    </section>
  );
}

type HeaderProps = {
  number: string;
  titleId: string;
  title: string;
  kicker?: string;
  className?: string;
};

/**
 * Section opening: a hairline rule, the section number and kicker in a narrow
 * left column, and the serif heading across the rest of the grid.
 */
export function SectionHeader({ number, titleId, title, kicker, className }: HeaderProps) {
  return (
    <header className={cx("grid gap-y-4 border-t border-ink/80 pt-5 md:grid-cols-12 md:gap-x-8", className)}>
      <p className="kicker flex gap-3 md:col-span-3 md:flex-col md:gap-1.5">
        <span className="font-serif text-[0.9375rem] font-normal tracking-normal text-accent-strong tabular-nums">{number}</span>
        {kicker ? <span>{kicker}</span> : null}
      </p>
      <h2 id={titleId} className="text-[clamp(2rem,4.6vw,3.5rem)] md:col-span-9">
        {title}
      </h2>
    </header>
  );
}

/** Body content aligned with the heading column (columns 4 to 12 from md up). */
export function SectionBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className="md:grid md:grid-cols-12 md:gap-x-8">
      <div className={cx("md:col-span-9 md:col-start-4", className)}>{children}</div>
    </div>
  );
}
