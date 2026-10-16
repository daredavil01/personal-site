// Text analysis behind /logbook. Pure functions, shared by
// scripts/build-logbook.mjs (which turns knowledge_base/blog-posts-text.json
// into public/data/logbook.json) and the tests. Nothing here runs in the
// browser: the page reads only the derived JSON.
//
// The excerpt rule: single sentences may ship (each links back to its post),
// paragraphs never do. MAX_EXCERPT_WORDS is that rule, and logbook.test.js
// checks the committed JSON against it.

// eslint-disable-next-line import/extensions -- Node (scripts/build-logbook.mjs) imports this file too
import { hashString } from "./generativeArt.js";

export const MAX_EXCERPT_WORDS = 30;
export const MIN_POST_WORDS = 150;

// The ReadAloud / PinboardCard convention, by share of letters rather than any
// match: an English post quoting one Marathi word is still English.
const DEVANAGARI = /[\u0900-\u097F]/g;
export function isMarathi(text) {
  const deva = (String(text).match(DEVANAGARI) || []).length;
  const latin = (String(text).match(/[A-Za-z]/g) || []).length;
  return deva > 0 && deva >= latin * 0.5;
}

// Substack's calls to action and image-caption debris, one line each.
const BOILERPLATE = [
  /^thanks for reading the wanderer/i,
  /^(leave a comment|share|subscribe now|share the wanderer.*)$/i,
  /^oplus_\d+$/i,
  /^-+\s*send in a voice message/i,
  /^#[\d०-९:.\s]+(am|pm)?$/i, // WordPress timestamp signatures: #३१:५:२०१९::३:५६:pm
  /^~/, // ~संकेत तांबारे
  /^email:/i,
  /^https?:\/\/\S+$/i,
  /अधिक माहितीसाठी|संपर्क साधू|प्रोफाइल्स/, // trek posts' contact footer
];

export function cleanText(text) {
  return String(text || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l && !BOILERPLATE.some((re) => re.test(l)))
    .map((l) => l.replace(/https?:\/\/\S+/g, "").replace(/\S+@\S+\.\S+/g, "").trim())
    .filter(Boolean)
    .join("\n");
}

