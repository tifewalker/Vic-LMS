import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/marketing/Brand";

export const metadata: Metadata = { robots: { index: false } };

/** Calm, centred frame for sign-in, activation and password pages. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="container-site flex min-h-header items-center py-3">
          <Link href="/" className="rounded-sm">
            <Brand />
          </Link>
        </div>
      </header>
      <main id="main" className="container-site flex-1 py-12 md:py-20">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
