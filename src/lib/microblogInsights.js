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
    .replace(/#[\d०-९]{1,5}(?![\d०-९:_/])/g, " ")
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
export const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : null);
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
  // Lines with no words (an emoji alone, a number) are left out of a quote.
  const flat = String(clean || "").split("\n").filter((l) => wordsOf(l).length).join(" / ")
    .trim();
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

// ── Meaning: moods and the map (from the /ask embeddings) ───────────────────

// Five tones, each defined by the posts I tagged with it — not by a sentiment
// model. Every post with a vector is given the tone whose tagged posts it sits
// closest to. A tone with too few tagged posts is left out.
export const MOODS = [
  { id: "calm", label: "Calm", tags: ["calmness", "स्थितप्रज्ञ"] },
  { id: "reflective", label: "Reflective", tags: ["philosophy", "psychology"] },
  { id: "striving", label: "Striving", tags: ["personaldevelopment", "choices"] },
  { id: "warm", label: "Warm", tags: ["love"] },
  { id: "restless", label: "Restless", tags: ["desperate me"] },
];
export const MIN_MOOD_SEEDS = 12;
// Tags too broad, or about the language/account rather than a subject, to name a region.
export const REGION_SKIP = new Set(["life", "marathi", "sanky", "latepost", "daredavil01", "self-reflection"]);

const dot = (a, b) => {
  let d = 0;
  for (let i = 0; i < a.length; i += 1) d += a[i] * b[i];
  return d;
};
const unit = (v) => {
  const n = Math.sqrt(dot(v, v)) || 1;
  return v.map((x) => x / n);
};
const quarterOf = (date) => `${date.slice(0, 4)}-Q${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}`;

/**
 * Each post's tone. `vectors` is a Map of post id → unit vector. Centroids are
 * leave-one-out for the tagged posts themselves (a post is not compared with a
 * centroid it helped make), and similarities are z-scored per tone so a tight
 * cluster does not win every post. `agreement` is the share of tagged posts
 * that land back in their own tone — the method's own check.
 * @returns {{ moods, byId: Map<number, string>, agreement: number|null }}
 */
export function assignMoods(posts, vectors, moods = MOODS, minSeeds = MIN_MOOD_SEEDS) {
  const withVec = posts.filter((p) => vectors.has(p.id));
  const seeds = moods.map((m) => withVec.filter((p) => p.tags.some((t) => m.tags.includes(String(t).toLowerCase()))))
    .map((list, i) => ({ mood: moods[i], list }))
    .filter(({ list }) => list.length >= minSeeds);
  if (seeds.length < 2) return { moods: [], byId: new Map(), agreement: null };
  const dim = vectors.get(withVec[0].id).length;
  const sums = seeds.map(({ list }) => list.reduce((acc, p) => {
    const v = vectors.get(p.id);
    for (let i = 0; i < dim; i += 1) acc[i] += v[i];
    return acc;
  }, new Array(dim).fill(0)));
  const isSeed = seeds.map(({ list }) => new Set(list.map((p) => p.id)));

  const sims = withVec.map((p) => {
    const v = vectors.get(p.id);
    return seeds.map((_, m) => {
      const c = isSeed[m].has(p.id) ? sums[m].map((x, i) => x - v[i]) : sums[m];
      return dot(v, unit(c));
    });
  });
  const stats = seeds.map((_, m) => {
    const col = sims.map((r) => r[m]);
    const mean = col.reduce((a, b) => a + b, 0) / col.length;
    const sd = Math.sqrt(col.reduce((a, b) => a + (b - mean) ** 2, 0) / col.length) || 1;
    return { mean, sd };
  });
  const byId = new Map();
  withVec.forEach((p, i) => {
    let best = 0;
    let bestZ = -Infinity;
    sims[i].forEach((sim, m) => {
      const z = (sim - stats[m].mean) / stats[m].sd;
      if (z > bestZ) { bestZ = z; best = m; }
    });
    byId.set(p.id, seeds[best].mood.id);
  });
  let hits = 0;
  let total = 0;
  seeds.forEach(({ mood, list }) => list.forEach((p) => {
    total += 1;
    if (byId.get(p.id) === mood.id) hits += 1;
  }));
  return {
    moods: seeds.map(({ mood, list }) => ({ id: mood.id, label: mood.label, tags: mood.tags, seeds: list.length })),
    byId,
    agreement: total ? Math.round((hits / total) * 100) / 100 : null,
  };
}

