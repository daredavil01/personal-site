#!/usr/bin/env node
/**
 * Read-only extractor:
 *   Substack archive API + WordPress.com API  →  knowledge_base/blog-word-counts.json
 *
 * Collects a word count for every blog post published on either platform, then
 * aggregates them per post, per month, per year, per platform and overall.
 *
 * This script NEVER writes to Supabase. It reads the `blogs` table only to
 * annotate each post with whether the site already tracks it, so it needs no
 * SUPABASE_SERVICE_ROLE_KEY — the publishable key is enough under the table's
 * "public read" RLS policy. If Supabase is unreachable the run still succeeds
 * and every post is marked trackedInBlogsTable: null.
 *
 * Word counts come from two different methods, flagged per post as
 * `wordsSource`, because they are NOT the same methodology:
 *   - substack_api : Substack's own `wordcount` field, taken as-is.
 *   - derived_html : tags stripped from the post body, then whitespace-split.
 *
 * Usage:
 *   1. Nothing to configure — both APIs are public and unauthenticated.
 *      (Optionally set SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY in .env to
 *      override the defaults baked in below.)
 *   2. npm run blogs:wordcount
 *
 * Re-runnable and side-effect free: the only output is the JSON file.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "knowledge_base");
const OUT_FILE = path.join(OUT_DIR, "blog-word-counts.json");

const SUBSTACK_HOST = "https://sankettambare.substack.com";
const WORDPRESS_SITE = "daredavil453624413.wordpress.com";

// Substack ignores large `limit` values (limit=50 returns 23 rows, then 18),
// so page in small slices and de-duplicate on post id instead of trusting the
// page size. Stop on the first empty page.
const SUBSTACK_PAGE = 12;
const WORDPRESS_PAGE = 100;

// Posts are bucketed by month in IST, matching how the site renders dates
// (src/lib/monthDigest.js uses local-time getters for the same reason).
const IST_OFFSET_MINUTES = 5 * 60 + 30;

// --- minimal .env loader (so the script works without --env-file) ----------
function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://xjqbvvurlmbslikiukdm.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_8FUmeJKKuTHvy3JFNPLfnQ_9TY6P2GG";

// --- helpers ---------------------------------------------------------------

async function getJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "personal-site-wordcount" },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** UTC ISO timestamp → { iso, monthKey, label, year } in IST. */
function istParts(timestamp) {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return null;
  const ist = new Date(d.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();
  const pad = (n) => String(n).padStart(2, "0");
  return {
    iso: `${year}-${pad(month + 1)}-${pad(ist.getUTCDate())}`,
    monthKey: `${year}-${pad(month + 1)}`,
    label: `${MONTH_NAMES[month]} ${year}`,
    year: String(year),
  };
}

const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  hellip: "…", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", middot: "·", bull: "•", deg: "°",
};

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

/** Count words in an HTML body: drop script/style, strip tags, split on whitespace. */
function countHtmlWords(html) {
  if (!html) return 0;
  const text = decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
  const words = text.replace(/\s+/g, " ").trim();
  return words ? words.split(" ").length : 0;
}

