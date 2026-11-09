import { cx } from "@/lib/cx";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  /** Opens in a new tab and tells screen reader users so. */
  external?: boolean;
};

export const textLinkClass =
  "text-accent-strong underline decoration-1 underline-offset-[0.22em] decoration-accent/45 transition-colors hover:decoration-accent-strong";

export function TextLink({ external, className, children, ...rest }: Props) {
  return (
    <a
      {...rest}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cx(textLinkClass, className)}
    >
      {children}
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </a>
  );
}