/** Tone counts per quarter and per year, in the order of `moods`. */
export function moodSeries(posts, byId, moods) {
  const ids = moods.map((m) => m.id);
  const quarters = {};
  const years = {};
  const totals = new Array(ids.length).fill(0);
  posts.forEach((p) => {
    const m = byId.get(p.id);
    if (!m) return;
    const i = ids.indexOf(m);
    const q = quarterOf(p.date);
    if (!quarters[q]) quarters[q] = new Array(ids.length).fill(0);
    if (!years[p.year]) years[p.year] = new Array(ids.length).fill(0);
    quarters[q][i] += 1;
    years[p.year][i] += 1;
    totals[i] += 1;
  });
  return {
    quarters: Object.keys(quarters).sort().map((key) => ({ key, counts: quarters[key] })),
    years,
    totals,
  };
}

/** Seeded k-means++ over 2D points. Returns each point's cluster and the centres. */
export function kmeans(points, k, rand) {
  if (points.length <= k) return { assign: points.map((_, i) => i), centres: points.map((p) => [...p]) };
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const centres = [points[Math.floor(rand() * points.length)]];
  while (centres.length < k) {
    const w = points.map((p) => Math.min(...centres.map((c) => d2(p, c))));
    let r = rand() * w.reduce((a, b) => a + b, 0);
    const idx = w.findIndex((x) => { r -= x; return r <= 0; });
    centres.push(points[idx < 0 ? points.length - 1 : idx]);
  }
  const nearestOf = (cs) => points.map((p) => cs.reduce((best, c, i) => (d2(p, c) < d2(p, cs[best]) ? i : best), 0));
  const meansOf = (cs, assign) => cs.map((c, i) => {
    const mine = points.filter((_, j) => assign[j] === i);
    return mine.length ? [mine.reduce((a, p) => a + p[0], 0) / mine.length, mine.reduce((a, p) => a + p[1], 0) / mine.length] : c;
  });
  let cs = centres.map((c) => [...c]);
  let assign = nearestOf(cs);
  for (let it = 0; it < 60; it += 1) {
    cs = meansOf(cs, assign);
    const next = nearestOf(cs);
    const prev = assign;
    if (next.every((a, i) => a === prev[i])) break;
    assign = next;
  }
  return { assign, centres: cs };
}

/**
 * Names for each region: the tags unusually common in it (lift over the whole
 * archive, weighted by how many of its posts carry them), never a tag in
 * REGION_SKIP. A region with no distinctive tag gets an empty list.
 */
export function nameRegions(posts, assign, k, { top = 2, minCount = 4 } = {}) {
  const overall = {};
  posts.forEach((p) => p.tags.forEach((t) => inc(overall, String(t).toLowerCase())));
  return Array.from({ length: k }, (unused, r) => {
    const mine = posts.filter((p, i) => assign[i] === r);
    const counts = {};
    mine.forEach((p) => p.tags.forEach((t) => inc(counts, String(t).toLowerCase())));
    return Object.entries(counts)
      .filter(([t, c]) => c >= minCount && !REGION_SKIP.has(t))
      .map(([t, c]) => [t, c * Math.log(((c / mine.length) / (overall[t] / posts.length)) || 1)])
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .map(([t]) => t);
  });
}

/** For each region, the words it uses far more than the archive does (a name when no tag is distinctive). */
export function regionWords(posts, assign, k, { top = 3, minPosts = 6 } = {}) {
  const wordSets = posts.map((p) => (p.lang ? new Set(wordsOf(p.clean).map(norm).filter((w) => isContent(w, p.lang))) : new Set()));
  const overall = {};
  wordSets.forEach((ws) => ws.forEach((w) => inc(overall, w)));
  return Array.from({ length: k }, (unused, r) => {
    const idx = posts.map((p, i) => i).filter((i) => assign[i] === r);
    const counts = {};
    idx.forEach((i) => wordSets[i].forEach((w) => inc(counts, w)));
    return Object.entries(counts)
      .filter(([, c]) => c >= minPosts)
      .map(([w, c]) => [w, c * Math.log((c / idx.length) / (overall[w] / posts.length))])
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .map(([w]) => w);
  });
}

/** The short name drawn on the map itself: the lead tag, else two words. */
export const regionShortName = (r) => {
  if (r.tags && r.tags.length) return `#${r.tags[0]}`;
  if (r.words && r.words.length) return r.words.slice(0, 2).join(" · ");
  return `Region ${r.id + 1}`;
};

