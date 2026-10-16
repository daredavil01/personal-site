// Pure helpers behind the /logbook page: layouts, geometry and the small
// derivations each chapter draws from public/data/logbook.json. No React and
// no DOM, so model.test.js can hold them to their word. The text analysis
// that built the JSON lives in src/lib/logbook.js and runs at build time.

export const yearOf = (post) => Number(String(post.date).slice(0, 4));

const DAY = 86400000;

/** Map of post id → its 0-based position in writing order. */
export const chronoIndex = (posts) => new Map(posts.map((p, i) => [p.id, i]));

/** Mean, longest and count of a list of sentence lengths. */
export function rhythmStats(rhythm = []) {
  if (!rhythm.length) return { avg: null, longest: null, n: 0 };
  const sum = rhythm.reduce((s, n) => s + n, 0);
  return { avg: Math.round((sum / rhythm.length) * 10) / 10, longest: Math.max(...rhythm), n: rhythm.length };
}

/** Rate per thousand words, or null when there are no words to divide by. */
export const perThousand = (n, words) => (words > 0 ? Math.round((n / words) * 10000) / 10 : null);

export const readingMinutes = (words) => Math.max(1, Math.round((Number(words) || 0) / 220));

// ---- Fingerprint: punctuation along a spiral ---------------------------

export const MARKS = [
  { key: "stop", label: "Full stop", test: (c) => c === "." || c === "।" },
  { key: "comma", label: "Comma", test: (c) => c === "," },
  { key: "bang", label: "Exclamation", test: (c) => c === "!" },
  { key: "ask", label: "Question", test: (c) => c === "?" },
  { key: "other", label: "Other", test: () => true },
];

export const markOf = (c) => MARKS.find((m) => m.test(c)).key;

/** How many of each kind of mark a punctuation string holds. */
export function markMix(punct = "") {
  return [...punct].reduce((mix, c) => {
    const k = markOf(c);
    return { ...mix, [k]: mix[k] + 1 };
  }, { stop: 0, comma: 0, bang: 0, ask: 0, other: 0 });
}

export const SPIRAL_BOX = 120;

/**
 * Each mark of `punct`, in reading order, along an Archimedean spiral with a
 * constant step between marks — so a long essay winds further out, never
 * tighter. Returns one path per kind, in a SPIRAL_BOX-wide box; an
 * exclamation mark is drawn as a short stem pointing outwards.
 */
export function spiralPaths(punct = "", { b = 1.55, arc = 2.5 } = {}) {
  const paths = { stop: [], comma: [], bang: [], ask: [], other: [] };
  const c0 = SPIRAL_BOX / 2;
  [...punct].forEach((c, k) => {
    const theta = Math.sqrt((2 * arc * (k + 2)) / b);
    const r = b * theta;
    const a = theta - Math.PI / 2;
    const x = (c0 + Math.cos(a) * r).toFixed(1);
    const y = (c0 + Math.sin(a) * r).toFixed(1);
    const key = markOf(c);
    paths[key].push(key === "bang"
      ? `M${x},${y}l${(Math.cos(a) * 3.5).toFixed(1)},${(Math.sin(a) * 3.5).toFixed(1)}`
      : `M${x},${y}h0.01`);
  });
  return Object.fromEntries(Object.entries(paths).map(([k, v]) => [k, v.join("")]));
}

// ---- Sky: a phyllotaxis of constellations -------------------------------

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/**
 * `n` cells spiralling out from the centre of a `size` square — the oldest
 * essay in the middle, the newest at the rim — packed evenly whatever n is.
 */
export function phyllotaxis(n, size, fill = 0.62) {
  if (!n) return [];
  const cell = (size / Math.sqrt(n)) * fill;
  return Array.from({ length: n }, (_, i) => {
    const rad = (size / 2 - cell / 2 - 8) * Math.sqrt((i + 0.5) / n);
    return {
      cx: size / 2 + Math.cos(i * GOLDEN) * rad,
      cy: size / 2 + Math.sin(i * GOLDEN) * rad,
      cell,
    };
  });
}

// ---- Letters: arcs across the years -------------------------------------

/** A half-ellipse-like arc from x0 to x1 standing `lift` above `base`. */
export function arcPath(x0, x1, base, lift) {
  const k = lift * 1.33;
  return `M${x0.toFixed(1)},${base}C${x0.toFixed(1)},${(base - k).toFixed(1)} ${x1.toFixed(1)},${(base - k).toFixed(1)} ${x1.toFixed(1)},${base}`;
}

/** "3 years, 2 months" between two ISO dates, in whole months. */
export function gapLabel(a, b) {
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  const months = Math.abs((yb - ya) * 12 + (mb - ma));
  const y = Math.floor(months / 12);
  const m = months % 12;
  const part = (v, unit) => (v ? `${v} ${unit}${v === 1 ? "" : "s"}` : null);
  return [part(y, "year"), part(m, "month")].filter(Boolean).join(", ") || "the same month";
}

/**
 * The years worth labelling on a time axis: each year's tick at `xOf(year)`,
 * skipping any that would sit within `minGap` px of the last one kept — the
 * axis starts mid-2020, so 2020 and 2021 crowd each other on a phone.
 */
export function yearTicks(years, xOf, minGap = 34) {
  return years.reduce((kept, y) => {
    const x = xOf(y);
    return kept.length && x - kept[kept.length - 1].x < minGap ? kept : [...kept, { year: y, x }];
  }, []);
}

export const daysBetween = (a, b) => Math.round(Math.abs(Date.parse(b) - Date.parse(a)) / DAY);

