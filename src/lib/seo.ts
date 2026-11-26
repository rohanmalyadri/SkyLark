import type { Metadata } from "next";

export const SITE_NAME = "Skylark";
export const SITE_DESCRIPTION =
  "Skylark is a human-assisted job application service. Share your profile once; we match you to roles you're eligible for, tailor each application, and a specialist reviews and submits it — while you prepare for interviews.";

/**
 * Metadata for a public page: its title and description, a canonical URL, and OpenGraph and
 * Twitter tags that point at the page itself. Next.js replaces the whole `openGraph` object of
 * a parent layout rather than merging it, so every public page sets its own through here.
 * Paths are relative; the root layout's `metadataBase` turns them into absolute URLs.
 */
/**
 * The site-wide share card (app/opengraph-image.tsx). A page that sets its own `openGraph` loses the
 * inherited file-based image, so pages built here name it explicitly.
 */
const SHARE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "Skylark — Your next move, already in motion" };

export function pageMetadata({ path, title, description, absoluteTitle = false }: { path: string; title: string; description: string; absoluteTitle?: boolean }): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} · ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, url: path, title: fullTitle, description, locale: "en_IN", images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [SHARE_IMAGE.url] },
  };
}

/** Pages that must never appear in search results (sign-in, the signed-in app). */
export const NO_INDEX: Metadata["robots"] = { index: false, follow: false };
