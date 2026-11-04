// The seven page films as scripts: what each scene shows, how long it runs,
// how it slides in, what the captions say and when, and every sound cue.
//
// One pure module, read by both halves of the render, so picture and sound
// cannot drift apart:
//   - the Remotion composition (remotion/Film.jsx) draws each scene from it,
//   - render.mjs synthesises the effects track from its `sfx` list
//     (score.mjs) and writes the captions track from its `captions`.
// No imports, no Node, no DOM: webpack bundles it for Remotion and Node runs it.
//
// Timing is in frames at 30 fps. Scene lengths are seconds in each film's
// list and vary with what the scene has to show (five chapters get longer
// than one number); each film is scaled to exactly 30 seconds. Every item
// inside a scene carries its own `at` frame, and the sfx cues are derived
// from those same frames.

export const FPS = 30;
export const SECONDS = 30;
export const TOTAL = FPS * SECONDS;
// Scenes overlap by this many frames: the next one slides in over the last.
export const OVERLAP = 12;

const ENTERS = ["left", "right", "up", "down", "zoom", "wipe", "tilt", "iris"];

// --- small helpers ------------------------------------------------------------------
const has = (v) => v !== null && v !== undefined && v !== "" && !(typeof v === "number" && !Number.isFinite(v));
export const fmt = (n) => Math.round(n).toLocaleString("en-IN");
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const day = (iso) => { if (!iso) return ""; const [y, m, d] = iso.split("-").map(Number); return `${d} ${MON[m - 1]} ${y}`; };
const monthYear = (iso) => { if (!iso) return ""; const [y, m] = iso.split("-").map(Number); return `${MONTH[m - 1]} ${y}`; };
const hourLabel = (h) => (h === 0 ? "midnight" : h < 12 ? `${h} am` : h === 12 ? "noon" : `${h - 12} pm`);
const evenly = (list, want) => (list.length <= want ? list
  : Array.from({ length: want }, (_, i) => list[Math.round((i / (want - 1)) * (list.length - 1))]));
const toSecs = (t) => String(t || "").split(":").map(Number).reduce((a, v) => a * 60 + v, 0);
const maxOf = (xs) => Math.max(1, ...xs);

// --- themes ---------------------------------------------------------------------------
export const THEMES = {
  about: { bg: "#f3ede2", fg: "#1c1917", accent: "#b22200", muted: "#78716c", soft: "rgba(28,25,23,.12)", head: "serif", grain: 0.07, dark: false },
  resume: { bg: "#0f172a", fg: "#ffffff", accent: "#3b82f6", muted: "#94a3b8", soft: "rgba(255,255,255,.1)", head: "sans", grain: 0.05, dark: true, paper: "#ffffff", ink: "#0f172a" },
  ledger: { bg: "#f4eee2", fg: "#1d3a6b", accent: "#b22200", muted: "#7a6f62", soft: "rgba(29,58,107,.12)", head: "serif", grain: 0.09, dark: false, sepia: "#8b5e34" },
  microblog: { bg: "#070b1f", fg: "#ece9ff", accent: "#f5a524", muted: "#8f8bb3", soft: "rgba(255,255,255,.1)", head: "serif", grain: 0.05, dark: true, indigo: "#8b9cff" },
  presentations: { bg: "#0c0a09", fg: "#fafaf9", accent: "#fbbf24", muted: "#a8a29e", soft: "rgba(255,255,255,.1)", head: "sans", grain: 0.06, dark: true },
  sports: { bg: "#0a0a0a", fg: "#ffffff", accent: "#ff5a1f", muted: "#a3a3a3", soft: "rgba(255,255,255,.1)", head: "display", grain: 0.07, dark: true },
  treks: { bg: "#0f1f17", fg: "#f2f5ef", accent: "#d4a24c", muted: "#9fb3a3", soft: "rgba(255,255,255,.1)", head: "serif", grain: 0.07, dark: true, moss: "#6f8f72", levels: { Easy: "#8fbf8f", Medium: "#d4a24c", Hard: "#e0603a" } },
};

// --- the films, as lists of scenes (seconds are relative weights) ------------------------

