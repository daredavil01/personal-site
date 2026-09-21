import createResource from "./_crud";
import { supabase, toStorageUrl } from "../supabaseClient";
import { microblogActivity } from "../siteStats";
import { monthRange } from "../monthDigest";

// Explicit column list so the generated `search_tsv` tsvector is never shipped
// to the browser. `tag_names` is the computed field from 0003_centralized_tags.
const COLUMNS = "id, source, source_id, post_type, post_kind, post_kind_confidence, date, title, text, tag_names, url, image_url, created_at, updated_at";

const fromRow = (r) => ({
  id: r.id,
  source: r.source,
  sourceId: r.source_id ?? undefined,
  postType: r.post_type,
  // null means "not classified yet", which is not one of the four verdicts.
  postKind: r.post_kind ?? null,
  postKindConfidence: r.post_kind_confidence ?? null,
  date: r.date,
  title: r.title ?? "",
  text: r.text ?? "",
  tags: r.tag_names ?? [],
  url: r.url ?? undefined,
  imageUrl: toStorageUrl(r.image_url) ?? undefined,
});

const toRow = (v) => ({
  source: v.source || "manual",
  source_id: v.sourceId || null,
  post_type: v.postType || "text",
  post_kind: v.postKind || null,
  date: v.date,
  title: v.title || "",
  text: v.text || "",
  url: v.url || null,
  image_url: v.imageUrl || null,
});

// CRUD (create / update / remove) for the admin. The public page and admin list
// use searchMicroblog instead of list() — 1,600+ rows shouldn't be loaded at once.
const microblog = createResource({
  table: "microblog",
  order: [{ column: "date", ascending: false }, { column: "id", ascending: false }],
  tagType: "microblog",
  fromRow,
  toRow,
});

/**
 * Server-side, paginated full-text search over the microblog table.
 * sort: "date_desc" (default) | "date_asc" | "random" (random is handled
 * client-side — this function always fetches in date order).
 * month: optional "YYYY-MM" key restricting results to that month (the
 * river strip's click-to-filter).
 * @returns {Promise<{ rows: object[], count: number }>}
 */
export async function searchMicroblog({
  query = "", tags = [], source = "", type = "", kind = "", month = "", page = 0, pageSize = 24, sort = "date_desc",
} = {}) {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const ascending = sort === "date_asc";

  let q = supabase.from("microblog").select(COLUMNS, { count: "exact" });

  const trimmed = (query || "").trim();
  if (trimmed) {
    q = q.textSearch("search_tsv", trimmed, { type: "websearch", config: "simple" });
  }

  // Tags, source, type and month combine with OR, matching /books. Over 1,600
  // posts the axes barely intersect — picking a tag and then a month almost
  // always emptied the page, and tags used to AND *within* the axis too
  // (`contains` = every tag), so two tags were nearly always zero results.
  // Now each control adds posts. Free-text search still narrows.
  const clauses = [];
  if (Array.isArray(tags) && tags.length) {
    // Quoted so a tag containing a comma or space can't be read as a separator.
    clauses.push(`tag_names.ov.{${tags.map((t) => `"${String(t).replace(/"/g, '\\"')}"`).join(",")}}`);
  }
  if (source) clauses.push(`source.eq.${source}`);
  if (type) clauses.push(`post_type.eq.${type}`);
  if (month) {
    const { start, endExclusive } = monthRange(month);
    clauses.push(`and(date.gte.${start},date.lt.${endExclusive})`);
  }
  if (clauses.length) q = q.or(clauses.join(","));

  // kind NARROWS, where the axes above widen. "Only his own thoughts" is a lens
  // over whatever else is selected; OR-ing it would put the reblogs straight
  // back. Unclassified rows are excluded by an explicit kind on purpose — the
  // reader asked for posts known to be of that kind.
  if (kind) q = q.eq("post_kind", kind);

  q = q
    .order("date", { ascending })
    .order("id", { ascending })
    .range(from, to);

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data ?? []).map(fromRow), count: count ?? 0 };
}

/** Fetch a single post by numeric id. Throws if not found. */
export async function getMicroblogPost(id) {
  const { data, error } = await supabase
    .from("microblog")
    .select(COLUMNS)
    .eq("id", Number(id))
    .single();
  if (error) throw error;
  return fromRow(data);
}

/** Lightweight total post count (no rows shipped) for summary widgets. */
export async function getMicroblogCount() {
  const { count, error } = await supabase
    .from("microblog")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/** Distinct tags with post counts, for the filter UI. */
export async function getMicroblogTagFacets() {
  const { data, error } = await supabase.rpc("microblog_tag_facets");
  if (error) throw error;
  return (data ?? []).map((r) => ({ tag: r.tag, count: Number(r.count) }));
}

/**
 * Tag counts per "YYYY-MM" month, for the river strip's bar tints.
 * @returns {Promise<Map<string, {tag: string, count: number}[]>>} each list most-used first
 */
export async function getMicroblogMonthTags() {
  const { data, error } = await supabase.rpc("microblog_month_tags");
  if (error) throw error;
  const byMonth = new Map();
  (data ?? []).forEach(({ month, tag, count }) => {
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month).push({ tag, count: Number(count) });
  });
  return byMonth;
}

/**
 * Aggregate stats for the stats tab: total count, date range, type breakdown,
 * source breakdown. Tag facets come from the component's existing facets state.
 */
