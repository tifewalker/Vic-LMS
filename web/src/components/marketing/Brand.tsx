import Image from "next/image";
import { images } from "@/content/images";
import { cx } from "@/lib/cx";
import { site } from "@/lib/site";

/**
 * Both brands side by side: OAUSTECH logo, a thin vertical rule, then the
 * Victory Entrepreneurship Centre wordmark set in the heading serif.
 */
export function Brand({ className, stacked = false }: { className?: string; stacked?: boolean }) {
  const logo = images.oaustechLogo;
  if (stacked) {
    // Sidebar: logo on top, a short hairline, then the wordmark.
    return (
      <span className={cx("flex flex-col items-start gap-3", className)}>
        <Image src={logo.src} alt={logo.alt} width={163} height={34} loading="eager" className="h-[30px] w-auto" />
        <span aria-hidden="true" className="h-px w-10 bg-line" />
        {/* TODO(content): replace this wordmark with the Victory Entrepreneurship Centre logo when supplied. */}
        <span className="font-serif text-ui-md leading-tight text-ink">{site.operator.name}</span>
      </span>
    );
  }
  return (
    <span className={cx("flex items-center gap-3 sm:gap-4", className)}>
      <Image
        src={logo.src}
        alt={logo.alt}
        width={163}
        height={34}
        loading="eager"
        className="h-6 w-auto sm:h-[34px]"
      />
      <span aria-hidden="true" className="h-9 w-px shrink-0 bg-line sm:h-10" />
      {/* TODO(content): replace this wordmark with the Victory Entrepreneurship Centre logo when supplied. */}
      <span className="font-serif text-[0.9375rem] leading-[1.08] text-ink sm:text-[1.1875rem]">
        <span className="sr-only">{site.operator.name}</span>
        <span aria-hidden="true">
          <span className="block">Victory</span>
          <span className="block">
            Entrepreneurship
            <span className="hidden sm:inline"> </span>
            <br className="sm:hidden" />
            Centre
          </span>
        </span>
      </span>
    </span>
  );
}
