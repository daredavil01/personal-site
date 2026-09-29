// Newsletter issues (0032): each now_months row is one month. Chunk 0 is the
// letter itself — headline, the month's numbers and the note — and each section
// of the month follows as its own chunk, so "which books in August?" lands on
// the books of August rather than on a wall of everything. Drafts are skipped
// (this runs with the service role, which RLS does not filter) except the
// current month, which /now shows. Plus the /now page's own intro and rituals.

import { issueModel, itemTitle } from "../../src/lib/newsletterIssue.js";

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
  toChunks: ({ months, meta }, {
    compose, clean, splitProse, syntheticId,
  }) => {
    const out = months
      .filter((r) => r.published_at || r.is_current)
      .flatMap((r) => {
        const issue = issueModel({
          id: r.id, slug: r.slug, headline: r.headline, note: r.note, sections: r.sections,
        });
        const published = !!r.published_at;
        const base = {
          entity_type: "now",
          entity_id: r.id,
          title: published ? `Newsletter — ${issue.label}` : `Now — ${issue.label}`,
          url: published ? `/newsletter/${r.slug}` : "/now",
          chunk_date: r.slug ? `${r.slug}-01` : null,
          tags: [],
          image_url: null,
        };
        const stats = issue.stats.map((st) => `${st.value} ${st.label}`).join(", ");
        const letter = splitProse(issue.note || "");
        const chunks = [{
          ...base,
          chunk_index: 0,
          body: compose([
            [published ? "Newsletter issue" : "Now update (this month, in progress)", issue.label],
            ["Headline", r.headline],
            ["The month in numbers", stats],
            [null, letter[0]],
          ]),
        }];
        letter.slice(1).forEach((part) => chunks.push({
          ...base,
          chunk_index: chunks.length,
          body: compose([["Newsletter letter", issue.label], [null, part]]),
        }));
        issue.sections.forEach((section) => chunks.push({
          ...base,
          chunk_index: chunks.length,
          body: compose([
            [section.label, issue.label],
            [null, section.items.map((item) => clean(itemTitle(section.key, item))).join(" · ")],
          ]),
        }));
        if (issue.extraStats) {
          chunks.push({
            ...base,
            chunk_index: chunks.length,
            body: compose([["Stats", issue.label], [null, flatten(issue.extraStats, clean)]]),
          });
        }
        return chunks;
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
