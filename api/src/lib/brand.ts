/**
 * Organisation names used in emails. Copied from web/src/lib/site.ts (the source
 * of truth); brand.test.ts fails if the two drift apart.
 */
export const brand = {
  operator: "Crystal Entrepreneurship Centre",
  operatorShort: "CEC",
  /** Display name in the From header of every email. Matches the name in EMAIL_FROM. */
  operatorFromName: "Crystal Entrepreneurship",
  institutionShort: "OAUSTECH",
  programme: "OAUSTECH Entrepreneurship, ICT, Digital Skills and Emerging Technologies Training Programme",
} as const;