const FILMS = {
  about: (D) => {
    const facts = {
      "The engineer": [has(D.projects) && `${D.projects} projects shipped`, "Data pipelines by day"],
      "The runner": [has(D.races) && `${D.races} races`, has(D.km) && `${fmt(D.km)} km on race day`],
      "The trekker": [has(D.treks) && `${D.treks} Sahyadri forts`, "Some take two hours. One took twenty-two."],
      "The reader and writer": [has(D.books) && `${D.books} books, ${D.booksMarathi} in Marathi`, has(D.essays) && `${D.essays} essays · ${fmt(D.micro)} short posts`],
      "The citizen": ["Technology policy, studied in public", "Tools that work in Marathi"],
    };
    const glyphs = { "The engineer": "code", "The runner": "run", "The trekker": "peak", "The reader and writer": "book", "The citizen": "globe" };
    const chapters = D.chapters.filter((c) => facts[c]);
    return [
      { type: "stopwatch", secs: 4, enter: "zoom", question: "How long do you have?", options: ["10 seconds", "1 minute", "5 minutes", "10 minutes"],
        say: "How long do you have? Ten seconds, a minute, five minutes, or ten." },
      { type: "typed", secs: 4.5, enter: "up", kicker: "In 10 seconds", text: D.line, say: D.line },
      { type: "cards", style: "chapter", secs: 2.3 * chapters.length, enter: "left",
        items: chapters.map((c, i) => ({ kicker: `Chapter ${i + 1} of ${chapters.length}`, title: c, glyph: glyphs[c], lines: facts[c].filter(Boolean) })),
        say: chapters.map((c) => `${c}: ${facts[c].filter(Boolean).join(", ")}.`).join(" ") },
      { type: "list", style: "numbered", secs: 6, enter: "wipe", head: "How I work",
        items: D.principles.slice(0, 6).map((p, i) => ({ label: String(i + 1).padStart(2, "0"), title: p })),
        say: `How I work: ${D.principles.slice(0, 6).join(". ")}.` },
      { type: "end", secs: 4, enter: "iris", photo: D.me, round: true, lines: ["Read me in ten seconds", "— or ten minutes."],
        say: "Read me in ten seconds, or ten minutes." },
    ];
  },

  resume: (D) => {
    const kpis = [
      has(D.years) && { value: D.years, suffix: "+", label: "years in industry" },
      has(D.projects) && { value: D.projects, label: "projects shipped" },
      has(D.certs?.length) && { value: D.certs.length, label: "certifications" },
      has(D.degrees?.length) && { value: D.degrees.length, label: D.degrees.length === 1 ? "degree" : "degrees" },
    ].filter(Boolean);
    const certs = D.certs.slice(0, 5);
    return [
      { type: "sheet", secs: 4, enter: "up", name: "Sanket Tambare", role: D.current || "", say: `Sanket Tambare. ${D.current || "Software engineer"}.` },
      { type: "timeline", secs: 8, enter: "down", head: "Experience", items: D.roles.map((r) => ({ ...r })),
        say: `From ${D.roles[0]?.company} in ${D.roles[0]?.start} to ${D.current || "now"}.` },
      { type: "tiles", secs: 5, enter: "zoom", head: "In numbers", items: kpis, say: `${kpis.map((k) => `${k.value}${k.suffix || ""} ${k.label}`).join(", ")}.` },
      { type: "list", style: "dots", secs: 4.5, enter: "left", head: `Skills · top ${D.skills.length} of ${D.skillCount}`,
        items: D.skills.map((s) => ({ title: s.title, dots: s.level })), say: `Strongest skills: ${D.skills.slice(0, 5).map((s) => s.title).join(", ")}.` },
      { type: "list", style: "paper", secs: 4.5, enter: "right", head: "Certified",
        items: certs.map((c) => ({ label: String(c.year || ""), title: c.name, sub: c.source })),
        say: `${D.certs.length} certifications, newest first: ${certs.slice(0, 2).map((c) => c.name).join(" and ")}.` },
      { type: "end", secs: 4, enter: "tilt", sheet: true, lines: ["One page.", "Always current."], say: "One page. Always current. Print it, or copy it as plain text." },
    ];
  },

  ledger: (D) => {
    const T = D.totals;
    const peak = D.byYear.reduce((a, y) => (y.words > a.words ? y : a), D.byYear[0]);
    const topDay = D.week.reduce((a, w) => (w.posts > a.posts ? w : a), D.week[0]);
    const topLen = D.lengths.reduce((a, l) => (l.posts > a.posts ? l : a), D.lengths[0]);
    const recs = [
      T.longestPost && { label: "Longest", title: T.longestPost.title, sub: `${fmt(T.longestPost.words)} words` },
      T.busiestYear && { label: "Busiest year", title: T.busiestYear.year, sub: `${T.busiestYear.posts} posts` },
      D.topics[0] && { label: "Most-written topic", title: D.topics[0].tag, sub: `${D.topics[0].posts} posts` },
      D.latest && { label: "Latest", title: D.latest.title, sub: day(D.latest.date) },
    ].filter(Boolean);
    return [
      { type: "count", art: "pen", secs: 4, enter: "wipe", value: T.words, label: "words, in ink", sub: `since ${monthYear(T.firstPost)}`,
        say: `${fmt(T.words)} words, written since ${monthYear(T.firstPost)}.` },
      { type: "bars", secs: 5.5, enter: "up", head: "The long arc", note: `${peak.year}: ${peak.posts} posts, ${fmt(peak.words)} words`,
        items: D.byYear.map((y) => ({ label: y.year, value: y.words, hi: y === peak })), say: `Year by year. ${peak.year} alone: ${peak.posts} posts, ${fmt(peak.words)} words.` },
      { type: "calendar", secs: 6, enter: "zoom", head: "Every month, a blot", sub: "as large as its words", months: D.months,
        since: T.firstPost, until: T.latestPost, busiest: T.busiestMonth,
        say: `${T.activeMonths} months with ink in them. The busiest, ${T.busiestMonth.label}: ${T.busiestMonth.posts} posts.` },
      { type: "bars", secs: 3.5, enter: "left", head: `${topDay.day}s are for writing`, note: `${topDay.posts} posts`,
        items: D.week.map((w) => ({ label: w.day.slice(0, 3), value: w.posts, hi: w === topDay })), say: `${topDay.day} is writing day: ${topDay.posts} posts.` },
      { type: "hbars", secs: 3, enter: "right", head: "How long?", items: D.lengths.map((l) => ({ label: l.label, value: l.posts, hi: l === topLen })),
        say: `Most essays run ${topLen.label} words.` },
      { type: "list", style: "ledger", secs: 4, enter: "down", head: "Records", items: recs, say: recs.map((r) => `${r.label}: ${r.title}`).join(". ") + "." },
      { type: "end", secs: 4, enter: "iris", underline: true, kicker: `${T.posts} posts · ${D.platforms.map((p) => p.platform).join(" · ")}`, lines: ["Every word,", "counted."],
        say: `${T.posts} posts. Every word, counted.` },
    ];
  },

  microblog: (D) => {
    const A = D.all;
    const loud = D.years.reduce((a, y) => (y.posts > a.posts ? y : a), D.years[0]);
    return [
      { type: "count", art: "stars", secs: 4.5, enter: "zoom", value: A.posts, label: "short posts", sub: `since ${monthYear(A.first)}`, sky: D.sky, mr: A.langs.mr / A.posts,
        say: `${fmt(A.posts)} short posts since ${monthYear(A.first)}. Every one a star.` },
      { type: "clock", mode: "hours", secs: 5.5, enter: "tilt", hours: A.hours, peak: A.peakHour, head: `Peak hour: ${hourLabel(A.peakHour)}`, sub: `${fmt(A.night)} posts written after dark`,
        say: `Most are written late. Peak hour, ${hourLabel(A.peakHour)}. ${fmt(A.night)} of them after dark.` },
      { type: "split", secs: 5, enter: "left", a: { n: A.langs.en, label: "English" }, b: { n: A.langs.mr, label: "मराठी" },
        phrases: [...D.phrasesEn.slice(0, 4).map((p) => ({ text: p, mr: false })), ...D.phrasesMr.slice(0, 4).map((p) => ({ text: p, mr: true }))],
        say: `Two languages: ${fmt(A.langs.en)} in English, ${fmt(A.langs.mr)} in Marathi.` },
      { type: "bars", secs: 5, enter: "up", head: "Year by year", note: `${loud.year}: the loudest year`, short: true,
        items: D.years.map((y) => ({ label: `’${y.year.slice(2)}`, value: y.posts, hi: y === loud })), say: `${loud.year} was the loudest year: ${loud.posts} posts.` },
      D.first && { type: "typed", secs: 6, enter: "iris", kicker: `The first post · ${day(D.first.date)}`, quote: true, text: D.first.quote.replace(/\s+—.*$/, ""),
        say: `The first post: ${D.first.quote.replace(/\s+—.*$/, "")}` },
      { type: "end", secs: 4, enter: "down", stars: true, sky: D.sky, mr: A.langs.mr / A.posts, lines: ["Written after dark.", "Read any time."], chips: D.moods,
        say: "Written after dark. Read any time." },
    ].filter(Boolean);
  },

  presentations: (D) => {
    const pick = D.decks.slice(0, Math.min(12, D.decks.length));
    const dated = D.decks.filter((d) => d.date).sort((a, b) => a.date.localeCompare(b.date));
    const t0 = dated.length ? Date.parse(dated[0].date) : 0;
    const t1 = dated.length ? Date.parse(dated[dated.length - 1].date) : 1;
    const weeks = Math.max(1, (t1 - t0) / (7 * 864e5));
    const rate = dated.length / weeks;
    const rateText = rate >= 1 ? `${rate.toFixed(1)} a week` : `1 every ${Math.round(1 / rate)} weeks`;
    return [
      { type: "count", art: "beam", secs: 4, enter: "zoom", value: D.count, label: "decks, made for the web", shot: D.decks[0]?.shot, say: `${D.count} decks, made for the web.` },
      { type: "cards", style: "screen", secs: 0.85 * pick.length, enter: "right",
        items: pick.map((d, i) => ({ kicker: d.date ? day(d.date) : d.host, title: d.title, shot: d.shot, index: `${String(i + 1).padStart(2, "0")} / ${String(D.count).padStart(2, "0")}` })),
        say: `Newest first: ${pick.slice(0, 4).map((d) => d.title).join(". ")}.` },
      { type: "wall", secs: 6, enter: "zoom", shots: D.decks.map((d) => ({ shot: d.shot, title: d.title })), value: D.slides,
        label: D.slides ? `slides, at least · in ${D.slidesCounted} decks that count them` : "decks on one wall",
        say: D.slides ? `All ${D.count} on one wall: at least ${fmt(D.slides)} slides between them.` : `All ${D.count} on one wall.` },
      dated.length > 1 && { type: "dots", secs: 6, enter: "left", head: "The pace", fromDate: day(dated[0].date), toDate: day(dated[dated.length - 1].date),
        items: dated.map((d) => ({ t: (Date.parse(d.date) - t0) / Math.max(1, t1 - t0) })), big: rateText, sub: `${dated.length} dated decks in ${Math.round(weeks)} weeks`,
        say: `${dated.length} dated decks in ${Math.round(weeks)} weeks: about ${rateText}.` },
      { type: "end", secs: 4, enter: "up", shot: D.decks[0]?.shot, live: true, lines: ["Every deck runs live,", "right in the page."], say: "Every deck runs live, right in the page." },
    ].filter(Boolean);
  },

  sports: (D) => {
    const pick = evenly(D.races.filter((r) => r.photo), 8);
    const pbs = [
      D.pbTenK && { label: "10K", title: D.pbTenK.time, sub: `${D.pbTenK.title} · ${D.pbTenK.date}`, clock: toSecs(D.pbTenK.time) },
      D.pbHalf && { label: "Half marathon", title: D.pbHalf.time, sub: `${D.pbHalf.title} · ${D.pbHalf.date}`, clock: toSecs(D.pbHalf.time), stamp: toSecs(D.pbHalf.time) < 7200 ? "SUB-2" : null },
      D.pbMarathon && { label: "Marathon", title: D.pbMarathon.time, sub: `${D.pbMarathon.title} · ${D.pbMarathon.date}`, clock: toSecs(D.pbMarathon.time) },
    ].filter(Boolean);
    const last = D.races.filter((r) => r.photo).slice(-1)[0];
    return [
      { type: "countdown", secs: 3, enter: "zoom", say: "Three. Two. One. Go." },
      { type: "cards", style: "fullbleed", secs: 1.0 * pick.length, enter: "right",
        items: pick.map((r) => ({ kicker: `${day(r.date)} · ${r.city || ""}`, title: r.title, photo: r.photo, badge: r.bib, stats: [r.km ? `${Math.round(r.km * 10) / 10} km` : "", r.time || ""] })),
        say: `${D.count} races since ${monthYear(D.first)}. ${pick.slice(0, 3).map((r) => r.title).join(", ")}…` },
      { type: "hbars", style: "track", secs: 5, enter: "left", head: "10K → 50K", items: D.distances.map((d, i, a) => ({ label: d.name, value: d.n, hi: i === a.length - 1, prefix: "×" })),
        say: `From 10K to a 50K ultra: ${D.distances.map((d) => `${d.n} ${d.name}`).join(", ")}.` },
      { type: "list", style: "clock", secs: 6, enter: "up", head: "Personal bests", items: pbs,
        say: `Personal bests: ${pbs.map((p) => `${p.label} in ${p.title}`).join(", ")}.` },
      { type: "bars", secs: 4, enter: "down", head: "Year by year", items: D.perYear.map((y, i, a) => ({ label: String(y.year), value: y.count, sub: `${y.km} km`, hi: i === a.length - 1 })),
        say: `${D.perYear.map((y) => `${y.year}: ${y.count}`).join(". ")}.` },
      { type: "end", secs: 4, enter: "wipe", photo: last?.photo, tape: true, lines: [`${D.count} races`, `${fmt(D.km)} km`, "Every finish line."],
        say: `${D.count} races. ${fmt(D.km)} kilometres. Every finish line.` },
    ];
  },

  treks: (D) => {
    const pick = evenly(D.treks.filter((t) => t.photo), 10);
    const L = D.longest;
    return [
      { type: "count", art: "ridge", secs: 4, enter: "up", value: D.count, label: "forts of the Sahyadri", sub: `over ${D.years} years`, say: `${D.count} forts of the Sahyadri, climbed over ${D.years} years.` },
      { type: "cards", style: "postcard", secs: 1.1 * pick.length, enter: "left",
        items: pick.map((t) => ({ kicker: day(t.date), title: t.name, photo: t.photo, badge: t.level, year: String(t.year), index: `${String(D.treks.indexOf(t) + 1).padStart(2, "0")}/${D.count}` })),
        say: `In the order they were climbed: ${pick.slice(0, 5).map((t) => t.name).join(", ")}…` },
      { type: "peaks", secs: 5.5, enter: "down", head: "How hard?", items: ["Easy", "Medium", "Hard"].map((k) => ({ label: k, value: D.levels[k] })), note: `${D.written} forts have their story written up`,
        say: `${D.levels.Easy} easy, ${D.levels.Medium} medium, ${D.levels.Hard} hard. ${D.written} written up.` },
      L && { type: "clock", mode: "fill", secs: 5.5, enter: "zoom", hours: L.hours, photo: L.photo, head: L.name, sub: day(L.date), say: `The longest: ${L.name}, ${L.hours} hours on foot.` },
      { type: "end", secs: 4, enter: "iris", ridge: true, lines: ["Some take two hours.", L ? `One took ${L.hours}.` : ""], kicker: `${D.hours} hours on the trail · ${D.count} forts`,
        say: `Some take two hours. One took ${L ? L.hours : "all night"}.` },
    ].filter(Boolean);
  },
};

