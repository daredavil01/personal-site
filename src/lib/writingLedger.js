// The Writing Ledger's numbers, derived from public/data/writing-ledger.json.
//
// The JSON (written by `npm run blogs:wordcount`) carries the totals and the
// monthly/yearly roll-ups; everything the redesigned /writing-ledger page adds
// on top — the shelf, the ink calendar, the records, the merged topics, the
// milestones, the reading equivalents — is computed here, once, so the page's
// components only draw. Pure and dependency-free (tested in
// writingLedger.test.js).

const DAY = 86400000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Silent-reading speed for non-fiction (Brysbaert 2019) — used for reading time. */
export const READING_WPM = 238;
/** A printed trade paperback page. */
export const WORDS_PER_PAGE = 300;
/** A typical adult novel. */
export const WORDS_PER_NOVEL = 90000;

const pad = (n) => String(n).padStart(2, "0");
const utc = (iso) => Date.parse(`${iso}T00:00:00Z`);
const isoOf = (ms) => new Date(ms).toISOString().slice(0, 10);

export const monthLabel = (key, long = false) => {
  const [y, m] = key.split("-").map(Number);
  return `${(long ? MONTHS_LONG : MONTHS)[m - 1]} ${y}`;
};

export const prettyDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** Tags arrive in several spellings ("Data Privacy", "privacy", "data_privacy"). */
export const tagKey = (t) => String(t || "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
export const tagLabel = (key) => key.replace(/\b(ai)\b/g, "AI");

// The challenge tag marks most of the archive; it is a container, not a topic.
const NOT_TOPICS = new Set(["100 days to offload"]);

/** "Marathi" when the post says so or its title is in Devanagari, else English. */
export const languageOf = (p) => {
  const l = String(p.language || "").trim();
  if (l) return l;
  return /[ऀ-ॿ]/.test(p.title || "") ? "Marathi" : "English";
};

/** Every post with a date, oldest first, with derived fields the page needs. */
export function normalisePosts(posts = []) {
  return posts
    .filter((p) => p && /^\d{4}-\d{2}-\d{2}$/.test(p.date || ""))
    .map((p) => ({
      ...p,
      platform: /^wordpress$/i.test(p.platform || "") ? "WordPress" : p.platform,
      words: Number(p.words) || 0,
      lang: languageOf(p),
      year: p.date.slice(0, 4),
      month: p.date.slice(0, 7),
      topics: [...new Set((p.tags || []).map(tagKey).filter((k) => k && !NOT_TOPICS.has(k)))],
    }))
    .sort((a, b) => (a.publishedAt || a.date).localeCompare(b.publishedAt || b.date));
}

/** Every calendar month from the first post to `untilMonth`, empty ones included. */
export function monthSeries(posts, untilMonth) {
  if (!posts.length) return [];
  const byMonth = new Map();
  posts.forEach((p) => {
    const cur = byMonth.get(p.month) || { posts: 0, words: 0 };
    byMonth.set(p.month, { posts: cur.posts + 1, words: cur.words + p.words });
  });
  const last = [posts[posts.length - 1].month, untilMonth].filter(Boolean).sort().pop();
  let [y, m] = posts[0].month.split("-").map(Number);
  const out = [];
  let running = 0;
  for (;;) {
    const key = `${y}-${pad(m)}`;
    const v = byMonth.get(key) || { posts: 0, words: 0 };
    running += v.words;
    out.push({ month: key, label: monthLabel(key, true), ...v, cumulative: running });
    if (key >= last) break;
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

/** The month in which the running total first crossed each round number. */
export function milestones(series, step = 25000) {
  const out = [];
  let next = step;
  series.forEach((s) => {
    while (s.cumulative >= next) {
      out.push({ words: next, month: s.month, label: s.label });
      next += step;
    }
  });
  return out;
}

/** Longest run of consecutive calendar months with at least one post. */
export function longestMonthStreak(series) {
  let best = { length: 0, from: null, to: null };
  let run = 0;
  let start = null;
  series.forEach((s) => {
    if (s.posts > 0) {
      if (!run) start = s.month;
      run += 1;
      if (run > best.length) best = { length: run, from: start, to: s.month };
    } else run = 0;
  });
  return best;
}

/** Current run of consecutive months with a post, ending this month or last. */
export function currentMonthStreak(series) {
  let i = series.length - 1;
  if (i >= 0 && series[i].posts === 0) i -= 1; // this month may not have started yet
  let n = 0;
  while (i >= 0 && series[i].posts > 0) { n += 1; i -= 1; }
  return n;
}

/** The longest gap between two consecutive posts, in days. */
export function longestSilence(posts) {
  let best = null;
  for (let i = 1; i < posts.length; i += 1) {
    const days = Math.round((utc(posts[i].date) - utc(posts[i - 1].date)) / DAY);
    if (!best || days > best.days) best = { days, from: posts[i - 1], to: posts[i] };
  }
  return best;
}

/** The single date with the most posts. */
export function busiestDay(posts) {
  const by = new Map();
  posts.forEach((p) => by.set(p.date, [...(by.get(p.date) || []), p]));
  let best = null;
  by.forEach((list, date) => {
    if (!best || list.length > best.posts.length) best = { date, posts: list };
  });
  return best && best.posts.length > 1 ? best : null;
}

/**
 * Topics merged across spellings, ranked by words.
 * @returns {{ key, label, posts, words, share, latest }[]}
 */
export function topics(posts, limit = 18) {
  const by = new Map();
  posts.forEach((p) => p.topics.forEach((k) => {
    const cur = by.get(k) || { key: k, label: tagLabel(k), posts: 0, words: 0, latest: null };
    cur.posts += 1;
    cur.words += p.words;
    if (!cur.latest || p.date > cur.latest) cur.latest = p.date;
    by.set(k, cur);
  }));
  const total = posts.reduce((s, p) => s + p.words, 0) || 1;
  return [...by.values()]
    .filter((t) => t.posts >= 2)
    .sort((a, b) => b.words - a.words || b.posts - a.posts)
    .slice(0, limit)
    .map((t) => ({ ...t, share: t.words / total }));
}

/**
 * Squarified treemap (Bruls, Huizing & van Wijk 2000) of `items` by `value`
 * into a w×h box. Returns each item with x, y, w, h.
 */
export function treemap(items, w, h, value = (d) => d.value) {
  const raw = items.map((d) => ({ d, v: Math.max(0, value(d)) })).filter((n) => n.v > 0);
  const total = raw.reduce((s, n) => s + n.v, 0);
  if (!total || w <= 0 || h <= 0) return [];
  const scale = (w * h) / total;
  const nodes = raw.map((n) => ({ ...n, a: n.v * scale }));
  const out = [];
  let box = { x: 0, y: 0, w, h };
  const worst = (row, side) => {
    const s = row.reduce((t, n) => t + n.a, 0);
    const max = Math.max(...row.map((n) => n.a));
    const min = Math.min(...row.map((n) => n.a));
    return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
  };
  const lay = (row) => {
    const s = row.reduce((t, n) => t + n.a, 0);
    if (box.w >= box.h) {
      const cw = s / box.h;
      let { y } = box;
      row.forEach((n) => { const ch = n.a / cw; out.push({ ...n.d, x: box.x, y, w: cw, h: ch }); y += ch; });
      box = { x: box.x + cw, y: box.y, w: box.w - cw, h: box.h };
    } else {
      const ch = s / box.w;
      let { x } = box;
      row.forEach((n) => { const cw = n.a / ch; out.push({ ...n.d, x, y: box.y, w: cw, h: ch }); x += cw; });
      box = { x: box.x, y: box.y + ch, w: box.w, h: box.h - ch };
    }
  };
  let row = [];
  nodes.forEach((n) => {
    const side = Math.min(box.w, box.h);
    if (!row.length || worst([...row, n], side) <= worst(row, side)) row.push(n);
    else { lay(row); row = [n]; }
  });
  if (row.length) lay(row);
  return out;
}

/**
 * One year as a GitHub-style grid: 7 rows (Mon…Sun) × up to 54 week columns.
 * @returns {{ year, weeks, cells: {date, col, row, posts: object[], words}[], posts, words }}
 */
export function yearGrid(year, posts) {
  const y = Number(year);
  const start = Date.UTC(y, 0, 1);
  const end = Date.UTC(y, 11, 31);
  const startDow = (new Date(start).getUTCDay() + 6) % 7; // Monday = 0
  const byDate = new Map();
  posts.forEach((p) => { if (p.year === String(y)) byDate.set(p.date, [...(byDate.get(p.date) || []), p]); });
  const cells = [];
  for (let t = start; t <= end; t += DAY) {
    const i = Math.round((t - start) / DAY) + startDow;
    const date = isoOf(t);
    const list = byDate.get(date) || [];
    cells.push({ date, col: Math.floor(i / 7), row: i % 7, posts: list, words: list.reduce((s, p) => s + p.words, 0) });
  }
  const months = MONTHS.map((label, m) => ({
    label,
    col: Math.floor((Math.round((Date.UTC(y, m, 1) - start) / DAY) + startDow) / 7),
  }));
  const yearPosts = [...byDate.values()].flat();
  return {
    year: String(y),
    weeks: cells[cells.length - 1].col + 1,
    cells,
    months,
    posts: yearPosts.length,
    words: yearPosts.reduce((s, p) => s + p.words, 0),
  };
}

/**
 * The last `months` calendar months up to `today`, in yearGrid's cell shape —
 * the ink calendar's phone view, where seven full years would be a strip of
 * 6-pixel dots. `today` is read in local time; dates are UTC days like
 * yearGrid's.
 */
export function recentGrid(posts, today = new Date(), months = 3) {
  const end = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const first = new Date(Date.UTC(today.getFullYear(), today.getMonth() - (months - 1), 1));
  const start = first.getTime();
  const startDow = (first.getUTCDay() + 6) % 7; // Monday = 0
  const from = isoOf(start);
  const to = isoOf(end);
  const byDate = new Map();
  posts.forEach((p) => {
    if (p.date >= from && p.date <= to) byDate.set(p.date, [...(byDate.get(p.date) || []), p]);
  });
  const cells = [];
  for (let t = start; t <= end; t += DAY) {
    const i = Math.round((t - start) / DAY) + startDow;
    const date = isoOf(t);
    const list = byDate.get(date) || [];
    cells.push({ date, col: Math.floor(i / 7), row: i % 7, posts: list, words: list.reduce((s, p) => s + p.words, 0) });
  }
  const labels = [];
  for (let k = 0; k < months; k += 1) {
    const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + k, 1));
    labels.push({
      label: MONTHS[d.getUTCMonth()],
      col: Math.floor((Math.round((d.getTime() - start) / DAY) + startDow) / 7),
    });
  }
  const recent = [...byDate.values()].flat();
  return {
    year: `${MONTHS[first.getUTCMonth()]}–${MONTHS[today.getMonth()]} ${today.getFullYear()}`,
    weeks: cells[cells.length - 1].col + 1,
    cells,
    months: labels,
    posts: recent.length,
    words: recent.reduce((s, p) => s + p.words, 0),
  };
}

/**
 * Three essays to start with, for a reader who came to read rather than count:
 * the newest, the newest in the other language, and the longest. Distinct,
 * podcasts left out (their "words" are show notes), each with a link.
 * `posts` are normalisePosts() output, oldest first.
 */
export function featuredEssays(posts) {
  const pool = posts.filter((p) => p.type !== "podcast" && p.url && String(p.title || "").trim());
  if (!pool.length) return [];
  const picked = [];
  const add = (post, reason) => {
    if (post && !picked.some((x) => x.post === post)) picked.push({ post, reason });
  };
  const newest = pool[pool.length - 1];
  add(newest, "Newest");
  const other = [...pool].reverse().find((p) => p.lang !== newest.lang);
  if (other) add(other, `Newest in ${other.lang}`);
  const longest = pool.reduce((a, b) => (b.words > a.words ? b : a), pool[0]);
  add(longest, "Longest");
  return picked;
}

/** Posts and words per day of week, Monday first. */
export function weekdays(posts) {
  const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const out = names.map((day) => ({ day, short: day.slice(0, 3), posts: 0, words: 0 }));
  posts.forEach((p) => {
    const i = (new Date(utc(p.date)).getUTCDay() + 6) % 7;
    out[i].posts += 1;
    out[i].words += p.words;
  });
  return out;
}

/** Counts of a categorical field, largest first. */
export function mix(posts, pick) {
  const by = new Map();
  posts.forEach((p) => {
    const k = pick(p);
    if (!k) return;
    const cur = by.get(k) || { label: k, posts: 0, words: 0 };
    cur.posts += 1;
    cur.words += p.words;
    by.set(k, cur);
  });
  return [...by.values()].sort((a, b) => b.posts - a.posts);
}

/** "2 hrs 14 min" style reading time. */
export function readingTime(words) {
  const mins = Math.round(words / READING_WPM);
  if (mins < 60) return { value: mins, unit: "min", text: `${mins} min` };
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return { value: h, unit: "hrs", text: m ? `${h} hrs ${m} min` : `${h} hrs` };
}

/** Everything the page draws, from the ledger JSON. */
export function ledgerModel(data, now = new Date()) {
  const posts = normalisePosts(data?.posts);
  if (!posts.length) return null;
  const ist = new Date(now.getTime() + 330 * 60000);
  const thisMonth = `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}`;
  const today = isoOf(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
  const series = monthSeries(posts, thisMonth);
  const words = posts.reduce((s, p) => s + p.words, 0);
  const first = posts[0];
  const latest = posts[posts.length - 1];
  const daysSpan = Math.max(1, Math.round((utc(today) - utc(first.date)) / DAY) + 1);
  const years = [];
  for (let y = Number(first.year); y <= Number(today.slice(0, 4)); y += 1) years.push(String(y));
  const byYear = years.map((year) => {
    const list = posts.filter((p) => p.year === year);
    return { year, posts: list.length, words: list.reduce((s, p) => s + p.words, 0) };
  });
  const busiestYear = byYear.reduce((a, b) => (b.words > a.words ? b : a));
  const activeMonths = series.filter((s) => s.posts > 0);
  const busiestMonth = activeMonths.reduce((a, b) => (b.words > a.words ? b : a));
  const counted = posts.filter((p) => p.words > 0);
  const longest = counted.reduce((a, b) => (b.words > a.words ? b : a));
  const shortest = counted.reduce((a, b) => (b.words < a.words ? b : a));

  return {
    posts,
    words,
    first,
    latest,
    today,
    daysSpan,
    averageWords: Math.round(words / posts.length),
    wordsPerDay: Math.round(words / daysSpan),
    reading: readingTime(words),
    pages: Math.round(words / WORDS_PER_PAGE),
    novels: Math.round((words / WORDS_PER_NOVEL) * 10) / 10,
    series,
    activeMonths: activeMonths.length,
    milestones: milestones(series),
    byYear,
    busiestYear,
    busiestMonth,
    longest,
    shortest,
    streak: longestMonthStreak(series),
    currentStreak: currentMonthStreak(series),
    silence: longestSilence(posts),
    busiestDay: busiestDay(posts),
    topics: topics(posts),
    weekdays: weekdays(posts),
    platforms: mix(posts, (p) => p.platform),
    languages: mix(posts, (p) => p.lang),
    formats: mix(posts, (p) => ({ newsletter: "Essay", post: "Blog post", podcast: "Podcast" }[p.type] || null)),
    tracked: posts.filter((p) => p.trackedInBlogsTable).length,
  };
}
