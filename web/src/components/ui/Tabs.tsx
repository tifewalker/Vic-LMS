"use client";

import { useRef } from "react";
import { cx } from "@/lib/cx";

export type TabItem<T extends string> = { id: T; label: string; count?: number };

/**
 * Text tabs with a 2px clay underline on the active one. Optional counts.
 * Scrolls sideways on phones instead of wrapping. Arrow keys move between tabs.
 */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idPrefix = "tab",
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  idPrefix?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const last = tabs.length - 1;
    const next = e.key === "ArrowRight" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:thin]">
      <div role="tablist" aria-label={label} className="flex min-w-max gap-6 border-b border-line">
        {tabs.map((t, i) => {
          const selected = value === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={`${idPrefix}-${t.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cx(
                "-mb-px flex h-11 cursor-pointer items-center gap-2 border-b-2 text-ui-sm whitespace-nowrap",
                selected ? "border-accent font-semibold text-ink" : "border-transparent text-ink-muted hover:border-line hover:text-ink",
              )}
            >
              {t.label}
              {t.count !== undefined ? <span className={cx("text-ui-xs tabular-nums", selected ? "text-ink" : "text-ink-muted")}>{t.count}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
