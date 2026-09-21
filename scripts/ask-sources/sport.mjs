// Races — one chunk per race, with its first photo.
//
// The plain sentence exists for the same reason as the one in trek.mjs: the
// labelled line holds "Distance: 10 Kms" and "Finish time: 01:26:40" but never
// the words "run", "running" or "race distance", so "How many marathons has he
// run?" retrieved long blog essays about marathons and not one race row.
// The distance word is taken from the row, never assumed: calling a 10 Kms race
// a marathon is exactly the kind of confident wrong detail this whole pass is
// trying to stop.
function raceSentence(r, clean) {
  const title = clean(r.title);
  if (!title) return null;
  const distance = clean(r.distance);
  const place = clean(r.place);
  const time = clean(r.time);
  const date = clean(r.date);

  const parts = [`${title} was a running race he ran`];
  if (distance) parts.push(`over ${distance}`);
  if (place) parts.push(`at ${place}`);
  if (date) parts.push(`on ${date}`);
  const head = `${parts.join(" ")}.`;
  const finish = time ? ` He finished it in ${time}.` : "";
  return `${head}${finish} One of his running races and marathon finishes.`;
}

export default {
  type: "sport",
  load: (ctx) => ctx.fetchAll("sports"),
  toChunks: (rows, {
    compose, clean, entityUrl, parseLooseDate, firstImage,
  }) => rows.map((r) => ({
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
      [null, raceSentence(r, clean)],
    ]),
  })),
};