// --- resolve: frames, item timings, captions, sound cues ----------------------------------

const PAN = { left: -0.7, right: 0.7, up: 0, down: 0, zoom: 0, wipe: -0.4, tilt: 0.4, iris: 0 };

function resolveItems(s) {
  // Items enter in the first ~65% of the scene; cards split the scene evenly.
  const n = (s.items || []).length;
  if (s.type === "cards") {
    const per = s.dur / Math.max(1, n);
    s.items = s.items.map((it, i) => ({ ...it, at: Math.round(i * per), len: Math.round(per), enter: i === 0 ? s.enter : ENTERS[(i * 3 + 1) % 4] }));
    return;
  }
  const start = 10;
  const span = Math.max(1, s.dur * 0.62 - start);
  s.items = (s.items || []).map((it, i) => ({ ...it, at: Math.round(start + (n > 1 ? (i / (n - 1)) * span * (n > 3 ? 1 : 0.6) : 0)) }));
}

function chunkCaption(text, from, dur) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const chunks = [];
  for (let i = 0; i < words.length;) {
    let j = i;
    let len = 0;
    while (j < words.length && (j - i < 3 || (len + words[j].length < 30 && j - i < 7))) { len += words[j].length + 1; j += 1; }
    chunks.push(words.slice(i, j));
    i = j;
  }
  const weight = (w) => 2 + w.replace(/[^\p{L}\p{N}]/gu, "").length;
  const total = words.reduce((a, w) => a + weight(w), 0);
  const usable = Math.max(10, dur - 8);
  let t = from + 4;
  return chunks.map((c) => {
    const ws = c.map((w) => {
      const len = (weight(w) / total) * usable;
      const at = Math.round(t);
      t += len;
      return { w, at, end: Math.round(t) };
    });
    return { from: ws[0].at, to: ws[ws.length - 1].end, words: ws };
  });
}