/** Normalise a post URL for cross-source matching. */
function normaliseUrl(url) {
  if (!url) return null;
  const bare = url.split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();
  // Substack posts are identified by their /p/<slug> segment; the host varies
  // between the custom domain and the *.substack.com one.
  if (bare.includes("/p/")) return `substack:${bare.split("/p/").pop()}`;
  return bare.replace(/^https?:\/\//, "");
}

// --- sources ---------------------------------------------------------------

async function fetchSubstack() {
  const byId = new Map();
  for (let offset = 0; ; offset += SUBSTACK_PAGE) {
    const page = await getJson(
      `${SUBSTACK_HOST}/api/v1/archive?sort=new&limit=${SUBSTACK_PAGE}&offset=${offset}`,
    );
    if (!Array.isArray(page) || page.length === 0) break;
    let fresh = 0;
    for (const post of page) {
      if (!byId.has(post.id)) fresh += 1;
      byId.set(post.id, post);
    }
    // Substack keeps serving the tail once the archive is exhausted; a page
    // that adds nothing new means we're done.
    if (fresh === 0) break;
  }

  return [...byId.values()].map((p) => {
    const when = istParts(p.post_date);
    return {
      title: decodeEntities(p.title || "").trim(),
      date: when ? when.iso : null,
      publishedAt: p.post_date,
      url: p.canonical_url || `${SUBSTACK_HOST}/p/${p.slug}`,
      platform: "Substack",
      words: typeof p.wordcount === "number" ? p.wordcount : null,
      wordsSource: "substack_api",
      section: p.section_name || null,
      tags: (p.postTags || []).map((t) => t.slug),
      audience: p.audience || null,
      type: p.type || null,
    };
  });
}

async function fetchWordPress() {
  const posts = [];
  for (let offset = 0; ; offset += WORDPRESS_PAGE) {
    const page = await getJson(
      `https://public-api.wordpress.com/rest/v1.1/sites/${WORDPRESS_SITE}` +
        `/posts/?number=${WORDPRESS_PAGE}&offset=${offset}&status=publish`,
    );
    const batch = page.posts || [];
    if (batch.length === 0) break;
    posts.push(...batch);
    if (posts.length >= (page.found ?? posts.length)) break;
  }

  // The WordPress.com API exposes no word_count field, so derive it from the
  // rendered body.
  return posts.map((p) => {
    const when = istParts(p.date);
    return {
      title: decodeEntities(p.title || "").trim(),
      date: when ? when.iso : null,
      publishedAt: p.date,
      url: p.URL,
      platform: "Wordpress",
      words: countHtmlWords(p.content),
      wordsSource: "derived_html",
      section: null,
      tags: Object.keys(p.tags || {}),
      audience: null,
      type: p.type || null,
    };
  });
}

async function fetchTrackedBlogs() {
  const url =
    `${SUPABASE_URL}/rest/v1/blogs?select=` +
    "id,blog_title,blog_date,blog_link,blog_platform,language,challenge_id";
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// --- aggregation -----------------------------------------------------------

function groupBy(posts, keyOf) {
  const map = new Map();
  for (const p of posts) {
    const key = keyOf(p);
    if (key == null) continue;
    const bucket = map.get(key) || { posts: 0, words: 0 };
    bucket.posts += 1;
    bucket.words += p.words || 0;
    map.set(key, bucket);
  }
  return map;
}

function buildReport(posts, tracked) {
  const sorted = [...posts].sort((a, b) =>
    String(b.publishedAt).localeCompare(String(a.publishedAt)),
  );

  const totalWords = sorted.reduce((s, p) => s + (p.words || 0), 0);
  const longest = sorted.reduce(
    (best, p) => ((p.words || 0) > (best?.words || 0) ? p : best),
    null,
  );

  const byMonth = [...groupBy(sorted, (p) => p.date?.slice(0, 7))]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      label: istParts(`${month}-01T00:00:00.000Z`).label,
      posts: v.posts,
      words: v.words,
    }));

  const byYear = [...groupBy(sorted, (p) => p.date?.slice(0, 4))]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, v]) => ({ year, posts: v.posts, words: v.words }));

  const byPlatform = [...groupBy(sorted, (p) => p.platform)]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([platform, v]) => ({
      platform,
      posts: v.posts,
      words: v.words,
      method: platform === "Substack" ? "substack_api" : "derived_html",
    }));

  // --- derived statistics (everything the infographic plots) --------------
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const byDayOfWeek = DAY_NAMES.map((day, i) => {
    const hits = sorted.filter((p) => p.date && new Date(`${p.date}T00:00:00Z`).getUTCDay() === i);
    return {
      day,
      posts: hits.length,
      words: hits.reduce((s, p) => s + (p.words || 0), 0),
    };
  });

  const bySection = [...groupBy(sorted, (p) => p.section || "Uncategorised")]
    .map(([section, v]) => ({ section, posts: v.posts, words: v.words }))
    .sort((a, b) => b.words - a.words);

  const tagTotals = new Map();
  for (const p of sorted) {
    for (const tag of p.tags || []) {
      const bucket = tagTotals.get(tag) || { posts: 0, words: 0 };
      bucket.posts += 1;
      bucket.words += p.words || 0;
      tagTotals.set(tag, bucket);
    }
  }
  const byTag = [...tagTotals]
    .map(([tag, v]) => ({ tag, posts: v.posts, words: v.words }))
    .sort((a, b) => b.words - a.words);

  const LENGTH_BUCKETS = [
    { label: "< 250", min: 0, max: 250 },
    { label: "250–499", min: 250, max: 500 },
    { label: "500–999", min: 500, max: 1000 },
    { label: "1,000–1,499", min: 1000, max: 1500 },
    { label: "1,500–1,999", min: 1500, max: 2000 },
    { label: "2,000+", min: 2000, max: Infinity },
  ];
  const byLength = LENGTH_BUCKETS.map((b) => ({
    label: b.label,
    posts: sorted.filter((p) => (p.words || 0) >= b.min && (p.words || 0) < b.max).length,
  }));

  // Running lifetime total at the end of each month that has posts.
  let running = 0;
  let runningPosts = 0;
  const cumulative = byMonth.map((m) => {
    running += m.words;
    runningPosts += m.posts;
    return { month: m.month, label: m.label, words: running, posts: runningPosts };
  });

  const topPosts = sorted
    .filter((p) => p.words)
    .sort((a, b) => b.words - a.words)
    .slice(0, 15)
    .map((p) => ({
      title: p.title,
      date: p.date,
      words: p.words,
      platform: p.platform,
      url: p.url,
    }));

  const busiestMonth = [...byMonth].sort((a, b) => b.words - a.words)[0] || null;
  const busiestYear = [...byYear].sort((a, b) => b.words - a.words)[0] || null;

  // --- month-to-date / year-to-date ---------------------------------------
  // "Now" is the generating machine's clock read in IST, so MTD/YTD line up
  // with the same timezone the posts were bucketed in.
  const now = istParts(new Date().toISOString());
  const thisMonth = now.monthKey;
  const thisYear = now.year;
  const monthDay = now.iso.slice(5); // MM-DD, for the same-period-last-year cut

  const tally = (rows) => ({
    posts: rows.length,
    words: rows.reduce((s, p) => s + (p.words || 0), 0),
  });
  const pctChange = (current, prior) =>
    prior > 0 ? Math.round(((current - prior) / prior) * 1000) / 10 : null;

  const mtdRows = sorted.filter((p) => p.date && p.date.slice(0, 7) === thisMonth);
  const ytdRows = sorted.filter((p) => p.date && p.date.slice(0, 4) === thisYear);

  // Previous calendar month, in full.
  const prevMonthDate = new Date(Date.UTC(Number(thisYear), Number(thisMonth.slice(5, 7)) - 1, 1));
  prevMonthDate.setUTCMonth(prevMonthDate.getUTCMonth() - 1);
  const prevMonthKey = `${prevMonthDate.getUTCFullYear()}-${String(prevMonthDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const prevMonthRows = sorted.filter((p) => p.date && p.date.slice(0, 7) === prevMonthKey);

  // Last year, cut at the same month/day — the only fair YoY comparison.
  const lastYear = String(Number(thisYear) - 1);
  const priorYtdRows = sorted.filter(
    (p) => p.date && p.date.slice(0, 4) === lastYear && p.date.slice(5) <= monthDay,
  );

  const daysIntoMonth = Number(now.iso.slice(8, 10));
  const daysIntoYear =
    Math.floor(
      (Date.UTC(Number(thisYear), Number(thisMonth.slice(5, 7)) - 1, daysIntoMonth) -
        Date.UTC(Number(thisYear), 0, 1)) /
        86400000,
    ) + 1;

  const mtd = tally(mtdRows);
  const ytd = tally(ytdRows);
  const priorYtd = tally(priorYtdRows);
  const prevMonth = tally(prevMonthRows);

  const currentPeriod = {
    asOf: now.iso,
    monthToDate: {
      month: thisMonth,
      label: now.label,
      posts: mtd.posts,
      words: mtd.words,
      daysElapsed: daysIntoMonth,
      wordsPerDay: Math.round(mtd.words / daysIntoMonth),
      previousMonth: { month: prevMonthKey, posts: prevMonth.posts, words: prevMonth.words },
      changeVsPreviousMonth: pctChange(mtd.words, prevMonth.words),
    },
    yearToDate: {
      year: thisYear,
      posts: ytd.posts,
      words: ytd.words,
      daysElapsed: daysIntoYear,
      wordsPerDay: Math.round(ytd.words / daysIntoYear),
      priorYearSamePeriod: {
        year: lastYear,
        posts: priorYtd.posts,
        words: priorYtd.words,
        throughDate: `${lastYear}-${monthDay}`,
      },
      changeVsPriorYear: pctChange(ytd.words, priorYtd.words),
    },
  };

  // --- anomalies (reported, never fixed — this script does not write) ------
  const anomalies = [];

  for (const row of tracked) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.blog_date || "")) {
      anomalies.push({
        kind: "malformed_blog_date",
        blogId: row.id,
        title: row.blog_title,
        value: row.blog_date,
        note: "Not YYYY-MM-DD — breaks month bucketing in the site's blog charts.",
      });
    }
  }

  for (const p of sorted) {
    if (p.words == null) {
      anomalies.push({
        kind: "missing_word_count",
        title: p.title,
        url: p.url,
        platform: p.platform,
      });
    }
    if (!p.trackedInBlogsTable) {
      anomalies.push({
        kind: "untracked_post",
        title: p.title,
        date: p.date,
        words: p.words,
        url: p.url,
        platform: p.platform,
        note: "Published, but has no row in the Supabase `blogs` table.",
      });
    }
  }

  const matchedUrls = new Set(sorted.map((p) => normaliseUrl(p.url)));
  for (const row of tracked) {
    if (!matchedUrls.has(normaliseUrl(row.blog_link))) {
      anomalies.push({
        kind: "unmatched_blogs_row",
        blogId: row.id,
        title: row.blog_title,
        url: row.blog_link,
        note: "Row in `blogs` matches no post on either platform.",
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    sources: {
      substack: `${SUBSTACK_HOST}/api/v1/archive`,
      wordpress: `https://public-api.wordpress.com/rest/v1.1/sites/${WORDPRESS_SITE}/posts/`,
      blogsTable: `${SUPABASE_URL}/rest/v1/blogs`,
    },
    totals: {
      posts: sorted.length,
      words: totalWords,
      averageWords: sorted.length ? Math.round(totalWords / sorted.length) : 0,
      trackedPosts: sorted.filter((p) => p.trackedInBlogsTable).length,
      firstPost: sorted.length ? sorted[sorted.length - 1].date : null,
      latestPost: sorted.length ? sorted[0].date : null,
      longestPost: longest
        ? { title: longest.title, date: longest.date, words: longest.words, url: longest.url }
        : null,
      busiestMonth,
      busiestYear,
      activeMonths: byMonth.length,
    },
    currentPeriod,
    byPlatform,
    byYear,
    byMonth,
    cumulative,
    byDayOfWeek,
    bySection,
    byTag,
    byLength,
    topPosts,
    posts: sorted,
    anomalies,
  };
}

