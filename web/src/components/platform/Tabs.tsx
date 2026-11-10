"use client";

import { cx } from "@/lib/cx";

/** A plain underlined tab row. The page renders the matching panel. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-x-6 gap-y-1 border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            "-mb-px cursor-pointer border-b-2 pb-2.5 text-[0.9375rem]",
            value === t.id ? "border-accent font-semibold text-ink" : "border-transparent text-ink-muted hover:text-ink",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Calm status tag for a class. "Live now" is shown in sage, never animated. */
export function ClassStatus({ status }: { status: string }) {
  if (status === "live") {
    return <span className="inline-block rounded-sm bg-sage-soft px-2 py-0.5 text-sm font-semibold text-sage-strong">Live now</span>;
  }
  return <span className="text-sm text-ink-muted">{status === "ended" ? "Ended" : "Scheduled"}</span>;
}