function sfxFor(s) {
  const out = [];
  const at = (f) => s.from + f;
  out.push({ at: at(0), kind: s.enter === "zoom" || s.enter === "iris" ? "boom" : "whoosh", pan: PAN[s.enter] || 0 });
  const items = s.items || [];
  switch (s.type) {
    case "countdown":
      [0, 1, 2].forEach((k) => out.push({ at: at(Math.round(k * (s.dur / 4))), kind: "beep", pitch: 0 }));
      out.push({ at: at(Math.round(3 * (s.dur / 4))), kind: "gun" });
      break;
    case "count":
    case "wall":
    case "tiles": {
      const counts = s.type === "tiles" ? items.map((it) => [it.at, it.at + 30]) : [[s.type === "wall" ? 50 : 14, s.type === "wall" ? 100 : 70]];
      counts.forEach(([a, b], k) => {
        for (let f = a; f < b; f += 3) out.push({ at: at(f), kind: "tick", pitch: (f - a) / (b - a) + k * 0.15, gain: 0.5 });
        out.push({ at: at(b), kind: "ding", pitch: k * 0.2 });
      });
      if (s.type === "tiles") items.forEach((it) => out.push({ at: at(it.at), kind: "pop", pitch: 0.3 }));
      if (s.type === "wall") s.shots.forEach((_, i) => { if (i % 2 === 0) out.push({ at: at(Math.round((i / s.shots.length) * 45)), kind: "pop", pitch: i / s.shots.length, gain: 0.35 }); });
      break;
    }
    case "typed": {
      const cps = s.quote ? 1 : 1.6; // chars per frame
      const n = s.text.length;
      for (let c = 0; c < n; c += 2) if (s.text[c] !== " ") out.push({ at: at(8 + Math.round(c / cps)), kind: "key", pitch: (c * 7) % 5 / 5 });
      out.push({ at: at(8 + Math.round(n / cps)), kind: "bell" });
      break;
    }
    case "cards":
      items.forEach((it, i) => {
        if (i > 0) out.push({ at: at(it.at), kind: s.style === "fullbleed" || s.style === "postcard" ? "shutter" : "swish", pan: PAN[it.enter] || 0 });
        if (it.badge) out.push({ at: at(it.at + 6), kind: "stamp", gain: 0.5 });
      });
      break;
    case "list":
      items.forEach((it, i) => {
        out.push({ at: at(it.at), kind: "swish", pan: -0.5, pitch: i / Math.max(1, items.length), gain: 0.6 });
        if (s.style === "dots") for (let d = 0; d < it.dots; d += 1) out.push({ at: at(it.at + 6 + d * 3), kind: "pop", pitch: 0.5 + d * 0.12, gain: 0.3 });
        if (s.style === "clock") {
          for (let f = 0; f < 36; f += 2) out.push({ at: at(it.at + 3 + f), kind: "tick", pitch: f / 36, gain: 0.35 });
          out.push({ at: at(it.at + 40), kind: "ding" });
          if (it.stamp) out.push({ at: at(it.at + 46), kind: "stamp" });
        }
      });
      break;
    case "timeline":
      items.forEach((it, i) => out.push({ at: at(it.at), kind: "pop", pitch: i / Math.max(1, items.length), gain: 0.7 }));
      break;
    case "bars":
    case "hbars":
    case "peaks":
      items.forEach((it, i) => out.push({ at: at(it.at), kind: "rise", pitch: it.value / maxOf(items.map((x) => x.value)), gain: it.hi ? 0.9 : 0.5 }));
      if (s.note) out.push({ at: at(Math.round(s.dur * 0.72)), kind: "stamp", gain: 0.55 });
      break;
    case "calendar":
      for (let f = 14; f < 14 + Math.round(s.dur * 0.6); f += 4) out.push({ at: at(f), kind: "drip", pitch: ((f * 13) % 7) / 7, gain: 0.4 });
      out.push({ at: at(Math.round(s.dur * 0.78)), kind: "stamp", gain: 0.5 });
      break;
    case "clock": {
      const end = Math.round(s.dur * 0.6);
      const steps = s.mode === "fill" ? Math.min(24, Math.ceil(s.hours)) : 24;
      for (let k = 0; k < steps; k += 1) out.push({ at: at(12 + Math.round((k / steps) * (end - 12))), kind: "tick", pitch: k / steps, gain: 0.45 });
      out.push({ at: at(end + 2), kind: "ding" });
      break;
    }
    case "split":
      (s.phrases || []).forEach((p, i) => out.push({ at: at(40 + i * 8), kind: "pop", pitch: p.mr ? 0.2 : 0.7, gain: 0.35, pan: i % 2 ? 0.5 : -0.5 }));
      break;
    case "dots":
      items.forEach((it, i) => out.push({ at: at(it.at), kind: "pop", pitch: it.t, gain: 0.4, pan: it.t * 1.4 - 0.7 }));
      out.push({ at: at(Math.round(s.dur * 0.7)), kind: "stamp" });
      break;
    case "sheet":
      for (let c = 0; c < 14; c += 1) out.push({ at: at(18 + c * 2), kind: "key", pitch: (c % 4) / 4 });
      break;
    case "stopwatch":
      for (let f = 6; f < s.dur - 6; f += 15) out.push({ at: at(f), kind: "tick", pitch: 0.2, gain: 0.6 });
      break;
    case "end":
      out.push({ at: at(-20), kind: "riser" });
      out.push({ at: at(18), kind: "chime" });
      if (s.tape) out.push({ at: at(40), kind: "snap" });
      break;
    default:
  }
  return out;
}