// --- main ------------------------------------------------------------------

async function main() {
  console.log("\nCollecting blog word counts…\n");

  const [substack, wordpress] = await Promise.all([fetchSubstack(), fetchWordPress()]);
  console.log(`  ✓ substack:  ${substack.length} posts`);
  console.log(`  ✓ wordpress: ${wordpress.length} posts`);

  let tracked = [];
  let trackedAvailable = true;
  try {
    tracked = await fetchTrackedBlogs();
    console.log(`  ✓ blogs table: ${tracked.length} rows`);
  } catch (err) {
    trackedAvailable = false;
    console.log(`  • blogs table: unavailable (${err.message}) — continuing without it`);
  }

  const trackedByUrl = new Map(
    tracked.map((row) => [normaliseUrl(row.blog_link), row]),
  );

  const posts = [...substack, ...wordpress].map((p) => {
    const row = trackedByUrl.get(normaliseUrl(p.url));
    return {
      ...p,
      trackedInBlogsTable: trackedAvailable ? Boolean(row) : null,
      blogId: row ? row.id : null,
      challengeId: row ? row.challenge_id : null,
      language: row ? row.language : null,
    };
  });

  const report = buildReport(posts, tracked);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  // --- summary -------------------------------------------------------------
  const n = (v) => v.toLocaleString("en-IN");
  console.log("\nBy year");
  for (const y of report.byYear) {
    console.log(`  ${y.year}  ${String(y.posts).padStart(3)} posts  ${n(y.words).padStart(8)} words`);
  }

  console.log("\nBy platform");
  for (const p of report.byPlatform) {
    console.log(`  ${p.platform.padEnd(10)} ${String(p.posts).padStart(3)} posts  ${n(p.words).padStart(8)} words  (${p.method})`);
  }

  const { monthToDate: m, yearToDate: y } = report.currentPeriod;
  const pct = (v) => (v == null ? "n/a" : `${v > 0 ? "+" : ""}${v}%`);
  console.log("\nTo date");
  console.log(`  MTD (${m.label}): ${n(m.words)} words · ${m.posts} posts · ${pct(m.changeVsPreviousMonth)} vs last month`);
  console.log(`  YTD (${y.year}):      ${n(y.words)} words · ${y.posts} posts · ${pct(y.changeVsPriorYear)} vs ${y.priorYearSamePeriod.year} same period`);

  const { totals } = report;
  console.log("\nOverall");
  console.log(`  posts:        ${n(totals.posts)}`);
  console.log(`  words:        ${n(totals.words)}`);
  console.log(`  average:      ${n(totals.averageWords)} words/post`);
  console.log(`  tracked:      ${n(totals.trackedPosts)} of ${n(totals.posts)} in the blogs table`);
  console.log(`  range:        ${totals.firstPost} → ${totals.latestPost}`);
  if (totals.longestPost) {
    console.log(`  longest:      ${n(totals.longestPost.words)} words — ${totals.longestPost.title}`);
  }

  const byKind = report.anomalies.reduce((acc, a) => {
    acc[a.kind] = (acc[a.kind] || 0) + 1;
    return acc;
  }, {});
  console.log(`\nAnomalies (${report.anomalies.length})`);
  for (const [kind, count] of Object.entries(byKind)) {
    console.log(`  • ${kind}: ${count}`);
  }
  for (const a of report.anomalies.filter((x) => x.kind === "malformed_blog_date")) {
    console.log(`    blogs id ${a.blogId} — ${JSON.stringify(a.value)} (${a.title})`);
  }

  console.log(`\nWrote ${path.relative(ROOT, OUT_FILE)}\n`);
}

main().catch((err) => {
  console.error(`\nWord-count extraction failed: ${err.message}\n`);
  process.exit(1);
});
