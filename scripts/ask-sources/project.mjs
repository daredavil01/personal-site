// Projects — a head chunk, then the problem/solution/outcome prose. Hidden
// projects are skipped here because the indexer runs with the service key,
// which bypasses the RLS that hides them from everyone else.
export default {
  type: "project",
  load: (ctx) => ctx.fetchAll("projects"),
  toChunks: (rows, { compose, entityUrl, splitProse, storageUrl, firstImage }) => {
    const out = [];
    for (const r of rows.filter((p) => p.visible)) {
      const head = compose([
        ["Project", r.title],
        ["Subtitle", r.subtitle],
        ["Category", r.category],
        ["Status", r.status],
        ["Role", r.role],
        ["Org", r.org],
        ["Date", r.date],
        ["Tech", (r.tech_stack || []).join(", ")],
        ["Tags", (r.tag_names || []).join(", ")],
        [null, r.description],
        ["Highlights", (r.highlights || []).join(" · ")],
      ]);
      const detail = compose([
        ["Problem", r.problem],
        ["Solution", r.solution],
        ["Outcome", r.outcome],
      ]);
      const image = storageUrl(r.image) || firstImage(r.slide_images);
      [head, ...splitProse(detail).filter(Boolean)].forEach((body, i) => {
        out.push({
          entity_type: "project",
          entity_id: r.id,
          chunk_index: i,
          title: r.title,
          url: entityUrl("project", r.id),
          chunk_date: r.date || null,
          tags: r.tag_names || [],
          image_url: image,
          body: i === 0 ? body : compose([["Project", r.title], [null, body]]),
        });
      });
    }
    return out;
  },
};
