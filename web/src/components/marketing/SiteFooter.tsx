import { TextLink } from "@/components/ui/TextLink";
import { contact } from "@/content/landing";
import { site } from "@/lib/site";
import { Brand } from "./Brand";

const strip = (url: string) => url.replace(/^https?:\/\//, "");

export function SiteFooter() {
  return (
    <footer id="contact" aria-labelledby="contact-title" className="anchor border-t border-line bg-paper-2">
      <div className="container-site grid gap-y-12 py-16 md:py-20 lg:grid-cols-12 lg:gap-x-8">
        <div className="lg:col-span-5">
          <Brand />
        </div>

        <div className="lg:col-span-7">
          <h2 id="contact-title" className="text-[1.75rem] md:text-[2rem]">
            {contact.heading}
          </h2>
          <dl className="mt-6 grid border-t border-line text-[1rem] sm:grid-cols-2 sm:gap-x-10">
            <div className="border-b border-line py-4">
              <dt className="font-semibold">{contact.institution}</dt>
              <dd className="mt-1 text-ink-muted">{contact.address}</dd>
            </div>
            <div className="border-b border-line py-4">
              <dt className="font-semibold">{contact.enquiriesLabel}</dt>
              <dd className="mt-1">
                <TextLink href={site.phone.href}>{site.phone.display}</TextLink>
              </dd>
            </div>
            <div className="border-b border-line py-4">
              <dt className="font-semibold">{contact.formLabel}</dt>
              <dd className="mt-1">
                <TextLink href={site.applicationFormUrl} external className="break-all">
                  {strip(site.applicationFormUrl)}
                </TextLink>
              </dd>
            </div>
            <div className="border-b border-line py-4">
              <dt className="font-semibold">{contact.websiteLabel}</dt>
              <dd className="mt-1">
                <TextLink href={site.institution.website} external>
                  {strip(site.institution.website)}
                </TextLink>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-site flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 py-6 text-[0.9375rem] text-ink-muted">
          <p>{contact.partnershipLine}</p>
          <a href="/photo-credits/" className="text-[0.875rem] underline decoration-line underline-offset-[0.22em] hover:text-ink hover:decoration-ink-muted">
            Photo credits
          </a>
        </div>
      </div>
    </footer>
  );
}
