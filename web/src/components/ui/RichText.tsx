import type { LinkTarget, RichText as RichTextData } from "@/content/landing";
import { site } from "@/lib/site";
import { TextLink } from "./TextLink";

const targets: Record<LinkTarget, { href: string; external: boolean }> = {
  phone: { href: site.phone.href, external: false },
  form: { href: site.applicationFormUrl, external: true },
};

/** Renders copy that contains inline links to the phone number or the application form. */
export function RichText({ value }: { value: RichTextData }) {
  return (
    <>
      {value.map((part, i) => {
        if (typeof part === "string") return <span key={i}>{part}</span>;
        const t = targets[part.link];
        return (
          <TextLink key={i} href={t.href} external={t.external}>
            {part.text}
          </TextLink>
        );
      })}
    </>
  );
}
