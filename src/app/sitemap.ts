import type { MetadataRoute } from "next";
import { allPosts } from "@/lib/content/posts";
import { siteUrl } from "@/lib/site";

/** Every public page, plus one entry per blog post (posts are compiled in, so this never goes stale). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl(process.env.NEXT_PUBLIC_APP_URL, process.env.NODE_ENV === "production");
  const posts = allPosts();
  const newestPost = posts.map((p) => p.updatedAt ?? p.publishedAt).sort().at(-1);
  const pages: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; lastModified?: string }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" },
    { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
    { path: "/blog", priority: 0.7, changeFrequency: "weekly", lastModified: newestPost },
    { path: "/team", priority: 0.4, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  ];
  return [
    ...pages.map((p) => ({ url: `${base}${p.path === "/" ? "" : p.path}`, changeFrequency: p.changeFrequency, priority: p.priority, ...(p.lastModified ? { lastModified: p.lastModified } : {}) })),
    ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.updatedAt ?? p.publishedAt, changeFrequency: "yearly" as const, priority: 0.6 })),
  ];
}
