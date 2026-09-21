// The version history — one chunk per version, from the `changelog` table.
//
// This used to reach /ask as part of the "page" source: src/data/changelog.md
// read whole and split into prose chunks, which cut versions in half and put
// two releases in one chunk. A version is the natural unit — "what shipped in
// v18.1.0" is a question, "the third paragraph of the changelog" is not.
//
// The reader-facing summary leads the chunk where there is one, because it is
// the sentence a question is usually phrased like; the engineering entries
// follow it and carry the detail.

export default {
  type: "changelog",
  load: (ctx) => ctx.fetchAll("changelog", "*"),
  toChunks: (rows, { compose }) => rows.map((r) => {
    const changes = Array.isArray(r.changes) ? r.changes : [];
    return {
      entity_type: "changelog",
      entity_id: r.id,
      chunk_index: 0,
      title: `Changelog ${r.version}`,
      // The anchor the public page renders on each version's <section>.
      url: `/changelog#${r.version}`,
      chunk_date: r.released_on || null,
      tags: [],
      image_url: null,
      body: compose([
        ["Version", r.version],
        ["Released", r.released_on],
        [null, r.summary],
        ...changes.map((c) => [
          c.kind || "Changed",
          [c.name, c.body].filter(Boolean).join(" — "),
        ]),
      ]),
    };
  }),
};