// A scene's name in the chapter list the /films page and the players show.
const CARD_NAMES = { chapter: "Five chapters", screen: "The decks", fullbleed: "Race day", postcard: "Postcards" };
const TYPE_NAMES = { count: "Opening", countdown: "On your marks", stopwatch: "How long?", sheet: "The sheet", split: "Two languages", wall: "The wall", end: "The end" };
function chapterOf(s) {
  if (s.type === "cards") return CARD_NAMES[s.style] || "Cards";
  if (s.type === "typed") return s.quote ? "The first post" : "In 10 seconds";
  if (s.type === "clock") return s.mode === "fill" ? "The longest" : "The clock";
  return TYPE_NAMES[s.type] || s.head || "Scene";
}

/** The whole film: scenes with frames, captions and sound cues. */
export function buildFilm(key, data) {
  const list = FILMS[key](data);
  const sum = list.reduce((a, s) => a + s.secs, 0);
  let from = 0;
  const scenes = list.map((s, i) => {
    const last = i === list.length - 1;
    const dur = last ? TOTAL - from : Math.round((s.secs / sum) * TOTAL);
    const out = { ...s, from, dur, id: `${s.type}-${i}`, last };
    from += dur;
    resolveItems(out);
    return out;
  });
  scenes.forEach((s) => { s.chapter = chapterOf(s); });
  const captions = scenes.flatMap((s) => chunkCaption(s.say, s.from, s.dur));
  const sfx = scenes.flatMap(sfxFor).filter((e) => e.at >= 0 && e.at < TOTAL).sort((a, b) => a.at - b.at);
  const hits = scenes.filter((s) => s.enter === "zoom" || s.enter === "iris").map((s) => s.from / FPS);
  return { key, theme: THEMES[key], scenes, captions, sfx, hits, frames: TOTAL };
}

export const FILM_KEYS = Object.keys(FILMS);
