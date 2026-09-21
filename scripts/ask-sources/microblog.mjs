// Micro posts (the Tumblr archive plus hand-written ones). Most fit in one
// chunk; a long post is split on paragraphs like any other prose, so its
// whole text is embedded rather than only the first 4,000 characters.
export default {
  type: "microblog",
  load: (ctx) => ctx.fetchAll("microblog"),
  toChunks: (rows, {
    compose, entityUrl, storageUrl, splitProse,
  }) => rows.flatMap((r) => {
    const title = r.title || `${r.post_type} post`;
    const head = [
      ["Micro post", r.title],
      ["Date", r.date],
      ["Type", r.post_type],
      // 0025's post_kind, in the text rather than a column: hybrid_search
      // returns the body and nothing else about the row, so this is the only
      // place a "he did not write this one" signal can reach retrieval — and
      // the answering model reads it too, which is what CLAUDE.md's prose
      // warning about reblogs has been asking a model to remember.
      ["Kind", r.post_kind],
      ["Tags", (r.tag_names || []).join(", ")],
    ];
    // Split with room for the header, so the combined body stays in the window.
    const parts = String(r.text || "").length > 3000 ? splitProse(r.text, 2400) : [r.text];
    return parts.map((part, i) => ({
      entity_type: "microblog",
      entity_id: r.id,
      chunk_index: i,
      title,
      url: entityUrl("microblog", r.id),
      chunk_date: r.date ? String(r.date).slice(0, 10) : null,
      tags: r.tag_names || [],
      image_url: storageUrl(r.image_url),
      body: compose(i === 0
        ? [...head, [null, part]]
        : [["Micro post", title], ["Part", `${i + 1} of ${parts.length}`], [null, part]]),
    }));
  }),
};
