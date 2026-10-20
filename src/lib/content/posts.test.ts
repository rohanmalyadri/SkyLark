import { describe, expect, it } from "vitest";
import { allPosts, POSTS, postBySlug, readingMinutes, relatedPosts, type Post } from "./posts";

/*
 * The blog is authored in the repository, so these are integrity checks on content rather
 * than behaviour tests: a post with a duplicate slug or a missing description is a broken
 * page and a broken meta tag, and neither shows up in a typecheck.
 */

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

describe("post integrity", () => {
  it("has no duplicate slugs", () => {
    const slugs = POSTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(POSTS.map((p): [string, Post] => [p.slug, p]))("%s is publishable", (_slug, post) => {
    expect(post.slug).toMatch(SLUG);
    expect(post.publishedAt).toMatch(DATE);
    if (post.updatedAt) {
      expect(post.updatedAt).toMatch(DATE);
      expect(post.updatedAt >= post.publishedAt).toBe(true);
    }
    expect(post.title.length).toBeGreaterThanOrEqual(10);
    expect(post.author.trim()).not.toBe("");
    expect(post.tags.length).toBeGreaterThan(0);

    // Search engines truncate past ~160 characters, and an empty one is worse than a short one.
    expect(post.description.length).toBeGreaterThanOrEqual(50);
    expect(post.description.length).toBeLessThanOrEqual(200);

    // A post that is all headings and no prose is a stub.
    expect(post.blocks.filter((b) => b.kind === "paragraph").length).toBeGreaterThanOrEqual(2);
  });

  it.each(POSTS.map((p): [string, Post] => [p.slug, p]))("%s has no empty blocks", (_slug, post) => {
    for (const block of post.blocks) {
      if (block.kind === "list") {
        expect(block.items.length).toBeGreaterThan(0);
        for (const item of block.items) expect(item.trim()).not.toBe("");
      } else if (block.kind === "callout") {
        expect(block.title.trim()).not.toBe("");
        expect(block.text.trim()).not.toBe("");
      } else {
        expect(block.text.trim()).not.toBe("");
      }
    }
  });

  it("contains no raw HTML, since blocks render as React and would show it literally", () => {
    const text = JSON.stringify(POSTS);
    expect(text).not.toMatch(/<\/?(a|b|i|p|div|span|script|img|br)\b/i);
  });
});

describe("listing and lookup", () => {
  it("sorts newest first", () => {
    const dates = allPosts().map((p) => p.publishedAt);
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
  });

  it("finds a post by slug and returns null for an unknown one", () => {
    expect(postBySlug(POSTS[0]!.slug)?.title).toBe(POSTS[0]!.title);
    expect(postBySlug("no-such-post")).toBeNull();
  });
});

describe("reading time", () => {
  it("is at least a minute and scales with length", () => {
    for (const post of POSTS) expect(readingMinutes(post)).toBeGreaterThanOrEqual(1);

    const short: Post = { ...POSTS[0]!, blocks: [{ kind: "paragraph", text: "Three words only." }] };
    const long: Post = { ...POSTS[0]!, blocks: [{ kind: "paragraph", text: "word ".repeat(1000) }] };
    expect(readingMinutes(short)).toBe(1);
    expect(readingMinutes(long)).toBeGreaterThan(readingMinutes(short));
  });

  it("counts words inside lists and callouts, not just paragraphs", () => {
    const base: Post = { ...POSTS[0]!, blocks: [] };
    const withList: Post = { ...base, blocks: [{ kind: "list", items: Array.from({ length: 50 }, () => "a measurable number of words here") }] };
    expect(readingMinutes(withList)).toBeGreaterThan(1);
  });
});

describe("related posts", () => {
  it("shares a tag, excludes itself and respects the limit", () => {
    const post = POSTS[0]!;
    const related = relatedPosts(post, 2);
    expect(related.length).toBeLessThanOrEqual(2);
    expect(related.some((r) => r.slug === post.slug)).toBe(false);
    for (const r of related) expect(r.tags.some((t) => post.tags.includes(t))).toBe(true);
  });

  it("returns nothing rather than filler when no tags overlap", () => {
    const orphan: Post = { ...POSTS[0]!, slug: "orphan", tags: ["NothingElseUsesThisTag"] };
    expect(relatedPosts(orphan)).toEqual([]);
  });
});
