// Full text of every published blog post (Substack + WordPress), read from the
// cache written by `npm run blogs:wordcount`.
//
// A post that has a row in `blogs` gets its text as chunks 1..n of that blog
// entity, so it shares a page (/100-days-to-offload/:id) and a source card with
// its metadata chunk. A post with no row becomes a `writing` entity that links
// straight out to the post.
//
// The text never leaves the index and the gitignored knowledge_base/ — nothing
// here is written to public/. (/logbook ships single sentences that link back
// to their post, never paragraphs: see scripts/build-logbook.mjs.)

import fs from "fs";
import path from "path";

export const TEXT_CACHE = "knowledge_base/blog-posts-text.json";

export default {
  type: "writing",
  // If the cache is missing, the blog body chunks are unaccounted for too —
  // protect both types from orphan deletion.
  owns: ["blog"],
  load: ({ ROOT }) => {
    const abs = path.join(ROOT, TEXT_CACHE);
    if (!fs.existsSync(abs)) {
      throw new Error(`${TEXT_CACHE} is missing — run \`npm run blogs:wordcount\` first`);
    }
    const { posts, missing = [] } = JSON.parse(fs.readFileSync(abs, "utf8"));
    // Substack blocks CI runners, so the nightly cache lacks their bodies.
    // Indexing it anyway deleted every Substack body chunk each night.
    if (missing.length) {
      throw Object.assign(
        new Error(`${missing.length} posts have no text (Substack unreachable?) — kept their chunks`),
        { keep: true },
      );
    }
    return (posts || []).filter((p) => p.text);
  },
  toChunks: (posts, { compose, splitProse, entityUrl, syntheticId }) => posts.flatMap((p) => {
    const tracked = Number.isFinite(p.blogId);
    const parts = splitProse(p.text);
    return parts.map((part, i) => ({
      entity_type: tracked ? "blog" : "writing",
      entity_id: tracked ? p.blogId : syntheticId(p.url),
      // Chunk 0 of a tracked post is blog.mjs's metadata chunk.
      chunk_index: tracked ? i + 1 : i,
      title: p.title,
      url: tracked ? entityUrl("blog", p.blogId) : p.url,
      chunk_date: p.date || null,
      tags: p.tags || [],
      image_url: p.image || null,
      body: compose([
        [tracked ? "Blog post" : "Essay", p.title],
        i === 0 ? ["Published", `${p.date} on ${p.platform}`] : ["Part", `${i + 1} of ${parts.length}`],
        i === 0 ? ["Language", p.language] : [null, null],
        i === 0 ? ["Words", p.words] : [null, null],
        [null, part],
      ]),
    }));
  }),
};
