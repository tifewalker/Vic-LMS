import { LoginLink } from "@/components/ui/LoginLink";
import { finalCta } from "@/content/landing";
import { site } from "@/lib/site";

/** Closing call to action on ink, the one dark block on the page. */
export function FinalCta() {
  return (
    <section id="login" aria-labelledby="login-title" className="anchor on-ink py-section">
      <div className="container-site grid gap-y-14 lg:grid-cols-12 lg:gap-x-8">
        <div className="lg:col-span-7">
          <h2 id="login-title" className="text-[clamp(2.25rem,5.2vw,4rem)] leading-[1.05] tracking-[-0.015em]">
            {finalCta.heading}
          </h2>
          <p className="mt-6 max-w-measure font-serif text-[1.375rem] leading-snug md:text-[1.625rem]">{finalCta.body}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <LoginLink>{finalCta.loginLabel}</LoginLink>
            <p className="text-[0.9375rem] text-ink-muted">
              {finalCta.activatePrompt}{" "}
              <a
                href={site.platform.activate}
                className="text-accent-soft underline decoration-1 underline-offset-[0.22em] decoration-accent-soft/50 hover:decoration-accent-soft"
              >
                {finalCta.activateLabel}
              </a>
            </p>
          </div>
        </div>

        <div className="lg:col-span-4 lg:col-start-9 lg:pt-12">
          <dl className="border-t border-paper/25 text-[1rem]">
            {finalCta.facts.map((fact) => (
              <div key={fact.term} className="border-b border-paper/25 py-4">
                <dt className="kicker">{fact.term}</dt>
                <dd className="mt-1.5 leading-snug">{fact.description}</dd>
              </div>
            ))}
            <div className="border-b border-paper/25 py-4">
              <dt className="kicker">{finalCta.enquiriesLabel}</dt>
              <dd className="mt-1.5">
                <a
                  href={site.phone.href}
                  className="text-accent-soft underline decoration-1 underline-offset-[0.22em] decoration-accent-soft/50 hover:decoration-accent-soft"
                >
                  {site.phone.display}
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
