import createResource from "./_crud";

// HTML slide decks embedded by URL (0018_presentations.sql). The deck itself is
// hosted elsewhere and rendered in an iframe; the row is only metadata.
const presentations = createResource({
  table: "presentations",
  order: [
    { column: "date", ascending: false, nullsFirst: false },
    { column: "id", ascending: false },
  ],
  tagType: "presentation",
  fromRow: (r) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    url: r.url,
    date: r.date,
    created_at: r.created_at,
    tags: r.tag_names ?? [],
  }),
  toRow: (v) => ({
    title: v.title,
    description: v.description || null,
    url: v.url.trim(),
    // A real date column rejects "" — the empty form value.
    date: v.date || null,
  }),
});

export const getPresentations = presentations.list;
export default presentations;
