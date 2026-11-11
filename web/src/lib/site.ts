/**
 * Site-wide facts: contact details, links and URLs.
 * Change them here only. Components must import from this file.
 */

export const site = {
  /** TODO(content): replace with the production domain once it is known. */
  url: "http://localhost:3000",

  name: "OAUSTECH Entrepreneurship, ICT, Digital Skills & Emerging Technologies Training Programme",
  shortName: "OAUSTECH Training Programme",

  /**
   * The organisation that runs the programme. The API keeps a copy of these
   * strings in api/src/lib/brand.ts; a test there fails if the two drift apart.
   */
  operator: {
    name: "Crystal Entrepreneurship Centre",
    shortName: "CEC",
    /** TODO(content): Crystal Entrepreneurship Centre logo not supplied yet. Wordmark is used until then. */
    logo: null as string | null,
  },

  institution: {
    name: "Olusegun Agagu University of Science and Technology",
    shortName: "OAUSTECH",
    website: "https://oaustech.edu.ng",
  },

  location: {
    town: "Okitipupa",
    state: "Ondo State",
    country: "Nigeria",
  },

  phone: {
    display: "+234 703 203 8565",
    href: "tel:+2347032038565",
  },

  /** Google Form for now. Swap for the in-platform form in a later phase. */
  applicationFormUrl: "https://forms.gle/DKMJPQvVLbwWSsbeA",
} as const;

/** "Delivered by Crystal Entrepreneurship Centre in partnership with OAUSTECH" */
export const partnershipLine = `Delivered by ${site.operator.name} in partnership with ${site.institution.shortName}`;

export type Site = typeof site;
