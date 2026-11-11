/**
 * Organisation names used in emails. Copied from web/src/lib/site.ts (the source
 * of truth); brand.test.ts fails if the two drift apart.
 */
export const brand = {
  operator: "Crystal Entrepreneurship Centre",
  operatorShort: "CEC",
  institutionShort: "OAUSTECH",
  programme: "OAUSTECH Entrepreneurship, ICT, Digital Skills and Emerging Technologies Training Programme",
} as const;