export const wordsOf = (s) => String(s).match(/[\p{L}\p{M}\p{N}'’]+/gu) || [];

// Sentences end at a run of . ! ? … or the danda, plus any closing quote.
// Line breaks end one too: list items and headings carry no full stop.
export function splitSentences(text) {
  return String(text)
    .split(/\n+/)
    .flatMap((para) => para.match(/[^.!?…।]+(?:[.!?…।]+["”’)]*|$)/g) || [])
    .map((s) => s.trim())
    .filter((s) => wordsOf(s).length > 0);
}

const MARKS = /[.,!?;:…।"“”()—–]/g;
export const punctuationOf = (text, cap = Infinity) => (String(text).match(MARKS) || []).join("").slice(0, cap);

export const STOP = {
  en: new Set(("a an and or but of to in on at by for from with as is are was were be been being it its "
    + "this that these those i me my we our you your he she they them their his her us am do does did "
    + "have has had not no so if then than there here what which who whom when where why how all any "
    + "some such very just also can could would should will shall may might must into out up over "
    + "about after before more most much many own same other each every only even too s t don't it's "
    + "i'm let's that's i've isn't can't won't one").split(" ")),
  mr: new Set(("आणि व हा ही हे ते ती त्या या की तर पण मी आम्ही तुम्ही आहे आहेत होते होता होती असे असा "
    + "अशी एक काही कधी कसे कुठे जे जी जो ने ला ना च ही सुद्धा देखील म्हणून नाही होतो होत केले केला "
    + "केली मध्ये मधील वर खाली पर्यंत साठी तेव्हा जेव्हा आता इथे तिथे सर्व").split(" ")),
};

// Glue words a phrase may not start or end on ("of the", "to be"), while
// "as usual" or "let me know" survive: a writer's tics sit on those edges.
const GLUE = new Set("a an the and or of to in on at by for from with is are was were be it this that".split(" "));

const norm = (w) => w.toLowerCase().replace(/’/g, "'");
// A Marathi post's English loanwords ("the", "trek") are not its vocabulary.
const isContent = (w, lang) => !STOP[lang].has(w) && (lang === "mr" ? /[\u0900-\u097F]/.test(w) : w.length > 3);

/**
 * Recurring phrases across posts. `posts` = [{ lang, year, sentences }].
 * A phrase counts once per post toward `posts`, every time toward `n` and
 * `years`; it must recur in `minPosts` different posts to be a signature
 * rather than one essay's subject. A shorter phrase that only ever appears
 * inside a kept longer one is dropped.
 */
export function phrases(posts, lang, { sizes = [5, 4, 3, 2], minPosts = 3, top = 24 } = {}) {
  const seen = new Map();
  posts.filter((p) => p.lang === lang).forEach((p, pi) => {
    p.sentences.forEach((s) => {
      const ws = wordsOf(s).map(norm);
      sizes.forEach((n) => {
        ws.slice(0, Math.max(0, ws.length - n + 1)).forEach((_, i) => {
          const g = ws.slice(i, i + n);
          if (GLUE.has(g[0]) || GLUE.has(g[n - 1]) || g.every((w) => STOP[lang].has(w))) return;
          const key = g.join(" ");
          const e = seen.get(key) || { p: key, size: n, n: 0, posts: new Set(), years: {} };
          e.n += 1;
          e.posts.add(pi);
          e.years[p.year] = (e.years[p.year] || 0) + 1;
          seen.set(key, e);
        });
      });
    });
  });
  const kept = [];
  [...seen.values()]
    .filter((e) => e.posts.size >= minPosts)
    .sort((a, b) => b.size - a.size || b.posts.size - a.posts.size)
    .forEach((e) => {
      const inside = kept.some((k) => k.size > e.size && ` ${k.p} `.includes(` ${e.p} `) && k.posts.size >= e.posts.size * 0.8);
      if (!inside) kept.push(e);
    });
  return kept
    .sort((a, b) => b.posts.size - a.posts.size || b.n - a.n)
    .slice(0, top)
    .map((e) => ({ p: e.p, n: e.n, posts: e.posts.size, years: e.years }));
}

/** Top content words per year: { [year]: [[word, count], …] }. */
export function topWords(posts, lang, top = 10) {
  const byYear = {};
  posts.filter((p) => p.lang === lang).forEach((p) => {
    const m = byYear[p.year] || (byYear[p.year] = new Map());
    p.sentences.forEach((s) => wordsOf(s).map(norm).filter((w) => isContent(w, lang)).forEach((w) => m.set(w, (m.get(w) || 0) + 1)));
  });
  return Object.fromEntries(Object.entries(byYear).map(([y, m]) => [y, [...m].sort((a, b) => b[1] - a[1]).slice(0, top)]));
}

const clip = (s) => {
  const ws = s.split(/\s+/);
  return ws.length <= MAX_EXCERPT_WORDS ? s : `${ws.slice(0, MAX_EXCERPT_WORDS - 1).join(" ")}…`;
};

/** The first sentence that is a sentence (four words or more), clipped. */
export function openingOf(sentences) {
  const s = sentences.find((x) => wordsOf(x).length >= 4) || sentences[0] || "";
  return clip(s);
}

// A line must start like a sentence — a capital, a Devanagari letter or an
// opening quote — so a fragment split off mid-thought ("in ; so, I…") never
// ships. Not a digit of either script: "६.५० वाजता…" splits at its decimal
// point and leaves "५० वाजता…" behind.
export const startsLikeSentence = (s) => /^[\u0904-\u0939\u0958-\u0961\u0972-\u097FA-Z"“‘(]/.test(String(s));

const lineOk = (s) => {
  const n = wordsOf(s).length;
  return n >= 5 && n <= 18 && !/\d{3,}|[:@;]/.test(s) && startsLikeSentence(s);
};

/** Up to `max` sentences of 5–18 words, spread across the post, with stable ids. */
export function pickLines(url, sentences, max = 4) {
  const ok = sentences.filter(lineOk);
  const step = ok.length / max;
  const picked = ok.length <= max ? ok : Array.from({ length: max }, (_, i) => ok[Math.floor(i * step + step / 2)]);
  return picked.map((s) => ({ id: hashString(`${url}|${s}`).toString(36), s }));
}

export function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

// The sentence of `text` sharing the most content words with `other`; for a
// pair across languages nothing overlaps and the first usable sentence wins.
function bestSentence(text, other, lang) {
  const theirs = new Set(wordsOf(other).map(norm).filter((w) => isContent(w, lang)));
  const ok = splitSentences(text).filter((s) => wordsOf(s).length >= 8 && wordsOf(s).length <= MAX_EXCERPT_WORDS);
  let best = ok[0] || null;
  let score = 0;
  ok.forEach((s) => {
    const n = wordsOf(s).map(norm).filter((w) => theirs.has(w)).length;
    if (n > score) { score = n; best = s; }
  });
  return best;
}

const DAY = 86400000;

/**
 * Then-and-now pairs: chunks of different posts written at least `gapDays`
 * apart whose embeddings sit closest. Each post is used once at most, so the
 * letters cover the archive instead of one essay answering itself 24 times.
 * `chunks` = [{ postId, date, lang, vec, text }].
 */
export function pairLetters(chunks, { gapDays = 548, max = 24, minSim = 0.6 } = {}) {
  const cands = [];
  const old = [...chunks].sort((a, b) => (a.date < b.date ? -1 : 1));
  for (let i = 0; i < old.length; i += 1) {
    for (let j = i + 1; j < old.length; j += 1) {
      const a = old[i];
      const b = old[j];
      if (a.postId !== b.postId && (Date.parse(b.date) - Date.parse(a.date)) / DAY >= gapDays) {
        const sim = cosine(a.vec, b.vec);
        if (sim >= minSim) cands.push({ a, b, sim });
      }
    }
  }
  cands.sort((x, y) => y.sim - x.sim);
  const used = new Set();
  return cands.reduce((out, { a, b, sim }) => {
    if (out.length >= max || used.has(a.postId) || used.has(b.postId)) return out;
    const then = bestSentence(a.text, b.text, a.lang);
    const now = bestSentence(b.text, a.text, b.lang);
    if (!then || !now) return out;
    used.add(a.postId);
    used.add(b.postId);
    return [...out, { then: { post: a.postId, s: then }, now: { post: b.postId, s: now }, sim: Math.round(sim * 1000) / 1000 }];
  }, []);
}

/**
 * A sentence as a constellation, after Nicholas Rougeux's Literary
 * Constellations: one star per word, walked in reading order. Word length sets
 * the step and the star's size; the turn comes from the word's hash, and a
 * stopword turns less, so the sentence's content words make its corners.
 * No part-of-speech tagger, which works the same for Marathi. Returns stars in
 * a unit box (aspect kept, centred), or [] for an empty sentence. Shared by
 * the /logbook sky and the share card, so both draw the same shape.
 */
export function constellationOf(sentence, max = 16) {
  const lang = isMarathi(sentence) ? "mr" : "en";
  const words = wordsOf(sentence).slice(0, max);
  if (!words.length) return [];
  let x = 0;
  let y = 0;
  let heading = -Math.PI / 2 + ((hashString(sentence) % 628) / 100);
  const pts = words.map((w, i) => {
    if (i) {
      const swing = STOP[lang].has(norm(w)) ? 1.1 : 3.6;
      heading += ((hashString(w) % 1000) / 1000 - 0.5) * swing;
      const step = 4 + Math.min(w.length, 12) * 1.6;
      x += Math.cos(heading) * step;
      y += Math.sin(heading) * step;
    }
    return { x, y, r: 0.6 + Math.min(w.length, 12) * 0.18, w };
  });
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const [x0, y0] = [Math.min(...xs), Math.min(...ys)];
  const span = Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0) || 1;
  const [dx, dy] = [(1 - (Math.max(...xs) - x0) / span) / 2, (1 - (Math.max(...ys) - y0) / span) / 2];
  return pts.map((p) => ({ ...p, x: (p.x - x0) / span + dx, y: (p.y - y0) / span + dy, r: (p.r / span) * 3.5 }));
}
