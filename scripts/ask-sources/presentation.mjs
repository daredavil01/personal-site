// Presentations — a metadata chunk per deck, plus the deck's own slide text.
//
// Decks are HTML pages hosted elsewhere, so the text is fetched at index time
// and stripped of markup. A deck that can't be fetched still gets its metadata
// chunk; chunk hashing means an unchanged deck is never re-embedded.

const stripHtml = (html) => html
  .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, "\"")
  .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
  .replace(/&mdash;/g, "—")
  .replace(/&#?\w+;/g, " ")
  .replace(/\s+/g, " ")
  .trim();

async function deckText(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    return res.ok ? stripHtml(await res.text()) : "";
  } catch {
    return "";
  }
}

export default {
  type: "presentation",
  load: async (ctx) => {
    const rows = await ctx.fetchAll("presentations");
    return Promise.all(rows.map(async (r) => ({ ...r, text: await deckText(r.url) })));
  },
  toChunks: (rows, { compose, splitProse, entityUrl }) => rows.flatMap((r) => {
    const base = {
      entity_type: "presentation",
      entity_id: r.id,
      title: r.title,
      url: entityUrl("presentation", r.id),
      chunk_date: r.date || null,
      tags: r.tag_names || [],
      image_url: null,
    };
    const parts = r.text ? splitProse(r.text) : [];
    return [
      {
        ...base,
        chunk_index: 0,
        body: compose([
          ["Presentation", r.title],
          ["Date", r.date],
          ["Tags", (r.tag_names || []).join(", ")],
          [null, r.description],
          ["Deck", r.url],
        ]),
      },
      ...parts.map((part, i) => ({
        ...base,
        chunk_index: i + 1,
        body: compose([
          ["Presentation", r.title],
          ["Slides", `${i + 1} of ${parts.length}`],
          [null, part],
        ]),
      })),
    ];
  }),
};
