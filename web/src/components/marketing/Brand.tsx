import Image from "next/image";
import { images } from "@/content/images";
import { cx } from "@/lib/cx";
import { site } from "@/lib/site";

/**
 * Both brands side by side: OAUSTECH logo, a thin vertical rule, then the
 * Crystal Entrepreneurship Centre logo.
 */
export function Brand({ className, stacked = false }: { className?: string; stacked?: boolean }) {
  const logo = images.oaustechLogo;
  const crystal = images.crystalLogoMark;
  if (stacked) {
    // Sidebar: OAUSTECH logo on top, a short hairline, then the Crystal logo.
    return (
      <span className={cx("flex flex-col items-start gap-3", className)}>
        <Image src={logo.src} alt={logo.alt} width={163} height={34} loading="eager" className="h-[30px] w-auto" />
        <span aria-hidden="true" className="h-px w-10 bg-line" />
        <Image src={crystal.src} alt={site.operator.name} width={140} height={30} loading="eager" className="h-[30px] w-auto" />
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
      <Image
        src={crystal.src}
        alt={site.operator.name}
        width={159}
        height={34}
        loading="eager"
        className="h-6 w-auto sm:h-[34px]"
      />
    </span>
  );
}
