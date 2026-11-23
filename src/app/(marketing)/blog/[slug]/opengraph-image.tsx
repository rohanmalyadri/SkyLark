import { allPosts, postBySlug } from "@/lib/content/posts";
import { OG_SIZE, ogCard } from "@/lib/og-card";

export const alt = "Skylark writing";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return allPosts().map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = postBySlug((await params).slug);
  return ogCard({ eyebrow: "Skylark writing", title: post?.title ?? "Writing" });
}
