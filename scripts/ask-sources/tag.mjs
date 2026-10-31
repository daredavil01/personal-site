// Every tag that means something: one with a description or a category, or
// one that is actually on a row. "What does the ultra tag cover?" retrieves the
// first kind; "what else is tagged birding?" needs the second, and before it
// was indexed 24 used tags (birding, design, accessibility…) had no chunk.
// Counts come from tags_with_counts() so the chunk says what a tag is on.
import { ENTITY_PLURALS } from "../../src/data/askConfig.js";

function usedOn(counts) {
  return Object.entries(counts || {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => `${n} ${ENTITY_PLURALS[type] || type}`)
    .join(", ");
}

export default {
  type: "tag",
  load: async ({ supabase }) => {
    const { data, error } = await supabase.rpc("tags_with_counts");
    if (error) throw new Error(`tags_with_counts: ${error.message}`);
    return data || [];
  },
  toChunks: (rows, { compose }) => rows
    .filter((r) => r.description || r.category || r.total > 0)
    .map((r) => ({
      entity_type: "tag",
      entity_id: r.id,
      chunk_index: 0,
      title: r.display_name || r.name,
      // Same rule as tagPath() in src/lib/api/tags.js: URI-encoded, never
      // slugified, because some tag names are Marathi.
      url: `/tags/${encodeURIComponent(r.name)}`,
      chunk_date: null,
      tags: [r.name],
      image_url: null,
      body: compose([
        ["Tag", r.display_name || r.name],
        ["Name", r.name],
        ["Category", r.category],
        ["Used on", usedOn(r.counts)],
        [null, r.description],
      ]),
    })),
};
