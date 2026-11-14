"use client";

import { cx } from "@/lib/cx";
import { SkeletonRows } from "./Skeleton";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Numbers: right-aligned, tabular figures. */
  numeric?: boolean;
  /** The row's main cell: shown as the card title on phones, without a label. */
  primary?: boolean;
  /** Visually hidden header, e.g. for an actions column. */
  hiddenHeader?: boolean;
  className?: string;
};

/**
 * Table with hairline rows, a small uppercase header that sticks while scrolling, and
 * comfortable rows. On phones each row becomes a stacked card with labelled fields.
 * Clickable rows get a pointer and a hover tint; the primary cell should hold a real link
 * so keyboard users can reach it.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  onRowClick,
  loading = false,
  empty,
}: {
  caption: string;
  columns: Column<T>[];
  rows: T[] | null;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: React.ReactNode;
}) {
  if (loading || rows === null) return <SkeletonRows rows={4} />;
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <table className="w-full border-collapse text-left text-ui-sm max-md:block">
      <caption className="sr-only">{caption}</caption>
      <thead className="max-md:sr-only">
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              scope="col"
              className={cx(
                "ui-label sticky top-0 z-10 border-b border-line bg-paper py-3 pr-4 last:pr-0",
                c.numeric && "text-right",
                c.className,
              )}
            >
              {c.hiddenHeader ? <span className="sr-only">{c.header}</span> : c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="max-md:block max-md:space-y-3">
        {rows.map((row) => (
          <tr
            key={rowKey(row)}
            onClick={
              onRowClick
                ? (e) => {
                    // Let real links, buttons and inputs inside the row do their own thing.
                    if ((e.target as HTMLElement).closest("a,button,input,select,textarea,label")) return;
                    onRowClick(row);
                  }
                : undefined
            }
            className={cx(
              "border-b border-line align-top transition-colors",
              "max-md:block max-md:rounded-sm max-md:border max-md:bg-paper max-md:p-4",
              onRowClick && "cursor-pointer hover:bg-paper-2/70",
            )}
          >
            {columns.map((c) => (
              <td
                key={c.key}
                data-label={c.primary || c.hiddenHeader ? "" : c.header}
                className={cx(
                  "py-4 pr-4 last:pr-0",
                  c.numeric && "text-right tabular-nums",
                  "max-md:flex max-md:items-start max-md:justify-between max-md:gap-4 max-md:py-1 max-md:pr-0 max-md:text-right",
                  "max-md:before:ui-label max-md:before:shrink-0 max-md:before:text-left max-md:before:content-[attr(data-label)]",
                  c.primary && "max-md:block max-md:pb-2 max-md:text-left max-md:before:hidden",
                  c.hiddenHeader && "max-md:justify-end max-md:pt-2 max-md:before:hidden",
                  c.className,
                )}
              >
                {c.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
