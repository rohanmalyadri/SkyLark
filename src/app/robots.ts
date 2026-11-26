import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** Public marketing pages are crawlable; the signed-in app, auth flows, APIs and the staff console are not. */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl(process.env.NEXT_PUBLIC_APP_URL, process.env.NODE_ENV === "production");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/auth/", "/r/", "/dashboard", "/jobs", "/applications", "/answers", "/messages", "/profile", "/settings", "/partner", "/onboarding"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
