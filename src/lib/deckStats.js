import { projectTime } from "./projectDate";

// Derived numbers for /presentations. The table has no slide-count column, but
// almost every description opens with one ("A 12-slide deck…", "Thirty-nine
// illustrated slides…"), so the count is read from the words. A deck whose
// description names no count has `slides: null` and is left out of any total,
// which the page says.

const UNITS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};
const TENS = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

/** "62", "sixty-two", "Thirty" → number, or null. */
export function wordNumber(word) {
  const w = String(word ?? "").toLowerCase().trim();
  if (/^\d+$/.test(w)) return Number(w);
  if (UNITS[w]) return UNITS[w];
  if (TENS[w]) return TENS[w];
  const [t, u] = w.split(/[-\s]/);
  if (TENS[t] && UNITS[u] && UNITS[u] < 10) return TENS[t] + UNITS[u];
  return null;
}

const NUM = "(\\d+|[a-z]+(?:-[a-z]+)?)";
// "12-slide", "30 slide", "Sixty-two illustrated slides", "six-panel".
const PATTERNS = [
  new RegExp(`\\b${NUM}[-\\s](?:slide|panel)s?\\b`, "gi"),
  new RegExp(`\\b${NUM}\\s+(?:[a-z,-]+\\s+){0,3}?(?:slides|panels)\\b`, "gi"),
];

/** The slide count a description states, or null. */
export function slideCount(description) {
  const text = String(description ?? "");
  const found = PATTERNS
    .flatMap((re) => [...text.matchAll(re)])
    .map((m) => wordNumber(m[1]))
    .find((n) => n && n > 1 && n < 500);
  return found ?? null;
}

export const LENGTHS = [
  { id: "short", name: "Short", blurb: "≤ 12 slides", test: (n) => n <= 12 },
  { id: "medium", name: "Medium", blurb: "13–29 slides", test: (n) => n > 12 && n < 30 },
  { id: "long", name: "Long", blurb: "30+ slides", test: (n) => n >= 30 },
];

export const lengthOf = (n) => (n == null ? null : LENGTHS.find((l) => l.test(n))?.id ?? null);

/** Each deck with `slides`, `length` and `time` (ms or null). */
export const enrichDecks = (decks) => (decks ?? []).map((d) => {
  const slides = slideCount(d.description);
  return {
    ...d, slides, length: lengthOf(slides), time: projectTime(d.date),
  };
});

/** Rough minutes to click through: ~25 s a slide. An estimate, labelled so. */
export const readMinutes = (slides) => (slides ? Math.max(1, Math.round((slides * 25) / 60)) : null);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

const DAY = 86400000;

export function deckSummary(decks, today = new Date()) {
  if (!decks.length) return null;
  const counted = decks.filter((d) => d.slides);
  const slides = counted.reduce((s, d) => s + d.slides, 0);
  const dated = decks.filter((d) => d.time != null).sort((a, b) => a.time - b.time);
  const tags = new Map();
  decks.forEach((d) => (d.tags ?? []).forEach((t) => {
    const k = String(t).toLowerCase();
    tags.set(k, (tags.get(k) ?? 0) + 1);
  }));

  // Every month from the first dated deck to today, so a quiet month shows as one.
  const months = [];
  if (dated.length) {
    const start = new Date(dated[0].time);
    const end = today > new Date(dated[dated.length - 1].time) ? today : new Date(dated[dated.length - 1].time);
    for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const at = dated.filter((x) => {
        const xd = new Date(x.time);
        return xd.getFullYear() === d.getFullYear() && xd.getMonth() === d.getMonth();
      });
      months.push({ key, count: at.length, slides: at.reduce((s, x) => s + (x.slides ?? 0), 0) });
    }
  }
  const gaps = dated.slice(1).map((d, i) => Math.round((d.time - dated[i].time) / DAY));
  const medianGap = gaps.length ? [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : null;
  const biggest = counted.reduce((a, b) => (!a || b.slides > a.slides ? b : a), null);
  const last = dated[dated.length - 1] ?? null;

  return {
    count: decks.length,
    slides: slides || null,
    counted: counted.length,
    avgSlides: counted.length ? Math.round(slides / counted.length) : null,
    biggest,
    topics: tags.size,
    topTags: [...tags].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    months,
    busiestMonth: months.reduce((a, b) => (!a || b.count > a.count ? b : a), null),
    medianGap,
    latest: last,
    daysSinceLast: last ? Math.max(0, Math.round((today - last.time) / DAY)) : null,
    undated: decks.length - dated.length,
    lengths: LENGTHS.map((l) => ({ ...l, count: decks.filter((d) => d.length === l.id).length })),
  };
}
