import { ApplyLink } from "@/components/ui/ApplyLink";
import { finalCta } from "@/content/landing";
import { navItems } from "@/content/navigation";
import { Brand } from "./Brand";
import { MobileMenu } from "./MobileMenu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className="container-site flex h-header items-center justify-between gap-4">
        <a href="#top" className="shrink-0 rounded-sm">
          <Brand />
        </a>

        <nav aria-label="Main" className="hidden xl:block">
          <ul className="flex items-center gap-7 text-[0.9375rem]">
            {navItems.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="border-b-2 border-transparent py-1 text-ink-muted transition-colors hover:border-accent hover:text-ink">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden xl:block">
          <ApplyLink size="sm">{finalCta.applyLabel}</ApplyLink>
        </div>

        <MobileMenu items={navItems} />
      </div>
    </header>
  );
}
