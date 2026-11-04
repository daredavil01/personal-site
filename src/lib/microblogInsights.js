// The micro-blog read as data. Pure functions, shared by
// scripts/build-microblog-insights.mjs (which turns every row of the
// `microblog` table into public/data/microblog-insights.json), the
// /micro-blog page (the Overview story and the Stats tab read that file
// through the selectors at the bottom) and microblogInsights.test.js.
//
// Nothing here talks to Supabase. The page never recomputes a number the
// file already holds — it only picks a scope (all years or one) out of it.

// eslint-disable-next-line import/extensions -- Node (scripts/build-microblog-insights.mjs) imports this file too
import { hashString, seededRandom } from "./generativeArt.js";

export const INSIGHTS_VERSION = 1;
export const DAILY_COUNT = 10;
// "Night" for the clock: 9 pm to 2:59 am, when most of the archive was written.
export const NIGHT_HOURS = [21, 22, 23, 0, 1, 2];
// Word-count bins for the length histogram (upper bounds, inclusive).
export const LENGTH_BINS = [
  { label: "1–10", max: 10 },
  { label: "11–25", max: 25 },
  { label: "26–50", max: 50 },
  { label: "51–100", max: 100 },
  { label: "101–200", max: 200 },
  { label: "200+", max: Infinity },
];
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MAX_QUOTE_WORDS = 32;

const DEVA_DIGITS = "०१२३४५६७८९";
const toLatinDigits = (s) => String(s || "").replace(/[०-९]/g, (d) => String(DEVA_DIGITS.indexOf(d)));

// ── Parsing one post ─────────────────────────────────────────────────────────

