import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageMotion } from "@/components/marketing/motion";
import { PostBody } from "@/components/marketing/post-body";
import { allPosts, postBySlug, readingMinutes, relatedPosts } from "@/lib/content/posts";
import { formatDate } from "@/lib/utils";

/**
 * Every post is known at build time, so each one is prerendered. Reading `params` requires
 * this under `cacheComponents`.
 *
 * Unknown slugs are turned away by the proxy rather than here: with partial prerendering, a
 * slug outside this list is rendered on demand and its shell goes out with a 200 before the
 * dynamic part reaches `notFound()` — a soft 404 that crawlers index. `dynamicParams` would
 * be the natural fix but is incompatible with `cacheComponents`.
 */
export function generateStaticParams() {
  return allPosts().map((p) => ({ slug: p.slug }));
}



export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = postBySlug((await params).slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.title,
    description: post.description,
    authors: [{ name: post.author }],
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      authors: [post.author],
    },
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();
  const related = relatedPosts(post);

  // Article structured data, built from the same source as the page so the two can't drift.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", name: "Skylark" },
    keywords: post.tags.join(", "),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="component component--post">
        <header className="post-head">
          <Link href="/blog" className="post-head__back text --xsmall">
            <ArrowLeft aria-hidden /> All writing
          </Link>
          <p className="label">{post.tags.join(" · ")}</p>
          <h1 className="display --large --fill">{post.title}</h1>
          <p className="text --medium post-head__standfirst">{post.description}</p>
          <p className="post-head__meta text --xsmall">
            {post.author}
            <span aria-hidden> · </span>
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}</time>
            <span aria-hidden> · </span>
            {readingMinutes(post)} min read
          </p>
        </header>

        <PostBody blocks={post.blocks} />

        <footer className="post-foot">
          <p className="text --small">
            Skylark finds roles you are eligible for, tailors each application, and has a specialist submit it with proof.{" "}
            <Link href="/#pricing">See the plans</Link>.
          </p>
        </footer>
      </article>

      {related.length > 0 && (
        <section className="component component--posts" aria-labelledby="related-title">
          <div className="posts">
            <h2 id="related-title" className="display --small posts__related-title">
              Related
            </h2>
            <div className="posts-grid">
              {related.map((r) => (
                <article key={r.slug} className="post-card">
                  <p className="post-card__meta text --xsmall">
                    <time dateTime={r.publishedAt}>{formatDate(r.publishedAt, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}</time>
                    <span aria-hidden> · </span>
                    {readingMinutes(r)} min read
                  </p>
                  <h3 className="title --medium">
                    <Link href={`/blog/${r.slug}`}>{r.title}</Link>
                  </h3>
                  <p className="text --small post-card__excerpt">{r.description}</p>
                  <Link href={`/blog/${r.slug}`} className="post-card__more text --xsmall">
                    Read it <ArrowRight aria-hidden />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
      <PageMotion />
    </>
  );
}
