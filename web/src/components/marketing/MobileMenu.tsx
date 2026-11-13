"use client";

import { useEffect, useRef, useState } from "react";
import { LoginLink } from "@/components/ui/LoginLink";
import { textLinkClass } from "@/components/ui/TextLink";
import { finalCta, hero } from "@/content/landing";
import type { NavItem } from "@/content/navigation";
import { site } from "@/lib/site";

/** Menu disclosure for narrow screens. Closes on Escape, on link click and when widening past xl. */
export function MobileMenu({ items }: { items: readonly NavItem[] }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const wide = window.matchMedia("(min-width: 80rem)");
    const onWide = () => wide.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  return (
    <div className="xl:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer rounded-sm border border-line px-3 py-2 text-[0.9375rem] font-semibold text-ink hover:border-ink-muted"
      >
        {open ? "Close" : "Menu"}
      </button>

      <div
        id="mobile-nav"
        hidden={!open}
        className="absolute inset-x-0 top-full max-h-[calc(100dvh-var(--header-h))] overflow-y-auto border-b border-line bg-paper"
      >
        <nav aria-label="Main" className="container-site pt-2 pb-8">
          <ul>
            {items.map((item) => (
              <li key={item.href} className="border-b border-line">
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-3.5 font-serif text-[1.375rem] leading-tight text-ink hover:text-accent-strong"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
            <LoginLink>{finalCta.loginLabel}</LoginLink>
            <a href={site.phone.href} className={textLinkClass}>
              {hero.enquireLabel}: {site.phone.display}
            </a>
          </div>
        </nav>
      </div>
    </div>
  );
}
