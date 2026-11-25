/**
 * Site-wide facts: contact details, links and URLs.
 * Change them here only. Components must import from this file.
 */

export const site = {
  /** Production domain, used for metadata and link previews. The API is at api.crystalinnovationhub.com.ng. */
  url: "https://crystalinnovationhub.com.ng",

  name: "OAUSTECH Entrepreneurship, ICT, Digital Skills & Emerging Technologies Training Programme",
  shortName: "OAUSTECH Training Programme",

  /**
   * OAUSTECH's partner on the programme. The API keeps a copy of these
   * strings in api/src/lib/brand.ts; a test there fails if the two drift apart.
   */
  operator: {
    name: "Crystal Entrepreneurship Centre",
    shortName: "CEC",
    /** The logo files are registered in web/src/content/images.ts (crystalLogo, crystalLogoMark). */
    logo: "/images/crystal-logo.webp",
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

  /** Applications for this cohort are closed. Registered participants use the platform. */
  platform: {
    login: "/login/",
    /** Students register themselves here (name, email, phone, sex, matric or registration number, department, level). No email is sent. */
    register: "/register/",
  },
} as const;

/** "OAUSTECH in partnership with Crystal Entrepreneurship Centre": the school leads, Crystal is its partner (client, 25 November 2026). */
export const partnershipLine = `${site.institution.shortName} in partnership with ${site.operator.name}`;

export type Site = typeof site;
