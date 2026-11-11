import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/marketing/Brand";

export const metadata: Metadata = { robots: { index: false } };

/** Calm, centred frame for sign-in, activation and password pages. Same header as the app on phones. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col text-ui-sm">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[72rem] items-center px-4 md:h-20 md:px-8">
          <Link href="/" className="rounded-sm">
            <Brand />
          </Link>
        </div>
      </header>
      <main id="main" className="flex-1 px-4 py-12 md:py-20">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
      <footer className="border-t border-line bg-paper-2">
        <p className="mx-auto max-w-[72rem] px-4 py-6 text-ui-xs text-ink-muted md:px-8">Delivered by Victory Entrepreneurship Centre in partnership with OAUSTECH</p>
      </footer>
    </div>
  );
}
