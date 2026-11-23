import { RegisterLink } from "@/components/ui/LoginLink";
import { textLinkClass } from "@/components/ui/TextLink";
import { finalCta, hero } from "@/content/landing";
import { site } from "@/lib/site";
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

        <div className="hidden items-center gap-5 xl:flex">
          <a href={site.platform.login} className={textLinkClass}>
            {finalCta.loginLabel}
          </a>
          <RegisterLink size="sm">{hero.registerLabel}</RegisterLink>
        </div>

        <MobileMenu items={navItems} />
      </div>
    </header>
  );
}
