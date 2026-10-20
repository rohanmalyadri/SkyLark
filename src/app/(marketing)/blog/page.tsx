import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageMotion } from "@/components/marketing/motion";
import { allPosts, readingMinutes } from "@/lib/content/posts";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Writing",
  description: "Practical notes on job hunting across borders: sponsorship research, application forms, realistic volume, and how our match scores work.",
};

export default function BlogIndexPage() {
  const posts = allPosts();
  const [lead, ...rest] = posts;

  return (
    <>
      <section className="component component--textblocklarge page-head" aria-labelledby="blog-title">
        <div className="text-block-center">
          <p className="label">Writing</p>
          <h1 id="blog-title" className="display --large --fill">
            Notes on looking for work in a country that is not yours yet
          </h1>
        </div>
      </section>

      <section className="component component--posts" aria-label="Articles">
        <div className="posts">
          {lead && (
            <article className="post-card post-card--lead">
              <PostMeta post={lead} />
              <h2 className="display --medium">
                <Link href={`/blog/${lead.slug}`}>{lead.title}</Link>
              </h2>
              <p className="text --medium post-card__excerpt">{lead.description}</p>
              <Link href={`/blog/${lead.slug}`} className="post-card__more text --small">
                Read it <ArrowRight aria-hidden />
              </Link>
            </article>
          )}

          <div className="posts-grid">
            {rest.map((post) => (
              <article key={post.slug} className="post-card">
                <PostMeta post={post} />
                <h2 className="title --medium">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <p className="text --small post-card__excerpt">{post.description}</p>
                <Link href={`/blog/${post.slug}`} className="post-card__more text --xsmall">
                  Read it <ArrowRight aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <PageMotion />
    </>
  );
}

function PostMeta({ post }: { post: ReturnType<typeof allPosts>[number] }) {
  return (
    <p className="post-card__meta text --xsmall">
      <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}</time>
      <span aria-hidden> · </span>
      {readingMinutes(post)} min read
      <span aria-hidden> · </span>
      {post.tags.join(", ")}
    </p>
  );
}
