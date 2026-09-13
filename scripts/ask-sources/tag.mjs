// Tags that carry meaning beyond their name — a description or a category —
// so "what does the ultra tag cover?" has something to retrieve.
export default {
  type: "tag",
  load: (ctx) => ctx.fetchAll("tags", "*"),
  toChunks: (rows, { compose }) => rows
    .filter((r) => r.description || r.category)
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
        [null, r.description],
      ]),
    })),
};
