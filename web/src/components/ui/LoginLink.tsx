import Link from "next/link";
import { cx } from "@/lib/cx";
import { site } from "@/lib/site";

type Props = {
  children: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
};

/** The main call to action on the public site: sign in to the training platform. Solid clay, no icons. */
export function LoginLink({ children, size = "md", className }: Props) {
  return (
    <Link
      href={site.platform.login}
      className={cx(
        "inline-flex items-center justify-center rounded-sm bg-accent font-semibold text-paper",
        "transition-colors duration-150 hover:bg-accent-strong",
        size === "sm" ? "px-4 py-2 text-[0.9375rem]" : "px-6 py-3.5 text-base",
        className,
      )}
    >
      {children}
    </Link>
  );
}
