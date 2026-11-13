import { LoginLink } from "@/components/ui/LoginLink";
import { PhotoFigure } from "@/components/ui/PhotoFigure";
import { textLinkClass } from "@/components/ui/TextLink";
import { imageSlots } from "@/content/images";
import { hero } from "@/content/landing";
import { site } from "@/lib/site";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="pt-10 pb-section md:pt-16 lg:pt-20">
      <div className="container-site">
        <p className="kicker max-w-[52ch] leading-relaxed">{hero.eyebrow}</p>

        <div className="mt-6 grid gap-y-10 md:mt-8 lg:grid-cols-12 lg:items-end lg:gap-x-8">
          <h1
            id="hero-title"
            className="text-[clamp(2.5rem,8.2vw,5.75rem)] leading-[1.02] tracking-[-0.02em] lg:col-span-8"
          >
            {hero.headline.map((line, i) => (
              <span key={line} className={i === 1 ? "block italic" : "block"}>
                {line}
                {i < hero.headline.length - 1 ? " " : null}
              </span>
            ))}
          </h1>

          <div className="lg:col-span-4 lg:pb-2">
            <p className="max-w-[34ch] font-serif text-[1.3125rem] leading-snug md:text-2xl">{hero.strapline}</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
              <LoginLink>{hero.loginLabel}</LoginLink>
              <p className="text-[0.9375rem]">
                {hero.activatePrompt}{" "}
                <a href={site.platform.activate} className={textLinkClass}>
                  {hero.activateLabel}
                </a>
              </p>
            </div>
            <p className="mt-4 text-[0.9375rem]">
              <a href={site.phone.href} className={textLinkClass}>
                {hero.enquireLabel}: <span className="whitespace-nowrap">{site.phone.display}</span>
              </a>
            </p>
            <p className="mt-6 text-[0.9375rem] text-ink-muted">
              <span className="font-semibold text-ink">Location:</span> {hero.location}
            </p>
          </div>
        </div>

        <PhotoFigure
          image={imageSlots.hero}
          placeholderCaption="Training photo"
          aspect="aspect-[4/3] sm:aspect-[16/9] lg:aspect-[2/1]"
          sizes="(min-width: 1312px) 1216px, 100vw"
          preload
          className="mt-12 md:mt-16"
        />

        <div className="mt-12 grid gap-y-8 border-t border-line pt-10 md:mt-16 lg:grid-cols-12 lg:gap-x-8">
          <p className="max-w-[30ch] font-serif text-[1.5rem] leading-snug md:text-[1.875rem] lg:col-span-5">
            {hero.question}
          </p>
          <div className="max-w-measure space-y-5 lg:col-span-6 lg:col-start-7">
            {hero.intro.map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
            <p className="font-semibold">{hero.summary}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