/** A region's name: its tags, else its words, else its number. */
export const regionName = (r) => {
  if (r.tags && r.tags.length) return r.tags.map((t) => `#${t}`).join(" · ");
  if (r.words && r.words.length) return r.words.join(" · ");
  return `Region ${r.id + 1}`;
};

/**
 * The topic map: `layout` is Map id → [x, y] (UMAP, computed by the build
 * script). Points are rescaled to 0–1000 and stored flat as
 * [id, x, y, region, lang (0 en, 1 mr, 2 none), year index, mood index | -1].
 */
export function buildMap(posts, layout, years, { k = 7, seed = 1677, moodIds = new Map(), moods = [] } = {}) {
  const placed = posts.filter((p) => layout.has(p.id));
  if (placed.length < k * 5) return null;
  const raw = placed.map((p) => layout.get(p.id));
  const xs = raw.map((r) => r[0]);
  const ys = raw.map((r) => r[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pts = raw.map(([x, y]) => [Math.round(((x - x0) / (x1 - x0 || 1)) * 1000), Math.round(((y - y0) / (y1 - y0 || 1)) * 1000)]);
  const { assign, centres } = kmeans(pts, k, seededRandom(seed));
  const names = nameRegions(placed, assign, k);
  const words = regionWords(placed, assign, k);
  const regions = centres.map((c, r) => {
    const members = placed.map((p, i) => [p, i]).filter(([, i]) => assign[i] === r);
    const exemplar = members
      .filter(([p]) => p.words >= 10 && (!p.kind || p.kind === "own"))
      .sort(([, a], [, b]) => (pts[a][0] - c[0]) ** 2 + (pts[a][1] - c[1]) ** 2 - ((pts[b][0] - c[0]) ** 2 + (pts[b][1] - c[1]) ** 2))[0];
    return {
      id: r,
      tags: names[r],
      words: words[r],
      posts: members.length,
      marathi: pct(members.filter(([p]) => p.lang === "mr").length, members.length),
      x: Math.round(c[0]),
      y: Math.round(c[1]),
      exemplar: exemplar ? { id: exemplar[0].id, date: exemplar[0].date, quote: quoteOf(exemplar[0].clean, 22) } : null,
    };
  });
  // Biggest region first, renumbered so region 0 is always the largest.
  const order = regions.map((r) => r.id).sort((a, b) => regions[b].posts - regions[a].posts);
  const renum = new Map(order.map((old, i) => [old, i]));
  const moodIndex = new Map(moods.map((m, i) => [m.id, i]));
  return {
    regions: order.map((old, i) => ({ ...regions[old], id: i })),
    points: placed.flatMap((p, i) => [
      p.id, pts[i][0], pts[i][1], renum.get(assign[i]),
      { en: 0, mr: 1 }[p.lang] ?? 2,
      years.indexOf(p.year),
      moodIds.has(p.id) ? moodIndex.get(moodIds.get(p.id)) : -1,
    ]),
  };
}

// ── Building the file ───────────────────────────────────────────────────────

/** Every row of the table → the committed insights document. */
export function buildInsights(rows, {
  generatedAt = new Date().toISOString(), poolSize = 360, vectors = null, layout = null,
} = {}) {
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
  // One quote per year for the year cards: the year's best-scored post that is short enough to quote whole.
  const yearQuotes = {};
  years.forEach((y) => {
    const best = posts.filter((p) => p.year === y && p.words >= 8 && p.words <= 60)
      .map((p) => ({ p, s: pickScore(p) })).filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s || b.p.id - a.p.id)[0];
    if (best) yearQuotes[y] = { id: best.p.id, date: best.p.date, lang: best.p.lang, quote: quoteOf(best.p.clean, 28) };
  });

  // English and Marathi, each summarised on its own.
  const byLang = {
    en: summarise(posts.filter((p) => p.lang === "en")),
    mr: summarise(posts.filter((p) => p.lang === "mr")),
  };

  // Meaning: only when the build script handed over the /ask vectors.
  const mood = vectors ? assignMoods(posts, vectors) : { moods: [], byId: new Map(), agreement: null };
  const moods = mood.moods.length ? { list: mood.moods, agreement: mood.agreement, ...moodSeries(posts, mood.byId, mood.moods) } : null;
  const map = layout ? buildMap(posts, layout, years, { moodIds: mood.byId, moods: mood.moods }) : null;

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
    yearQuotes,
    byLang,
    moods,
    map,
  };
}

