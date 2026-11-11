import { cx } from "@/lib/cx";

/** Inline notice inside a form or panel. Saved and sent messages use toasts instead. */
export function Notice({ tone = "info", children, className }: { tone?: "info" | "error" | "success"; children: React.ReactNode; className?: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "max-w-measure rounded-sm border-l-2 px-4 py-3 text-ui-sm",
        tone === "error" && "border-accent-strong bg-accent-soft/60 text-ink",
        tone === "success" && "border-sage bg-sage-soft text-ink",
        tone === "info" && "border-line bg-paper-2 text-ink",
        className,
      )}
    >
      {children}
    </div>
  );
}
