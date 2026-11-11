import type { Metadata } from "next";
import { TextLink } from "@/components/ui/TextLink";
import { creditedPhotos } from "@/content/images";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Photo credits",
  description: "Who took the photographs used on this site, and where they come from.",
};

const strip = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

export default function PhotoCreditsPage() {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <div className="container-site py-section">
        <div className="border-t border-ink/80 pt-5">
          <h1 className="text-[clamp(2rem,4.6vw,3.5rem)]">Photo credits</h1>
          <div className="mt-6 max-w-measure space-y-4 text-ink-muted">
            <p>
              Photos of {site.institution.shortName} (the main gate, auditorium and library) come from the university
              website, <TextLink href={site.institution.website} external>{strip(site.institution.website)}</TextLink>.
            </p>
            <p>
              The other photos are from Pexels and are used under the{" "}
              <TextLink href="https://www.pexels.com/license/" external>
                Pexels licence
              </TextLink>
              . They show the kind of work each training area covers. None of them were taken at {site.institution.shortName}.
            </p>
          </div>
        </div>

        <ul className="mt-12 border-t border-line">
          {creditedPhotos.map((photo) => (
            <li key={photo.src} className="grid gap-y-1 border-b border-line py-4 md:grid-cols-12 md:gap-x-8">
              <p className="md:col-span-6">{photo.caption}</p>
              <p className="text-ink-muted md:col-span-6">
                Photo by{" "}
                {photo.credit ? (
                  <TextLink href={photo.credit.profile} external>
                    {photo.credit.name}
                  </TextLink>
                ) : null}{" "}
                on{" "}
                <TextLink href={photo.source ?? "https://www.pexels.com"} external>
                  Pexels
                </TextLink>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
