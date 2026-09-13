// The /now page: each month's `sections` blob flattened into readable prose,
// plus the page's own intro, rituals and inspiration from the now_meta row.

const flatten = (value, clean) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : Object.values(item || {}).join(" ")))
      .join(" · ");
  }
  if (value && typeof value === "object") return Object.values(value).join(" · ");
  return clean(value);
};

export default {
  type: "now",
  load: async (ctx) => {
    const months = await ctx.fetchAll("now_months", "*");
    const { data: meta, error } = await ctx.supabase
      .from("now_meta")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(`now_meta: ${error.message}`);
    return { months, meta };
  },
  toChunks: ({ months, meta }, { compose, clean, entityUrl, syntheticId }) => {
    const out = months.map((r) => {
      const flat = Object.entries(r.sections || {})
        .map(([key, value]) => `${key}: ${clean(flatten(value, clean))}`)
        .filter((s) => s.split(": ")[1]);
      return {
        entity_type: "now",
        entity_id: r.id,
        chunk_index: 0,
        title: `Now — ${r.month} ${r.year}`,
        url: entityUrl("now", r.id),
        chunk_date: null,
        tags: [],
        image_url: null,
        body: compose([
          ["Now update", `${r.month} ${r.year}`],
          ["Current", r.is_current ? "yes" : "no"],
          [null, flat.join(" | ")],
        ]),
      };
    });

    if (meta) {
      const inspired = meta.inspired_by && typeof meta.inspired_by === "object"
        ? Object.values(meta.inspired_by).join(" ")
        : meta.inspired_by;
      out.push({
        entity_type: "now",
        entity_id: syntheticId("now_meta"),
        chunk_index: 0,
        title: "Now — about this page",
        url: "/now",
        chunk_date: null,
        tags: [],
        image_url: null,
        body: compose([
          ["Now page", "what it is and the daily rituals behind it"],
          [null, meta.intro_story],
          ["Daily rituals", flatten(meta.daily_rituals, clean)],
          ["Sections", flatten(meta.category_labels, clean)],
          ["Inspired by", inspired],
          ["nownownow", meta.nownownow_url],
        ]),
      });
    }
    return out;
  },
};