// ---- Search -------------------------------------------------------------

const fold = (s) => String(s || "").toLowerCase().normalize("NFC");

/**
 * Ids of the posts whose title, tags or opening line contain every word of
 * `query`, or null for an empty query (meaning: nothing is filtered).
 */
export function matchPosts(posts, query) {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return null;
  return new Set(posts
    .filter((p) => {
      const hay = fold(`${p.title} ${(p.tags || []).join(" ")} ${p.opening || ""}`);
      return terms.every((t) => hay.includes(t));
    })
    .map((p) => p.id));
}

// ---- Region names -------------------------------------------------------

const SMALL = new Set(["a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to"]);

/** "ai & running" → "AI & Running": map names in title case, acronyms kept. */
export const titleCase = (label) => String(label).split(" ").map((w, i) => {
  if (!/^[a-z]/.test(w)) return w;
  if (SMALL.has(w) && i > 0) return w;
  if (w.length <= 2) return w.toUpperCase();
  return w[0].toUpperCase() + w.slice(1);
}).join(" ");

/** A long two-part region name, broken before its ampersand. */
export const splitLabel = (label, max = 18) => {
  const i = label.indexOf(" & ");
  return label.length <= max || i < 0 ? [label] : [label.slice(0, i), label.slice(i + 1)];
};

// ---- Prologue: one dot per essay, five arrangements ---------------------

// Stack the posts of each month into a column, so a busy month stands taller.
function monthStacks(posts, xOf, laneOf = () => 0) {
  const height = new Map();
  return posts.map((p) => {
    const key = `${p.date.slice(0, 7)}|${laneOf(p)}`;
    const k = height.get(key) || 0;
    height.set(key, k + 1);
    return { x: xOf(p), k };
  });
}

const lerp = ([d0, d1], [r0, r1]) => (v) => (d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0));

/**
 * The prologue's five arrangements of the same dots, for a W×H figure:
 * the ledger (every essay in writing order, sized by length), the timeline,
 * the two language lanes, the meaning map, and the map again sized by
 * exclamation marks. Each is [{ x, y, r }] in post order, plus the scales
 * the annotations need.
 */
export function prologueLayouts(posts, W, H, { pad = 28 } = {}) {
  const n = posts.length;
  const maxWords = Math.max(1, ...posts.map((p) => p.words || 0));

  const cols = Math.max(1, Math.round(Math.sqrt((n * (W - pad * 2)) / (H - pad * 2))));
  const rows = Math.ceil(n / cols);
  const cell = Math.min((W - pad * 2) / cols, (H - pad * 2) / rows);
  const gx = (W - cell * cols) / 2;
  const gy = (H - cell * rows) / 2;
  const ledger = posts.map((p, i) => ({
    x: gx + (i % cols) * cell + cell / 2,
    y: gy + Math.floor(i / cols) * cell + cell / 2,
    r: Math.max(1.6, cell * 0.42 * Math.sqrt((p.words || 0) / maxWords)),
  }));

  const time = (p) => Date.parse(p.date);
  const t0 = Math.min(...posts.map(time));
  const t1 = Math.max(...posts.map(time));
  const x = lerp([t0, t1], [pad + 6, W - pad - 6]);
  const xOf = (p) => x(time(p));
  const base = H - pad - 22;
  const tallest = Math.max(1, ...monthStacks(posts, xOf).map((s) => s.k + 1));
  const step = Math.min(9, (base - pad) / tallest);
  const dot = Math.max(1.8, Math.min(3.6, step * 0.42));
  const surge = monthStacks(posts, xOf).map(({ x: px, k }) => ({ x: px, y: base - k * step, r: dot }));

  const mid = H / 2;
  const lanes = monthStacks(posts, xOf, (p) => p.lang);
  const laneTall = Math.max(1, ...lanes.map((s) => s.k + 1));
  const lstep = Math.min(9, (mid - pad - 16) / laneTall);
  const streams = lanes.map(({ x: px, k }, i) => ({
    x: px,
    y: posts[i].lang === "mr" ? mid + 12 + k * lstep : mid - 12 - k * lstep,
    r: Math.max(1.8, Math.min(3.6, lstep * 0.42)),
  }));

  const ax = lerp([0, 1], [pad + 10, W - pad - 10]);
  const ay = lerp([0, 1], [pad + 10, H - pad - 10]);
  const scaleR = Math.min(W, H) / 400;
  const atlas = posts.map((p) => (p.xy
    ? { x: ax(p.xy[0]), y: ay(p.xy[1]), r: (2.2 + Math.sqrt(p.words || 0) / 14) * scaleR }
    : { x: W / 2, y: H / 2, r: 0 }));
  const loud = posts.map((p, i) => ({ ...atlas[i], r: p.xy ? (1.2 + Math.sqrt(p.exclaims || 0) * 1.3) * scaleR : 0 }));

  return { layouts: [ledger, surge, streams, atlas, loud], x, base, mid, ax, ay };
}

// ---- Guess the year -----------------------------------------------------

/**
 * A line for the game: first a year, uniformly among the years that have
 * lines, then a line from it. A plain draw would make "the newest year"
 * the right answer seven times in ten.
 */
export function pickLine(lines, yearOfLine, rand = Math.random) {
  if (!lines.length) return null;
  const years = [...new Set(lines.map(yearOfLine))].sort();
  const year = years[Math.min(years.length - 1, Math.floor(rand() * years.length))];
  const pool = lines.filter((l) => yearOfLine(l) === year);
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}
