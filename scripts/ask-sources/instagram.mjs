// Instagram photo sets — no detail route, so every chunk links to /instagram.
export default {
  type: "instagram",
  load: (ctx) => ctx.fetchAll("instagram"),
  toChunks: (rows, { compose, entityUrl, firstImage }) => rows.map((r) => ({
    entity_type: "instagram",
    entity_id: r.id,
    chunk_index: 0,
    title: r.title,
    url: entityUrl("instagram", r.id),
    chunk_date: null,
    tags: r.tag_names || [],
    image_url: firstImage(r.slide_images),
    body: compose([
      ["Instagram set", r.title],
      ["Tags", (r.tag_names || []).join(", ")],
      [null, r.caption],
    ]),
  })),
};
