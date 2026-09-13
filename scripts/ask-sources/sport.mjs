// Races — one chunk per race, with its first photo.
export default {
  type: "sport",
  load: (ctx) => ctx.fetchAll("sports"),
  toChunks: (rows, { compose, entityUrl, parseLooseDate, firstImage }) => rows.map((r) => ({
    entity_type: "sport",
    entity_id: r.id,
    chunk_index: 0,
    title: r.title,
    url: entityUrl("sport", r.id),
    chunk_date: parseLooseDate(r.date),
    tags: r.tag_names || [],
    image_url: firstImage(r.slide_images),
    body: compose([
      ["Race", r.title],
      ["Date", r.date],
      ["Place", r.place],
      ["Distance", r.distance],
      ["Finish time", r.time],
      ["Bib", r.bib_number],
      ["Tags", (r.tag_names || []).join(", ")],
      [null, r.description],
    ]),
  })),
};
