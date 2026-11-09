/**
 * Image registry. Every photo used on the site is declared here once.
 * Files live in public/images/ and are served with next/image (no hotlinking).
 *
 * Section slots accept `SiteImage | null`. When a slot is null the section
 * renders without a photo (or with a neutral captioned placeholder), so client
 * photos can be added later by editing this file only.
 */

export type SiteImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
  /** Where the image came from, for our records. Not rendered. */
  source?: string;
};

export const images = {
  oaustechLogo: {
    src: "/images/oaustech-logo.png",
    alt: "Olusegun Agagu University of Science and Technology logo, with the motto For Society and Development",
    width: 310,
    height: 65,
    source: "https://oaustech.edu.ng/images/logo.png",
  },
  campusGate: {
    src: "/images/oaustech-campus.jpg",
    alt: "The main gate of Olusegun Agagu University of Science and Technology, Okitipupa, with the university name on the arch and green grounds beyond",
    width: 1920,
    height: 550,
    caption: "Main gate, OAUSTECH, Okitipupa",
    source: "https://oaustech.edu.ng/cache/resized/0930ca64ead13e2113232a6df145a9c7.jpg",
  },
} satisfies Record<string, SiteImage>;

/** Optional photo slots per section. Set to an image to show it, or null for none. */
export const imageSlots: {
  hero: SiteImage | null;
  about: SiteImage | null;
  whyOaustech: SiteImage | null;
} = {
  hero: images.campusGate,
  // TODO(content): client to supply a photo for the About section (e.g. a training session).
  about: null,
  // TODO(content): client to supply a campus photo for the Why OAUSTECH section.
  whyOaustech: null,
};
