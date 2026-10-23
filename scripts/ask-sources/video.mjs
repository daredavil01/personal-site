// Videos — one chunk per YouTube upload (0035): what it is, when, how long,
// which playlists, and the description. The video itself is never fetched:
// captions need the channel owner's OAuth, and a description is what a person
// skimming the channel reads anyway.
//
// Hidden videos are skipped here because the indexer runs with the service
// key, which bypasses the RLS that hides them from everyone else.

const clock = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = String(Math.floor(seconds % 60)).padStart(2, "0");
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}:${s}`;
};

export default {
  type: "video",
  load: async (ctx) => {
    try {
      return await ctx.fetchAll("videos");
    } catch (err) {
      // Before 0035 is applied there is no table: sit the run out rather than
      // fail it, and keep whatever chunks exist.
      throw Object.assign(err, { keep: /videos/.test(err.message || "") });
    }
  },
  toChunks: (rows, { compose, entityUrl }) => rows
    .filter((r) => r.visible !== false)
    .map((r) => {
      const kind = r.kind_override || r.kind || "video";
      return {
        entity_type: "video",
        entity_id: r.id,
        chunk_index: 0,
        title: r.title,
        url: entityUrl("video", r.id),
        chunk_date: r.date || null,
        tags: r.tag_names || [],
        image_url: r.thumbnail_url || null,
        body: compose([
          [kind === "short" ? "YouTube Short" : "YouTube video", r.title],
          ["Published", r.date],
          ["Duration", clock(r.duration_seconds)],
          ["Views", Number.isFinite(r.view_count) ? String(r.view_count) : null],
          ["Playlists", (r.playlists || []).join(", ")],
          ["Tags", (r.tag_names || []).join(", ")],
          // Channel descriptions trail links and credits; the opening is the content.
          [null, (r.description || "").slice(0, 1500)],
          ["Watch", kind === "short"
            ? `https://www.youtube.com/shorts/${r.youtube_id}`
            : `https://www.youtube.com/watch?v=${r.youtube_id}`],
        ]),
      };
    }),
};