export async function getMicroblogStats() {
  const [totalRes, minDateRes, maxDateRes, textRes, quoteRes, photoRes, tumblrRes, manualRes] = await Promise.all([
    supabase.from("microblog").select("id", { count: "exact", head: true }),
    supabase.from("microblog").select("date").order("date", { ascending: true }).limit(1),
    supabase.from("microblog").select("date").order("date", { ascending: false }).limit(1),
    supabase.from("microblog").select("id", { count: "exact", head: true }).eq("post_type", "text"),
    supabase.from("microblog").select("id", { count: "exact", head: true }).eq("post_type", "quote"),
    supabase.from("microblog").select("id", { count: "exact", head: true }).eq("post_type", "photo"),
    supabase.from("microblog").select("id", { count: "exact", head: true }).eq("source", "tumblr"),
    supabase.from("microblog").select("id", { count: "exact", head: true }).eq("source", "manual"),
  ]);
  return {
    total: totalRes.count ?? 0,
    minDate: minDateRes.data?.[0]?.date ?? null,
    maxDate: maxDateRes.data?.[0]?.date ?? null,
    byType: { text: textRes.count ?? 0, quote: quoteRes.count ?? 0, photo: photoRes.count ?? 0 },
    bySource: { tumblr: tumblrRes.count ?? 0, manual: manualRes.count ?? 0 },
  };
}

/**
 * Distinct "YYYY-MM" month keys that contain at least one micro-post, derived
 * from the post `date`. Ships only the date column (~1,600 short strings) so the
 * Monthly Digest can union microblog months into its dropdown without loading rows.
 * @returns {Promise<string[]>} sorted descending (newest first)
 */
export async function getMicroblogMonths() {
  const { data, error } = await supabase
    .from("microblog")
    .select("date")
    .order("date", { ascending: false });
  if (error) throw error;
  const keys = new Set();
  (data ?? []).forEach((row) => {
    if (typeof row.date === "string" && row.date.length >= 7) {
      keys.add(row.date.slice(0, 7));
    }
  });
  return [...keys].sort().reverse();
}

/**
 * The archive's pulse, from one lightweight all-dates fetch (same payload as
 * getMicroblogMonths): posts-per-month for the river strip, plus the longest
 * run of consecutive posting days for the stats highlights.
 * @returns {Promise<{ monthCounts: {key: string, count: number}[], longestStreak: number }>}
 *          monthCounts sorted ascending (oldest first)
 */
export async function getMicroblogActivity() {
  // Paged: an unbounded select stops at PostgREST's 1000-row cap, which
  // silently dropped every post after the first thousand.
  const dates = [];
  for (let from = 0; ; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase
      .from("microblog")
      .select("date")
      .order("date", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    dates.push(...(data ?? []).map((row) => row.date));
    if (!data || data.length < 1000) break;
  }
  // Same computation as /api/stats and the /ask indexer (src/lib/siteStats.js).
  return microblogActivity(dates);
}

/**
 * Micro-posts whose `date` falls within the given "YYYY-MM" month, newest first,
 * capped at `limit`. `count` is the true total for the month (drives "View all").
 * Efficient: microblog_date_idx covers `date desc`.
 * @returns {Promise<{ rows: object[], count: number }>}
 */
export async function getMicroblogByMonth(key, limit = 6) {
  const { start, endExclusive } = monthRange(key);
  const { data, error, count } = await supabase
    .from("microblog")
    .select(COLUMNS, { count: "exact" })
    .gte("date", start)
    .lt("date", endExclusive)
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return { rows: (data ?? []).map(fromRow), count: count ?? 0 };
}

/**
 * "On this day" — but semantic, not calendrical.
 *
 * The seed is the most recent post written on today's date in an earlier year
 * (microblog_on_this_day, 0025 — PostgREST cannot filter on `extract(day from
 * date)`). The echoes are that post's nearest neighbours in the /ask index,
 * which is what makes this "what you were thinking about the last time you
 * wrote about this" rather than "a year ago today".
 *
 * No model call: related_content_ranked (0013/0014) reads vectors that
 * `npm run ask:index` already wrote. Returns null when today's date is blank
 * in the archive, so the caller can render nothing.
 */
export async function getMicroblogOnThisDay(echoCount = 8) {
  const now = new Date();
  const { data: seeds, error } = await supabase.rpc("microblog_on_this_day", {
    p_month: now.getMonth() + 1,
    p_day: now.getDate(),
    p_limit: 1,
  });
  if (error) throw error;

  const seed = (seeds || [])[0];
  if (!seed) return null;

  const { data: echoes } = await supabase.rpc("related_content_ranked", {
    p_type: "microblog",
    p_id: seed.id,
    p_limit: echoCount,
    p_types: ["microblog"],
  });

  return {
    seed: {
      id: seed.id,
      date: seed.date,
      title: seed.title ?? "",
      text: seed.text ?? "",
      postType: seed.post_type,
      url: seed.url ?? undefined,
      imageUrl: toStorageUrl(seed.image_url) ?? undefined,
    },
    echoes: (echoes || []).map((e) => ({
      id: e.entity_id,
      title: e.title ?? "",
      date: e.chunk_date,
      similarity: e.similarity,
    })),
  };
}

export default microblog;
