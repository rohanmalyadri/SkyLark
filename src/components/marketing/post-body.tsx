import type { Block } from "@/lib/content/posts";

/**
 * Renders a post's content blocks as semantic HTML. Every block type maps to real elements,
 * so there is no `dangerouslySetInnerHTML` and no HTML-injection surface anywhere in the blog.
 */
export function PostBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="post-body">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "heading":
            return (
              <h2 key={i} className="display --small post-body__heading">
                {block.text}
              </h2>
            );
          case "paragraph":
            return (
              <p key={i} className="text --medium">
                {block.text}
              </p>
            );
          case "list":
            return block.ordered ? (
              <ol key={i} className="post-body__list post-body__list--ordered">
                {block.items.map((item) => (
                  <li key={item} className="text --medium">
                    {item}
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={i} className="post-body__list">
                {block.items.map((item) => (
                  <li key={item} className="text --medium">
                    {item}
                  </li>
                ))}
              </ul>
            );
          case "callout":
            return (
              <aside key={i} className="post-body__callout">
                <p className="text --xsmall --uppercase --bold post-body__callout-title">{block.title}</p>
                <p className="text --medium">{block.text}</p>
              </aside>
            );
          case "quote":
            return (
              <blockquote key={i} className="post-body__quote">
                <p className="display --small --serif">{block.text}</p>
                {block.attribution && <footer className="text --xsmall">{block.attribution}</footer>}
              </blockquote>
            );
        }
      })}
    </div>
  );
}
