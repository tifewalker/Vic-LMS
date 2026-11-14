import { cx } from "@/lib/cx";

/** Static skeleton lines in paper-2 while data loads. They reserve space so nothing jumps. */
export function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cx("space-y-3", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} aria-hidden="true" className={cx("h-4 rounded-sm bg-paper-2", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Skeleton for lists and tables: rows the same height as real ones. */
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="border-t border-line">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} aria-hidden="true" className="flex h-16 items-center gap-6 border-b border-line">
          <div className="h-4 w-1/3 rounded-sm bg-paper-2" />
          <div className="h-4 w-1/4 rounded-sm bg-paper-2" />
          <div className="ml-auto h-4 w-16 rounded-sm bg-paper-2" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for a whole page: a header block and some rows. */
export function SkeletonPage() {
  return (
    <div role="status" aria-label="Loading">
      <div aria-hidden="true" className="border-b border-line pb-6">
        <div className="h-3 w-24 rounded-sm bg-paper-2" />
        <div className="mt-3 h-8 w-2/3 max-w-md rounded-sm bg-paper-2" />
      </div>
      <div aria-hidden="true" className="mt-8">
        <SkeletonRows rows={4} />
      </div>
    </div>
  );
}