// The signature the posts carry: "#25:09:2021::11:37:pm", "#४:२:२०२०::१२:४९:am",
// "#1:36_am", "#16: 1:19::12:27:AM". Only a time sitting in a hashtag or after
// "::" counts — "wakes you up at 7:30am" in prose is not a posting time.
const SIGNED_TIME = /(?:::|:\s:|#)\s*:?\s*(\d{1,2})\s*[:_.]\s*(\d{2})\s*[:_]?\s*([ap])\.?m\b/gi;

/** Posting time from the signature: { hour 0–23, minute } or null. The last one wins. */
export function signedTime(text) {
  const t = toLatinDigits(text);
  let last = null;
  SIGNED_TIME.lastIndex = 0;
  for (let m = SIGNED_TIME.exec(t); m; m = SIGNED_TIME.exec(t)) last = m;
  if (!last) return null;
  const h = Number(last[1]);
  const minute = Number(last[2]);
  if (h < 1 || h > 12 || minute > 59) return null;
  return { hour: (h % 12) + (last[3].toLowerCase() === "p" ? 12 : 0), minute };
}

/** The running number a post opens with ("#1114", "#७४६"), or null. */
export function serialOf(text) {
  const m = toLatinDigits(text).trim().match(/^#(\d{1,5})(?![\d:_])/);
  return m ? Number(m[1]) : null;
}

const SIGNATURE_STRIP = /#?\s*[\d०-९]{1,2}\s*[:_]\s*[\d०-९\s]{1,3}[:_]\s*[\d०-९]{2,4}\s*:\s*:?\s*[\d०-९]{1,2}\s*[:_]\s*[\d०-९]{2}\s*[:_]?\s*[ap]\.?m\b/gi;

/** Text without the signature, the opening number, links and the hashtag marks. */
export function cleanPost(text) {
  return String(text || "")
    .replace(SIGNATURE_STRIP, " ")
    .replace(/^\s*#[\d०-९]{1,5}(?![\d०-९:_])/, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/#([\p{L}\p{M}\p{N}_]+)/gu, (_, w) => ` ${w.replace(/_/g, " ")} `)
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

export const wordsOf = (s) => String(s).match(/[\p{L}\p{M}][\p{L}\p{M}\p{N}'’]*/gu) || [];

/** "mr" | "en" | null (no words at all — a bare photo or emoji). By share of letters. */
export function languageOf(text) {
  const s = String(text || "");
  const deva = (s.match(/[ऀ-ॿ]/g) || []).length;
  const latin = (s.match(/[A-Za-z]/g) || []).length;
  if (deva > 0 && deva >= latin * 0.5) return "mr";
  if (latin > 0) return "en";
  return null;
}

export const emojiOf = (text) => String(text || "").match(/\p{Extended_Pictographic}/gu) || [];

/** Inline hashtags written in the text (not the archive's tags), lowercased. */
export function hashtagsOf(text) {
  const t = toLatinDigits(text);
  return (t.match(/#([\p{L}\p{M}][\p{L}\p{M}\p{N}_]{2,})/gu) || [])
    .map((h) => h.slice(1).toLowerCase().replace(/_+$/, ""))
    .filter((h) => !/^[ap]m$/.test(h));
}

/** One row of the table → the fields every summary reads. */
export function parsePost(row) {
  const raw = String(row.text || "");
  const clean = cleanPost(`${row.title || ""}\n${raw}`);
  const time = signedTime(raw);
  const date = String(row.date || "").slice(0, 10);
  return {
    id: row.id,
    date,
    year: date.slice(0, 4),
    weekday: date ? new Date(`${date}T00:00:00Z`).getUTCDay() : null,
    hour: time ? time.hour : null,
    minute: time ? time.minute : null,
    type: row.post_type || row.postType || "text",
    kind: row.post_kind ?? row.postKind ?? null,
    source: row.source || "manual",
    tags: row.tag_names || row.tags || [],
    serial: serialOf(raw),
    lang: languageOf(clean),
    words: wordsOf(clean).length,
    emoji: emojiOf(raw),
    hashtags: hashtagsOf(raw),
    hasImage: Boolean(row.image_url || row.imageUrl),
    clean,
  };
}

// ── Days, streaks, silences ─────────────────────────────────────────────────

const DAY = 86400000;
const dayNum = (d) => Math.round(Date.parse(`${d}T00:00:00Z`) / DAY);
const numDay = (n) => new Date(n * DAY).toISOString().slice(0, 10);

/** Longest run of consecutive posting days and the longest silence between two posts. */
export function runsOf(dates) {
  const days = [...new Set(dates.filter(Boolean))].sort().map(dayNum);
  let streak = null;
  let gap = null;
  let start = 0;
  for (let i = 1; i <= days.length; i += 1) {
    if (i === days.length || days[i] !== days[i - 1] + 1) {
      const len = i - start;
      if (!streak || len > streak.days) streak = { days: len, from: numDay(days[start]), to: numDay(days[i - 1]) };
      start = i;
    }
    if (i < days.length) {
      const g = days[i] - days[i - 1] - 1;
      if (g > 0 && (!gap || g > gap.days)) gap = { days: g, from: numDay(days[i - 1]), to: numDay(days[i]) };
    }
  }
  return { streak, gap };
}

// ── Summaries ────────────────────────────────────────────────────────────────

// eslint-disable-next-line no-param-reassign -- a counter's whole job
const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
const topOf = (counts, n) => Object.entries(counts).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n);

/** Everything the Stats tab draws for one scope (the whole archive or one year). */
export function summarise(posts) {
  const types = {};
  const kinds = {};
  const langs = {};
  const sources = {};
  const tags = {};
  const emoji = {};
  const dayCounts = {};
  const monthCounts = {};
  const hours = Array(24).fill(0);
  const weekdays = Array(7).fill(0);
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  const lengths = Array(LENGTH_BINS.length).fill(0);
  let words = 0;
  let timed = 0;
  let night = 0;
  let longest = null;

  posts.forEach((p) => {
    inc(types, p.type);
    inc(kinds, p.kind || "unclassified");
    inc(langs, p.lang || "none");
    inc(sources, p.source);
    p.tags.forEach((t) => inc(tags, String(t).toLowerCase()));
    p.emoji.forEach((e) => inc(emoji, e));
    inc(dayCounts, p.date);
    inc(monthCounts, p.date.slice(0, 7));
    if (p.weekday != null) weekdays[p.weekday] += 1;
    if (p.hour != null) {
      timed += 1;
      hours[p.hour] += 1;
      if (NIGHT_HOURS.includes(p.hour)) night += 1;
      if (p.weekday != null) grid[p.weekday][p.hour] += 1;
    }
    words += p.words;
    if (p.words > 0) lengths[LENGTH_BINS.findIndex((b) => p.words <= b.max)] += 1;
    if (!longest || p.words > longest.words) longest = { id: p.id, words: p.words, date: p.date };
  });

  const dates = posts.map((p) => p.date).filter(Boolean).sort();
  const { streak, gap } = runsOf(dates);
  const busiestDay = topOf(dayCounts, 1)[0];
  const busiestMonth = topOf(monthCounts, 1)[0];
  const withWords = posts.filter((p) => p.words > 0).map((p) => p.words).sort((a, b) => a - b);
  const peakHour = timed ? hours.indexOf(Math.max(...hours)) : null;

  return {
    posts: posts.length,
    days: Object.keys(dayCounts).length,
    words,
    medianWords: withWords.length ? withWords[Math.floor(withWords.length / 2)] : null,
    first: dates[0] || null,
    last: dates[dates.length - 1] || null,
    types,
    kinds,
    langs,
    sources,
    timed,
    night,
    peakHour,
    hours,
    weekdays,
    grid,
    lengths,
    tags: topOf(tags, 15),
    tagCount: Object.keys(tags).length,
    emoji: topOf(emoji, 12),
    emojiPosts: posts.filter((p) => p.emoji.length).length,
    streak,
    gap,
    busiestDay: busiestDay ? { date: busiestDay[0], posts: busiestDay[1] } : null,
    busiestMonth: busiestMonth ? { key: busiestMonth[0], posts: busiestMonth[1] } : null,
    longest,
  };
}

// ── Story material ──────────────────────────────────────────────────────────

/**
 * Each tag's life across the years: when it arrived, peaked and went quiet.
 * Only tags on at least `min` posts; `rising` and `fading` compare the first
 * half of the archive's years with the second.
 */
export function tagLives(posts, years, { top = 12, min = 15 } = {}) {
  const per = {};
  posts.forEach((p) => p.tags.forEach((t) => {
    const k = String(t).toLowerCase();
    if (!per[k]) per[k] = {};
    inc(per[k], p.year);
  }));
  const half = Math.ceil(years.length / 2);
  const early = new Set(years.slice(0, half));
  const lives = Object.entries(per)
    .map(([tag, byYear]) => {
      const total = Object.values(byYear).reduce((a, b) => a + b, 0);
      const ys = Object.keys(byYear).sort();
      const peak = topOf(byYear, 1)[0];
      const first = Object.entries(byYear).filter(([y]) => early.has(y)).reduce((a, [, n]) => a + n, 0);
      return {
        tag,
        total,
        years: years.map((y) => byYear[y] || 0),
        from: ys[0],
        to: ys[ys.length - 1],
        peak: peak[0],
        lean: total ? (total - first) / total : 0, // share written in the later half
      };
    })
    .filter((l) => l.total >= min)
    .sort((a, b) => b.total - a.total);
  return {
    top: lives.slice(0, top),
    rising: lives.filter((l) => l.lean >= 0.6).sort((a, b) => b.lean - a.lean || b.total - a.total).slice(0, 5)
      .map(({ tag, lean, total }) => ({ tag, lean: Math.round(lean * 100) / 100, total })),
    fading: lives.filter((l) => l.lean <= 0.15).sort((a, b) => a.lean - b.lean || b.total - a.total).slice(0, 5)
      .map(({ tag, lean, total }) => ({ tag, lean: Math.round(lean * 100) / 100, total })),
  };
}

const STOP = {
  en: new Set(("a an and or but of to in on at by for from with as is are was were be been being it its this that "
    + "these those i me my we our you your he she they them their his her us am do does did have has had not no so "
    + "if then than there here what which who whom when where why how all any some such very just also can could "
    + "would should will shall may might must into out up over about after before more most much many own same "
    + "other each every only even too don't it's i'm let's that's i've isn't can't won't one the yeah like get got "
    + "really thing things know want need make made going gonna said say every always never still something "
    + "another stuff well around doing everything sometimes one's good think anything nothing someone else "
    + "much way lot little").split(" ")),
  mr: new Set(("आणि व हा ही हे ते ती त्या या की तर पण मी आम्ही तुम्ही आहे आहेत होते होता होती असे असा अशी एक काही "
    + "कधी कसे कुठे जे जी जो ने ला ना च सुद्धा देखील म्हणून नाही होतो होत केले केला केली मध्ये मधील वर खाली पर्यंत साठी "
    + "तेव्हा जेव्हा आता इथे तिथे सर्व तो तू तुम्ही आपण आपल्या माझ्या माझा माझी माझे तुझ्या तुझा तुझी तुझे त्याच्या "
    + "त्याचा त्याची त्याचे तिच्या असं तसं कसं काय हो होईल होतं आहेस असतो असते असतात करत करतो करते करायला "
    + "नसतो नसते जात जाते जातो येत येतो येते आहोत पण कारण मग तरी असेल अशा बाकी में है और की").split(" ")),
};
const norm = (w) => w.toLowerCase().replace(/’/g, "'");
const isContent = (w, lang) => !STOP[lang].has(w)
  && (lang === "mr" ? /[ऀ-ॿ]/.test(w) && w.length > 2 : /^[a-z']+$/.test(w) && w.length > 3);

/** The words a language leans on, counted once per post: [[word, posts], …]. */
export function keyWords(posts, lang, top = 18) {
  const counts = {};
  posts.filter((p) => p.lang === lang).forEach((p) => {
    new Set(wordsOf(p.clean).map(norm).filter((w) => isContent(w, lang))).forEach((w) => inc(counts, w));
  });
  return topOf(counts, top);
}

/**
 * Recurring two-to-four word phrases, counted once per post; a phrase is kept
 * only when it recurs in `minPosts` posts and is not wholly inside a longer
 * kept phrase that covers most of its posts.
 */
export function recurringPhrases(posts, lang, { sizes = [4, 3, 2], minPosts = 6, top = 12 } = {}) {
  const seen = new Map();
  posts.filter((p) => p.lang === lang).forEach((p) => {
    const keys = new Set();
    p.clean.split(/[\n.!?…।,;:"“”()]+/).forEach((line) => {
      const ws = wordsOf(line).map(norm);
      sizes.forEach((n) => {
        for (let i = 0; i + n <= ws.length; i += 1) {
          const g = ws.slice(i, i + n);
          if (STOP[lang].has(g[0]) || STOP[lang].has(g[n - 1])) continue; // eslint-disable-line no-continue
          if (g.filter((w) => isContent(w, lang)).length < Math.min(2, n)) continue; // eslint-disable-line no-continue
          if (new Set(g).size < n) continue; // eslint-disable-line no-continue -- "उवाच खंडेराव उवाच" is two signatures, not a phrase
          keys.add(g.join(" "));
        }
      });
    });
    keys.forEach((k) => seen.set(k, (seen.get(k) || 0) + 1));
  });
  const kept = [];
  [...seen.entries()]
    .filter(([, n]) => n >= minPosts)
    .sort((a, b) => b[0].split(" ").length - a[0].split(" ").length || b[1] - a[1])
    .forEach(([p, n]) => {
      if (!kept.some(([k, kn]) => ` ${k} `.includes(` ${p} `) && kn >= n * 0.8)) kept.push([p, n]);
    });
  return kept.sort((a, b) => b[1] - a[1]).slice(0, top);
}

/** The first `max` words of a post's clean text, as one line. */
export function quoteOf(clean, max = MAX_QUOTE_WORDS) {
  const flat = String(clean || "").replace(/\s*\n\s*/g, " / ").trim();
  const ws = flat.split(/\s+/);
  return ws.length <= max ? flat : `${ws.slice(0, max).join(" ")}…`;
}

/** How likely a post is to be worth putting in front of a reader today (0–1-ish). */
export function pickScore(p) {
  if (p.kind && p.kind !== "own") return 0;
  if (p.words < 8) return 0;
  const len = Math.min(1, Math.log(p.words) / Math.log(120));
  return Math.round((0.55 * len + 0.15 * Math.min(1, p.tags.length / 3) + (p.type === "text" ? 0.15 : 0.05)
    + (p.serial ? 0.05 : 0) + (p.hasImage ? 0.1 : 0)) * 1000) / 1000;
}

// ── Building the file ───────────────────────────────────────────────────────

/** Every row of the table → the committed insights document. */
export function buildInsights(rows, { generatedAt = new Date().toISOString(), poolSize = 360 } = {}) {
  const posts = rows.map(parsePost).filter((p) => p.date).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const years = [...new Set(posts.map((p) => p.year))].sort();
  const byId = new Map(posts.map((p) => [p.id, p]));
  const all = summarise(posts);

  const perYear = {};
  years.forEach((y) => { perYear[y] = summarise(posts.filter((p) => p.year === y)); });

  // A typo'd number ("#11146" for #1146) would claim the series ran ten times
  // longer: drop any top value more than 20% above the next one down.
  const serials = posts.map((p) => p.serial).filter((n) => n != null).sort((a, b) => b - a);
  while (serials.length > 1 && serials[0] > serials[1] * 1.2) serials.shift();
  const hashtagCounts = {};
  posts.forEach((p) => new Set(p.hashtags).forEach((h) => inc(hashtagCounts, h)));

  const moment = (p, why) => (p ? {
    id: p.id, date: p.date, why, words: p.words, lang: p.lang, quote: quoteOf(p.clean),
  } : null);
  const firstOwn = posts.find((p) => p.words >= 8);
  const latest = [...posts].reverse().find((p) => p.words >= 8);
  const longestPost = all.longest ? byId.get(all.longest.id) : null;
  const latestHour = posts.filter((p) => p.hour != null && p.hour < 5 && p.words >= 8)
    .sort((a, b) => b.hour * 60 + b.minute - (a.hour * 60 + a.minute))[0];

  // The pool the daily ten are drawn from: own words, scored, a spread of years.
  const pool = posts
    .map((p) => ({ p, s: pickScore(p) }))
    .filter(({ s }) => s > 0.3)
    .sort((a, b) => b.s - a.s || b.p.id - a.p.id)
    .slice(0, poolSize)
    .map(({ p, s }) => [p.id, Number(p.year), p.lang === "mr" ? 1 : 0, Math.round(s * 100)]);

  return {
    version: INSIGHTS_VERSION,
    generatedAt,
    years,
    all,
    perYear,
    days: Object.fromEntries(Object.entries(posts.reduce((acc, p) => { inc(acc, p.date); return acc; }, {}))),
    tagLives: tagLives(posts, years),
    words: { en: keyWords(posts, "en"), mr: keyWords(posts, "mr") },
    phrases: { en: recurringPhrases(posts, "en"), mr: recurringPhrases(posts, "mr") },
    hashtags: topOf(hashtagCounts, 12),
    serial: serials.length ? { count: serials.length, max: serials[0] } : null,
    moments: [
      moment(firstOwn, "first"),
      moment(longestPost, "longest"),
      moment(latestHour, "latest-hour"),
      moment(latest, "newest"),
    ].filter(Boolean),
    // Every timed post as a star: [days since the first post, minute of the day], flat.
    sky: {
      start: posts[0] ? posts[0].date : null,
      points: posts.filter((p) => p.hour != null)
        .flatMap((p) => [dayNum(p.date) - dayNum(posts[0].date), p.hour * 60 + p.minute]),
    },
    pool,
  };
}

// ── Reading the file (the page) ─────────────────────────────────────────────

/** The summary for "all" or one year, or null. */
export const scopeOf = (doc, year) => (!doc ? null : (year && doc.perYear[year]) || doc.all);

export const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : null);

export const hourLabel = (h) => {
  if (h == null) return "";
  const suffix = h < 12 ? "am" : "pm";
  return `${h % 12 === 0 ? 12 : h % 12} ${suffix}`;
};

/** Posts per month for one year (12 values) or every month of the archive: [{ key, count }]. */
export function monthSeries(doc, year) {
  if (!doc) return [];
  const counts = {};
  Object.entries(doc.days).forEach(([d, n]) => inc(counts, d.slice(0, 7), n));
  if (year) {
    return Array.from({ length: 12 }, (_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, "0")}`;
      return { key, count: counts[key] || 0 };
    });
  }
  const first = doc.years[0];
  const last = doc.years[doc.years.length - 1];
  const out = [];
  for (let y = Number(first); y <= Number(last); y += 1) {
    for (let m = 1; m <= 12; m += 1) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      out.push({ key, count: counts[key] || 0 });
    }
  }
  // Trim the empty months before the first post and after the last.
  const firstKey = doc.all.first.slice(0, 7);
  const lastKey = doc.all.last.slice(0, 7);
  return out.filter((m) => m.key >= firstKey && m.key <= lastKey);
}

/** One row per year for the comparison table. */
export function yearTable(doc) {
  if (!doc) return [];
  return doc.years.map((y) => {
    const s = doc.perYear[y];
    const worded = s.posts - (s.langs.none || 0);
    return {
      year: y,
      posts: s.posts,
      days: s.days,
      words: s.words,
      medianWords: s.medianWords,
      marathi: pct(s.langs.mr || 0, worded),
      night: s.timed >= 10 ? pct(s.night, s.timed) : null,
      topTag: s.tags[0] ? s.tags[0][0] : null,
    };
  });
}

/** Local calendar day as YYYY-MM-DD — the seed of the daily ten. */
export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Today's ten: the same for every reader on a given day and different the
 * next. One post from each year first (so the ten span the archive), then the
 * rest by score, then a nudge so neither language has fewer than three.
 * `pool` rows are [id, year, isMarathi, score].
 */
export function dailyPicks(pool, day, count = DAILY_COUNT) {
  if (!pool || !pool.length) return [];
  const rand = seededRandom(hashString(`microblog|${day}`));
  const weighted = (rows) => {
    const total = rows.reduce((a, r) => a + r[3] + 10, 0);
    let x = rand() * total;
    return rows.find((r) => { x -= r[3] + 10; return x <= 0; }) || rows[rows.length - 1];
  };
  const chosen = new Map();
  const take = (r) => { if (r && chosen.size < count) chosen.set(r[0], r); };
  const years = [...new Set(pool.map((r) => r[1]))].sort();
  // Shuffle the years so a short day (fewer slots than years) is not always the oldest.
  for (let i = years.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [years[i], years[j]] = [years[j], years[i]];
  }
  years.forEach((y) => take(weighted(pool.filter((r) => r[1] === y))));
  while (chosen.size < Math.min(count, pool.length)) take(weighted(pool.filter((r) => !chosen.has(r[0]))));

  // Language floor: swap a post of the larger language for one of the smaller,
  // from the same year when there is one, so the swap never loses a year.
  [1, 0].forEach((lang) => {
    const floor = Math.min(3, pool.filter((r) => r[2] === lang).length);
    let have = [...chosen.values()].filter((r) => r[2] === lang).length;
    while (have < floor) {
      const others = [...chosen.values()].filter((r) => r[2] !== lang).sort((a, b) => a[3] - b[3]);
      const free = pool.filter((r) => r[2] === lang && !chosen.has(r[0]));
      const yearCount = (y) => [...chosen.values()].filter((r) => r[1] === y).length;
      const out = others.find((r) => free.some((f) => f[1] === r[1]))
        || others.find((r) => yearCount(r[1]) > 1)
        || others[0];
      const sameYear = out ? free.filter((f) => f[1] === out[1]) : [];
      const inn = free.length ? weighted(sameYear.length ? sameYear : free) : null;
      if (!out || !inn) break;
      chosen.delete(out[0]);
      chosen.set(inn[0], inn);
      have += 1;
    }
  });
  // Newest first reads like a feed, but a seeded order keeps the ten feeling picked.
  return [...chosen.values()].sort((a, b) => b[1] - a[1] || b[0] - a[0]).map((r) => r[0]);
}

/**
 * The Overview's sentences, written from the numbers. Each returns null when
 * the data cannot support it, and the chapter is then left out.
 */
export function storyLines(doc) {
  if (!doc) return {};
  const { all, perYear, years } = doc;
  const yearRows = years.map((y) => [y, perYear[y].posts]);
  const peak = [...yearRows].sort((a, b) => b[1] - a[1])[0];
  const quiet = [...yearRows].sort((a, b) => a[1] - b[1])[0];
  const share = (y, lang) => pct(perYear[y].langs[lang] || 0, perYear[y].posts - (perYear[y].langs.none || 0));
  const firstY = years[0];
  const lastY = years[years.length - 1];
  const nightShare = pct(all.night, all.timed);
  return {
    clock: all.timed >= 30 && nightShare != null
      ? `${nightShare}% of the timed posts were written between 9 pm and 3 am. The busiest hour is ${hourLabel(all.peakHour)}.`
      : null,
    years: peak && quiet && peak[0] !== quiet[0]
      ? `${peak[0]} was the loudest year, with ${peak[1].toLocaleString("en-IN")} posts. ${quiet[0]} was the quietest, with ${quiet[1].toLocaleString("en-IN")}.`
      : null,
    language: years.length > 1 && share(firstY, "mr") != null && share(lastY, "mr") != null
      ? `Marathi was ${share(firstY, "mr")}% of the posts in ${firstY} and ${share(lastY, "mr")}% in ${lastY}.`
      : null,
    silence: all.gap && all.gap.days >= 14
      ? `The longest silence lasted ${all.gap.days.toLocaleString("en-IN")} days. The longest run of daily posts lasted ${all.streak ? all.streak.days : 1}.`
      : null,
  };
}
