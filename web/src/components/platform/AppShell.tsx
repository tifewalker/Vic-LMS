"use client";

import Link from "next/link";
import { Brand } from "@/components/marketing/Brand";
import { signOut } from "@/lib/api";
import { useMe } from "./RequireRole";

type NavItem = { href: string; label: string };

/** Header and frame for signed-in pages. */
export function AppShell({ nav = [], children }: { nav?: NavItem[]; children: React.ReactNode }) {
  const me = useMe();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-paper">
        <div className="container-site flex min-h-header flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3">
          <Link href="/" className="shrink-0 rounded-sm">
            <Brand />
          </Link>
          <div className="flex items-center gap-4 text-[0.9375rem]">
            <span className="hidden text-ink-muted sm:inline">{me.full_name}</span>
            <button type="button" onClick={() => signOut()} className="cursor-pointer font-semibold text-accent-strong hover:underline">
              Sign out
            </button>
          </div>
        </div>
        {nav.length ? (
          <nav aria-label="Section" className="container-site">
            <ul className="-mb-px flex flex-wrap gap-x-6 text-[0.9375rem]">
              {nav.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="block border-b-2 border-transparent py-2.5 text-ink-muted hover:border-line hover:text-ink">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>
      <main id="main" className="container-site py-10 md:py-14">
        {children}
      </main>
    </div>
  );
}
