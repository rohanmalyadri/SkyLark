/** Marketing navigation, shared by the header (client) and footer (server). */
export const NAV = [
  { href: "/#about", label: "About" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#domains", label: "Domains" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQs" },
  { href: "/team", label: "Team" },
];

/** The four stages, used by the header's feature tiles. Hover reveals each tile's botanical image. */
export const STEPS_NAV = [
  { href: "/#step-profile", label: "Profile", icon: "profile", art: "/art/menu/profile.jpg" },
  { href: "/#step-match", label: "Match", icon: "match", art: "/art/menu/match.jpg" },
  { href: "/#step-tailor", label: "Tailor", icon: "tailor", art: "/art/menu/tailor.jpg" },
  { href: "/#step-apply", label: "Apply & track", icon: "apply", art: "/art/menu/apply.jpg" },
] as const;
