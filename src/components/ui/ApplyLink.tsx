import { cx } from "@/lib/cx";
import { site } from "@/lib/site";

type Props = {
  children: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
};

/**
 * The application call to action. Always opens the form from src/lib/site.ts in a new tab.
 * Square-ish, solid clay, no icons.
 */
export function ApplyLink({ children, size = "md", className }: Props) {
  return (
    <a
      href={site.applicationFormUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(
        "inline-flex items-center justify-center rounded-sm bg-accent font-semibold text-paper",
        "transition-colors duration-150 hover:bg-accent-strong",
        size === "sm" ? "px-4 py-2 text-[0.9375rem]" : "px-6 py-3.5 text-base",
        className,
      )}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