// ── Reading the file (the page) ─────────────────────────────────────────────

/** The summary for "all" or one year, or null. */
export const scopeOf = (doc, year) => (!doc ? null : (year && doc.perYear[year]) || doc.all);

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
 * The Overview's sentences, written from the numbers in my own voice. Each
 * returns null when the data cannot support it, and the chapter is then left
 * out.
 */
export function storyLines(doc) {
  if (!doc) return {};
  const { all, perYear, years } = doc;
  const n = (x) => Number(x).toLocaleString("en-IN");
  const yearRows = years.map((y) => [y, perYear[y].posts]);
  const peak = [...yearRows].sort((a, b) => b[1] - a[1])[0];
  const quiet = [...yearRows].sort((a, b) => a[1] - b[1])[0];
  const share = (y, lang) => pct(perYear[y].langs[lang] || 0, perYear[y].posts - (perYear[y].langs.none || 0));
  const firstY = years[0];
  const lastY = years[years.length - 1];
  const nightShare = pct(all.night, all.timed);
  const { en, mr } = doc.byLang || {};

  let languages = null;
  if (en && mr && en.posts >= 10 && mr.posts >= 10 && en.medianWords != null && mr.medianWords != null) {
    const longer = mr.medianWords > en.medianWords ? "Marathi" : "English";
    languages = Math.abs(mr.medianWords - en.medianWords) < 0.2 * Math.max(mr.medianWords, en.medianWords)
      ? `My posts run about the same length in either language: ${mr.medianWords} words in Marathi, ${en.medianWords} in English.`
      : `I write longer in ${longer}: a typical Marathi post runs ${mr.medianWords} words, an English one ${en.medianWords}.`;
    const enNight = en.timed >= 20 ? pct(en.night, en.timed) : null;
    const mrNight = mr.timed >= 20 ? pct(mr.night, mr.timed) : null;
    if (enNight != null && mrNight != null && Math.abs(enNight - mrNight) >= 5) {
      languages += ` ${mrNight > enNight ? "Marathi" : "English"} is more often the night language (${Math.max(enNight, mrNight)}% after dark, against ${Math.min(enNight, mrNight)}%).`;
    }
  }

  let mood = null;
  if (doc.moods && doc.moods.list.length >= 2) {
    const { list, years: my } = doc.moods;
    const shareOf = (y, id) => {
      const c = my[y];
      const tot = c ? c.reduce((a, b) => a + b, 0) : 0;
      return tot >= 20 ? c[list.findIndex((m) => m.id === id)] / tot : null;
    };
    const extreme = (id) => years.map((y) => [y, shareOf(y, id)]).filter(([, v]) => v != null).sort((a, b) => b[1] - a[1])[0];
    const calm = list.some((m) => m.id === "calm") ? extreme("calm") : null;
    const restless = list.some((m) => m.id === "restless") ? extreme("restless") : null;
    const top = list[doc.moods.totals.indexOf(Math.max(...doc.moods.totals))];
    mood = `Most of what I post reads ${top.label.toLowerCase()}.`;
    if (calm) mood += ` My calmest year was ${calm[0]}`;
    if (calm && restless) mood += `; my most restless, ${restless[0]}.`;
    else if (calm) mood += ".";
  }

  let map = null;
  if (doc.map && doc.map.regions.length) {
    const big = doc.map.regions[0];
    map = `Placed by meaning, my posts settle into ${doc.map.regions.length} neighbourhoods. The largest, ${regionName(big)}, holds ${n(big.posts)} of them.`;
  }

  return {
    clock: all.timed >= 30 && nightShare != null
      ? `I write after dark: ${nightShare}% of my timed posts went up between 9 pm and 3 am, and my busiest hour is ${hourLabel(all.peakHour)}.`
      : null,
    years: peak && quiet && peak[0] !== quiet[0]
      ? `${peak[0]} was my loudest year, with ${n(peak[1])} posts. ${quiet[0]} was my quietest, with ${n(quiet[1])}.`
      : null,
    language: years.length > 1 && share(firstY, "mr") != null && share(lastY, "mr") != null
      ? `Marathi was ${share(firstY, "mr")}% of my posts in ${firstY} and ${share(lastY, "mr")}% in ${lastY}.`
      : null,
    languages,
    mood,
    map,
    silence: all.gap && all.gap.days >= 14
      ? `My longest silence lasted ${n(all.gap.days)} days. My longest run of daily posts lasted ${all.streak ? all.streak.days : 1}.`
      : null,
  };
}
