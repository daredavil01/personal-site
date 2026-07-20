import createResource from "./_crud";
import { supabase, toStorageUrl } from "../supabaseClient";
import { monthRange } from "../monthDigest";

// Explicit column list so the generated `search_tsv` tsvector is never shipped
// to the browser.
const COLUMNS = "id, source, source_id, post_type, date, title, text, tags, url, image_url, created_at, updated_at";

const fromRow = (r) => ({
  id: r.id,
  source: r.source,
  sourceId: r.source_id ?? undefined,
  postType: r.post_type,
  date: r.date,
  title: r.title ?? "",
  text: r.text ?? "",
  tags: r.tags ?? [],
  url: r.url ?? undefined,
  imageUrl: toStorageUrl(r.image_url) ?? undefined,
});

const toRow = (v) => ({
  source: v.source || "manual",
  source_id: v.sourceId || null,
  post_type: v.postType || "text",
  date: v.date,
  title: v.title || "",
  text: v.text || "",
  tags: v.tags ?? [],
  url: v.url || null,
  image_url: v.imageUrl || null,
});

// CRUD (create / update / remove) for the admin. The public page and admin list
// use searchMicroblog instead of list() — 1,600+ rows shouldn't be loaded at once.
const microblog = createResource({
  table: "microblog",
  order: [{ column: "date", ascending: false }, { column: "id", ascending: false }],
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
  query = "", tags = [], source = "", type = "", month = "", page = 0, pageSize = 24, sort = "date_desc",
} = {}) {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const ascending = sort === "date_asc";

  let q = supabase.from("microblog").select(COLUMNS, { count: "exact" });

  const trimmed = (query || "").trim();
  if (trimmed) {
    q = q.textSearch("search_tsv", trimmed, { type: "websearch", config: "simple" });
  }
  if (Array.isArray(tags) && tags.length) q = q.contains("tags", tags);
  if (source) q = q.eq("source", source);
  if (type) q = q.eq("post_type", type);
  if (month) {
    const { start, endExclusive } = monthRange(month);
    q = q.gte("date", start).lt("date", endExclusive);
  }

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
  const { data, error } = await supabase
    .from("microblog")
    .select("date")
    .order("date", { ascending: true });
  if (error) throw error;

  const counts = new Map();
  const days = new Set();
  (data ?? []).forEach((row) => {
    if (typeof row.date !== "string" || row.date.length < 10) return;
    const key = row.date.slice(0, 7);
    counts.set(key, (counts.get(key) || 0) + 1);
    days.add(row.date.slice(0, 10));
  });

  let longestStreak = 0;
  days.forEach((day) => {
    const prev = new Date(`${day}T00:00:00Z`);
    prev.setUTCDate(prev.getUTCDate() - 1);
    if (days.has(prev.toISOString().slice(0, 10))) return; // not a streak start
    let run = 1;
    const cursor = new Date(`${day}T00:00:00Z`);
    for (;;) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      if (!days.has(cursor.toISOString().slice(0, 10))) break;
      run += 1;
    }
    if (run > longestStreak) longestStreak = run;
  });

  return {
    monthCounts: [...counts.entries()].map(([key, count]) => ({ key, count })),
    longestStreak,
  };
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

export default microblog;
