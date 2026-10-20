/** Marketing navigation, shared by the header (client) and footer (server). */
/*
 * Kept to seven: "Domains" and "Why trust us" are sections a visitor scrolls through on the
 * way down, so they are reachable without spending a header slot on them.
 */
export const NAV = [
  { href: "/#about", label: "About" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/blog", label: "Writing" },
  { href: "/#faq", label: "FAQs" },
  { href: "/#contact", label: "Contact" },
  { href: "/team", label: "Team" },
];

/** The four stages, used by the header's feature tiles. Hover reveals each tile's botanical image. */
export const STEPS_NAV = [
  { href: "/#step-profile", label: "Profile", icon: "profile", art: "/art/menu/profile.jpg" },
  { href: "/#step-match", label: "Match", icon: "match", art: "/art/menu/match.jpg" },
  { href: "/#step-tailor", label: "Tailor", icon: "tailor", art: "/art/menu/tailor.jpg" },
  { href: "/#step-apply", label: "Apply & track", icon: "apply", art: "/art/menu/apply.jpg" },
] as const;
