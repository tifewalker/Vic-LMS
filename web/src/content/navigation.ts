/** In-page navigation. Labels are short forms of the section headings in the copy. */
export const navItems = [
  { href: "#about", label: "About" },
  { href: "#structure", label: "Programme" },
  { href: "#training-areas", label: "Training areas" },
  { href: "#about-us", label: "About us" },
  { href: "#faq", label: "FAQ" },
] as const;

export type NavItem = (typeof navItems)[number];
