import { cx } from "@/lib/cx";

export type Stat = { label: string; value: number | string | null; href?: string };

/**
 * Dashboard numbers: big serif figures with small labels, separated by vertical hairlines.
 * Two columns on phones, one row on wide screens. No boxes, no shadows.
 */
export function Stats({ items, label }: { items: Stat[]; label: string }) {
  return (
    <dl aria-label={label} className="grid grid-cols-2 border-t border-line lg:flex lg:border-b">
      {items.map((s, i) => (
        <div
          key={s.label}
          className={cx(
            "flex min-w-0 flex-col-reverse gap-1 border-line px-4 py-4 lg:flex-1 lg:px-6",
            i > 0 && "lg:border-l",
            "max-lg:border-b max-lg:odd:border-r",
          )}
        >
          <dt className="text-ui-xs text-ink-muted">
            {s.href ? (
              <a href={s.href} className="hover:text-ink hover:underline">
                {s.label}
              </a>
            ) : (
              s.label
            )}
          </dt>
          <dd className="font-serif text-ui-xl text-ink tabular-nums">{s.value ?? <span className="inline-block h-8 w-10 rounded-sm bg-paper-2 align-middle" />}</dd>
        </div>
      ))}
    </dl>
  );
}
