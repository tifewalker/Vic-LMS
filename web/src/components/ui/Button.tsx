"use client";

import { cx } from "@/lib/cx";

export type ButtonVariant = "primary" | "secondary" | "quiet";
export type ButtonSize = "md" | "sm";

/**
 * Button styles, shared by <Button> and links that look like buttons.
 * Square-ish corners, no icons. Primary is clay; quiet looks like a link.
 */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cx(
    "inline-flex cursor-pointer items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed aria-disabled:opacity-55",
    variant !== "quiet" && "rounded-sm",
    variant !== "quiet" && (size === "md" ? "h-11 px-4 text-ui-sm" : "h-9 px-3 text-ui-xs"),
    variant === "primary" && "bg-accent text-paper hover:bg-accent-strong",
    variant === "secondary" && "border border-line bg-paper text-ink hover:border-ink-muted hover:bg-paper-2",
    variant === "quiet" &&
      cx(
        size === "md" ? "text-ui-sm" : "text-ui-xs",
        "text-accent-strong underline decoration-accent/40 underline-offset-[0.22em] hover:decoration-accent-strong",
      ),
    className,
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Disables the button and shows `loadingText` (or the label) while work is in flight. */
  loading?: boolean;
  loadingText?: string;
};

export function Button({ variant = "primary", size = "md", loading = false, loadingText, disabled, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
    >
      {loading ? (loadingText ?? children) : children}
    </button>
  );
}

/** A link that looks like a button. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  external,
  children,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant; size?: ButtonSize; external?: boolean }) {
  return (
    <a
      {...rest}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={buttonClass(variant, size, className)}
    >
      {children}
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </a>
  );
}
