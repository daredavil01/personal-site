// 100 Days To Offload rows — the metadata chunk (index 0) for each tracked post.
// The post's full text is added as chunks 1..n of the same entity by writing.mjs.
export default {
  type: "blog",
  load: (ctx) => ctx.fetchAll("blogs"),
  toChunks: (rows, { compose, entityUrl, parseLooseDate }) => rows.map((r) => ({
    entity_type: "blog",
    entity_id: r.id,
    chunk_index: 0,
    title: r.blog_title,
    url: entityUrl("blog", r.id),
    chunk_date: parseLooseDate(r.blog_date),
    tags: r.tag_names || [],
    image_url: null,
    body: compose([
      ["Blog post", r.blog_title],
      ["Published", r.blog_date],
      ["Platform", r.blog_platform],
      ["Language", r.language],
      ["Tags", (r.tag_names || []).join(", ")],
      [null, r.blog_description],
      ["Link", r.blog_link],
    ]),
  })),
};
