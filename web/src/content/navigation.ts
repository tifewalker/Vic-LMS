/** In-page navigation. Labels are short forms of the section headings in the copy. */
export const navItems = [
  { href: "#about", label: "About" },
  { href: "#structure", label: "Programme" },
  { href: "#training-areas", label: "Training areas" },
  { href: "#eligibility", label: "Eligibility" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
] as const;

export type NavItem = (typeof navItems)[number];
