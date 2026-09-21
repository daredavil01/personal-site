// Treks — one chunk per fort, with its first photo.
//
// The labelled metadata line is not enough on its own. "Trek: Rajgad |
// Duration: 3 hrs | Endurance: Medium" is six terms, none of them the words a
// reader uses: a graded run found "Which forts has he trekked?" retrieving zero
// trek chunks, because the word "fort" appears in no trek body and a six-term
// document cannot out-rank changelog.md under ts_rank_cd. So each row also gets
// one plain sentence, which is what the embedding and the keyword half both
// actually have something to match against.
// Says what the row is in the words a question uses — trek, trekking, trekked,
// hike, fort — without claiming anything the row does not support. The second
// half describes the log this row belongs to, which is why it is safe for the
// handful of entries that are a waterfall or a ridge route rather than a fort.
function trekSentence(r, clean) {
  const name = clean(r.fort_name);
  if (!name) return null;
  const endurance = clean(r.endurance_level).toLowerCase();
  const time = clean(r.trek_time);
  const date = clean(r.date);

  const parts = [`Trek to ${name}`];
  if (endurance) parts.push(`an ${endurance}-endurance trek`);
  if (time) parts.push(`about ${time} of trekking`);
  if (date) parts.push(`done on ${date}`);
  return `${parts.join(", ")}. One of his treks and hikes across the forts and hills of the Sahyadris around Pune and Maharashtra.`;
}

export default {
  type: "trek",
  load: (ctx) => ctx.fetchAll("treks"),
  toChunks: (rows, {
    compose, clean, entityUrl, parseLooseDate, firstImage,
  }) => rows.map((r) => ({
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
      [null, trekSentence(r, clean)],
    ]),
  })),
};
