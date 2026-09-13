// Treks — one chunk per fort, with its first photo.
export default {
  type: "trek",
  load: (ctx) => ctx.fetchAll("treks"),
  toChunks: (rows, { compose, entityUrl, parseLooseDate, firstImage }) => rows.map((r) => ({
    entity_type: "trek",
    entity_id: r.id,
    chunk_index: 0,
    title: r.fort_name,
    url: entityUrl("trek", r.id),
    chunk_date: parseLooseDate(r.date),
    tags: r.tag_names || [],
    image_url: firstImage(r.slide_images),
    body: compose([
      ["Trek", r.fort_name],
      ["Date", r.date],
      ["Duration", r.trek_time],
      ["Endurance", r.endurance_level],
      ["Tags", (r.tag_names || []).join(", ")],
      ["Write-up", r.blog_link],
    ]),
  })),
};
