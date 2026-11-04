// What each page film says, read from the same places the pages read.
//
// Rows come from Supabase with the publishable key (every table here is public
// to read), shaped by the pages' own pure modules — raceLog, trekLog,
// resumeModel, aboutModel — and the site-wide numbers from the live
// /api/stats snapshot (scripts/lib/statsSource.mjs). The Writing Ledger and the
// Micro-blog films read their committed JSON. Nothing is typed in: a film
// whose number is missing leaves that beat out rather than showing a zero.
//
// Photos (races, forts) and deck screenshots are fetched once into gitignored
// knowledge_base/page-films/ and handed to film.html as file:// URLs.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

import { getStatsPayload } from "../lib/statsSource.mjs";
import { enrichRaces, raceSummary, perYear as racesPerYear, distanceName, formatDuration } from "../../src/lib/raceLog.js";
import { enrichTreks, trekSummary, perYear as treksPerYear, trekTitle } from "../../src/lib/trekLog.js";
import { groupPositions, professionalMonths, sortCertifications, parseDaterange } from "../../src/lib/resumeModel.js";
import { parseAbout } from "../../src/lib/aboutModel.js";
import { REACTIONS, issueSections, issueStats, itemTitle, slugLabel } from "../../src/lib/newsletterIssue.js";

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
export const OUT = path.join(ROOT, "knowledge_base", "page-films");
const CACHE = path.join(OUT, "cache");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://xjqbvvurlmbslikiukdm.supabase.co";
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_8FUmeJKKuTHvy3JFNPLfnQ_9TY6P2GG";
const STORAGE = `${SUPABASE_URL}/storage/v1/object/public/media`;

const fileUrl = (p) => pathToFileURL(p).href;
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}` };
async function rest(table, select = "*", query = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${query}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
  return res.json();
}

const toStorage = (u) => (!u ? null : u.startsWith("http") ? u : STORAGE + u);

// One photo, downloaded once. resvg is not involved here (Chrome draws the
// frames), so WebP is fine; a failed download is simply no photo.
async function photo(url) {
  if (!url) return null;
  fs.mkdirSync(path.join(CACHE, "photos"), { recursive: true });
  const ext = (url.match(/\.(jpe?g|png|webp|gif)(?:$|\?)/i) || [, "jpg"])[1].toLowerCase();
  const file = path.join(CACHE, "photos", `${crypto.createHash("sha1").update(url).digest("hex").slice(0, 16)}.${ext}`);
  if (!fs.existsSync(file)) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    } catch (_) {
      return null;
    }
  }
  return fileUrl(file);
}

// Two at a time is plenty for ~60 small photos and kind to the bucket.
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const i = next++;
      // eslint-disable-next-line no-await-in-loop
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
}

const iso = (d) => (d ? d.toISOString().slice(0, 10) : null);

// --- per film --------------------------------------------------------------------

async function about(stats, payload) {
  const md = fs.readFileSync(path.join(ROOT, "src", "data", "about.md"), "utf8");
  const m = parseAbout(md);
  const logbook = readJson("public/data/logbook.json").totals;
  return {
    line: m.tenSeconds,
    chapters: (m.chapters || []).map((c) => c.title),
    principles: (m.principles || []).map((p) => p.title || p.text).filter(Boolean),
    projects: stats.projectCount,
    races: stats.totalRaces,
    km: stats.totalKmRun,
    treks: stats.totalTreks,
    books: stats.booksCount,
    booksMarathi: stats.booksMarathi,
    essays: logbook.posts,
    micro: payload.micro?.total,
    certs: stats.certCount,
    me: fileUrl(path.join(ROOT, "public", "images", "me.jpg")),
  };
}

async function resume(stats) {
  const [pos, deg, cert, skills] = await Promise.all([
    rest("resume_positions"), rest("resume_degrees"), rest("resume_certifications"), rest("resume_skills"),
  ]);
  const positions = pos.map((r) => ({ id: r.id, company: r.company, position: r.position, daterange: r.daterange, points: r.points || [] }));
  const groups = groupPositions(positions);
  const roles = groups.flatMap((g) => g.items.map((r) => ({
    company: r.company.replace(/\s+Pvt Ltd$/i, "").trim(),
    position: r.position.trim(),
    group: g.key,
    start: parseDaterange(r.daterange).start?.y ?? null,
    current: !!r.current,
    duration: r.duration,
  }))).filter((r) => r.start).sort((a, b) => a.start - b.start || (a.current ? 1 : -1));
  const certs = sortCertifications(cert.map((c) => ({ name: c.name, source: c.source, issuedDate: c.issued_date })));
  const months = professionalMonths(positions);
  return {
    roles,
    current: roles.filter((r) => r.current).map((r) => `${r.position} · ${r.company}`)[0] || null,
    years: months ? Math.floor(months / 12) : null,
    projects: stats.projectCount,
    certs: certs.map((c) => ({ name: c.name, source: c.source, year: c.year })),
    degrees: deg.map((d) => ({ school: d.school, degree: d.degree, year: d.year })).sort((a, b) => a.year - b.year),
    skills: skills.slice().sort((a, b) => b.competency - a.competency || a.sort_order - b.sort_order)
      .slice(0, 8).map((s) => ({ title: s.title, level: s.competency })),
    skillCount: skills.length,
  };
}

function ledger() {
  const d = readJson("public/data/writing-ledger.json");
  return {
    totals: d.totals,
    byYear: d.byYear.map((y) => ({ year: y.year, posts: y.posts, words: y.words })),
    months: d.byMonth.map((m) => ({ month: m.month, words: m.words, posts: m.posts })),
    week: d.byDayOfWeek,
    lengths: d.byLength,
    platforms: d.byPlatform.map((p) => ({ platform: p.platform, posts: p.posts })),
    topics: d.byTag.filter((t) => !/100_days/.test(t.tag)).slice(0, 5).map((t) => ({ tag: t.tag.replace(/[-_]/g, " "), posts: t.posts })),
    longest: d.totals.longestPost,
    ytd: d.currentPeriod?.yearToDate || null,
    latest: d.posts[0] ? { title: d.posts[0].title, date: d.posts[0].date } : null,
  };
}

function microblog() {
  const d = readJson("public/data/microblog-insights.json");
  const first = (d.moments || []).find((m) => m.why === "first");
  const quote = (y) => d.yearQuotes?.[y];
  return {
    all: { posts: d.all.posts, days: d.all.days, words: d.all.words, first: d.all.first, last: d.all.last, night: d.all.night, timed: d.all.timed, peakHour: d.all.peakHour, hours: d.all.hours, langs: d.all.langs },
    years: d.years.map((y) => ({ year: y, posts: d.perYear[y]?.posts || 0 })),
    phrasesEn: (d.phrases?.en || []).slice(0, 6).map(([p]) => p),
    phrasesMr: (d.phrases?.mr || []).slice(0, 5).map(([p]) => p),
    moods: (d.moods?.list || []).map((m) => m.label),
    first: first ? { date: first.date, quote: first.quote } : null,
    recent: quote(d.years[d.years.length - 1]) || null,
    sky: (d.sky?.points || []).slice(0, 2400),
  };
}

async function presentations(browserShots) {
  const rows = await rest("presentations");
  const decks = rows.map((r) => ({ id: r.id, title: r.title, date: r.date, url: r.url, description: r.description || "" }))
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id - a.id);
  const shots = await browserShots(decks);
  const slideCount = (s) => {
    const w = { twelve: 12, twenty: 20, thirty: 30, "thirty-nine": 39, "sixty-two": 62, "twenty-two": 22, "twenty-three": 23, "twenty-four": 24, six: 6 };
    const m = s.match(/\b(\d+)-slide|\b(\d+) (?:illustrated |interactive |hand-illustrated )*slides/i)
      || s.match(/^(\w+(?:-\w+)?) (?:illustrated, narrated |illustrated |interactive |hand-illustrated )*slides/i);
    if (!m) return null;
    const v = m[1] || m[2];
    return Number(v) || w[String(v).toLowerCase()] || null;
  };
  const counted = decks.map((d) => slideCount(d.description)).filter(Boolean);
  const dated = decks.filter((d) => d.date).map((d) => d.date).sort();
  return {
    decks: decks.map((d, i) => ({ title: d.title, date: d.date, shot: shots[i], host: new URL(d.url).host })),
    count: decks.length,
    slides: counted.length ? counted.reduce((a, b) => a + b, 0) : null,
    slidesCounted: counted.length,
    since: dated[0] || null,
    latest: dated[dated.length - 1] || null,
  };
}

async function sports(stats) {
  const rows = await rest("sports");
  const races = enrichRaces(rows.map((r) => ({ ...r, slideImages: (r.slide_images || []).map((s) => ({ ...s, url: toStorage(s.url) })) })))
    .filter((r) => r.dateObj).sort((a, b) => a.dateObj - b.dateObj);
  const sum = raceSummary(races);
  const photos = await mapLimit(races, 3, (r) => photo(r.slideImages[0]?.url));
  const dist = {};
  races.forEach((r) => { if (r.distKey != null) dist[r.distKey] = (dist[r.distKey] || 0) + 1; });
  const pb = (p) => (p ? { time: p.time, title: p.title, date: p.date } : null);
  return {
    races: races.map((r, i) => ({ title: r.title.trim(), date: iso(r.dateObj), year: r.year, dist: r.distKey, km: r.km, time: r.time, secs: r.secs, city: r.city, bib: r.bib_number || null, photo: photos[i] })),
    count: sum.count,
    km: Math.round(sum.km),
    hours: Math.round(sum.secs / 3600),
    cities: sum.cities.length,
    first: sum.first ? iso(sum.first.dateObj) : null,
    distances: Object.entries(dist).map(([k, n]) => ({ key: Number(k), name: distanceName(Number(k)), n })).sort((a, b) => a.key - b.key),
    perYear: racesPerYear(races).map((y) => ({ year: y.year, count: y.count, km: Math.round(y.km) })),
    pbHalf: pb(stats.pbHalf),
    pbMarathon: pb(stats.pbMarathon),
    pbTenK: pb(stats.pbTenK),
    longest: races.reduce((a, r) => (!a || (r.km || 0) > (a.km || 0) ? r : a), null)?.title?.trim() || null,
    fmt: formatDuration(sum.secs),
  };
}

async function treks() {
  const rows = await rest("treks");
  const list = enrichTreks(rows.map((r) => ({ ...r, slideImages: (r.slide_images || []).map((s) => ({ ...s, url: toStorage(s.url) })) })))
    .filter((t) => t.dateObj).sort((a, b) => a.dateObj - b.dateObj);
  const sum = trekSummary(list);
  const photos = await mapLimit(list, 3, (t) => photo(t.slideImages[0]?.url));
  const levels = { Easy: 0, Medium: 0, Hard: 0 };
  list.forEach((t) => { if (levels[t.level] != null) levels[t.level] += 1; });
  const longest = list.reduce((a, t) => (!a || (t.hours || 0) > (a.hours || 0) ? t : a), null);
  return {
    treks: list.map((t, i) => ({ name: trekTitle(t), date: iso(t.dateObj), year: t.year, level: t.level, hours: t.hours, written: !!t.blog_link, photo: photos[i] })),
    count: sum.count,
    hours: Math.round(sum.hours),
    years: sum.years,
    levels,
    written: list.filter((t) => t.blog_link).length,
    longest: longest ? { name: trekTitle(longest), hours: longest.hours, date: iso(longest.dateObj), photo: photos[list.indexOf(longest)] } : null,
    perYear: treksPerYear(list).map((y) => ({ year: y.year, count: y.count })),
  };
}

// --- the four 45-second films --------------------------------------------------------

const SITE = process.env.FILM_SITE || "https://sankettambare.in";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const firstSentences = (text, max) => {
  const parts = String(text || "").replace(/[#*_>`]/g, "").replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+(?=\s|$)/g) || [];
  let out = "";
  for (const p of parts) { // eslint-disable-line no-restricted-syntax
    if ((out + p).length > max) break;
    out += p;
  }
  return out.trim() || null;
};

async function newsletter(pageShots) {
  const rows = (await rest("now_months", "*", "&published_at=not.is.null&order=year.desc"))
    .filter((r) => r.slug && !r.is_current).sort((a, b) => b.slug.localeCompare(a.slug));
  const cards = await mapLimit(rows, 3, (r) => photo(r.card_url));
  const latest = rows[0];
  const items = latest ? issueSections(latest.sections).flatMap((sec) => sec.items.slice(0, 2).map((it) => ({ section: sec.label, title: itemTitle(sec.key, it) })))
    .filter((it) => it.title).slice(0, 8) : [];
  return {
    count: rows.length,
    since: slugLabel(rows[rows.length - 1]?.slug),
    issues: rows.map((r, i) => ({ slug: r.slug, label: slugLabel(r.slug), headline: r.headline || slugLabel(r.slug), card: cards[i], stats: issueStats(r.sections || {}) })),
    latest: latest ? {
      label: slugLabel(latest.slug), headline: latest.headline, letter: firstSentences(latest.note, 170), items, stats: issueStats(latest.sections || {}),
    } : null,
    reactions: REACTIONS.map((r) => r.label),
    shots: await pageShots("/newsletter"),
  };
}

const CHALLENGE = "100_days_to_offload";
async function offload(pageShots) {
  const rows = (await rest("blogs", "id,blog_title,blog_date,blog_platform,language,tag_names", "&order=blog_date.asc"))
    .filter((b) => b.blog_date);
  const year = Number(rows[rows.length - 1]?.blog_date.slice(0, 4)) || new Date().getFullYear();
  const start = Date.UTC(year, 0, 1);
  const now = new Date();
  const day = Math.min(365, Math.max(1, Math.floor((now - new Date(year, 0, 1)) / 864e5) + 1));
  const months = Array(12).fill(0);
  const tags = {};
  rows.forEach((b) => {
    if (Number(b.blog_date.slice(0, 4)) === year) months[Number(b.blog_date.slice(5, 7)) - 1] += 1;
    (b.tag_names || []).filter((t) => t.toLowerCase() !== CHALLENGE).forEach((t) => { tags[t] = (tags[t] || 0) + 1; });
  });
  return {
    count: rows.length, // the page counts every row, as this does
    goal: 100,
    year,
    day,
    monthNow: now.getFullYear() === year ? now.getMonth() : 11,
    expected: Math.round((day / 365) * 100),
    posts: rows.map((b) => ({
      title: b.blog_title.trim(), date: b.blog_date, platform: b.blog_platform, language: b.language,
      t: Math.min(1, Math.max(0, (Date.parse(b.blog_date) - start) / (365 * 864e5))),
    })),
    months,
    tags: Object.entries(tags).sort((a, b) => b[1] - a[1]).map(([tag, n]) => ({ tag, n })),
    langs: { en: rows.filter((b) => b.language !== "Marathi").length, mr: rows.filter((b) => b.language === "Marathi").length },
    shots: await pageShots("/100-days-to-offload"),
  };
}

const NOW_GLYPH = { running: "run", events: "peak", books: "book", blogs: "pen", micro: "pen", projects: "code", certificates: "gear", website: "globe", misc: "globe" };
async function now(pageShots) {
  const [cur] = await rest("now_months", "*", "&is_current=eq.true");
  const [meta] = await rest("now_meta");
  if (!cur) throw new Error("now: no current month");
  const mi = MONTHS.indexOf(cur.month);
  return {
    month: cur.month,
    year: cur.year,
    prev: mi >= 0 ? MONTHS[(mi + 11) % 12] : null,
    inspired: meta?.inspired_by?.name || null,
    story: firstSentences(meta?.intro_story, 150),
    rituals: (meta?.daily_rituals || []).map((r) => ({ label: r.label, description: r.description })),
    sections: issueSections(cur.sections || {}).map((sec) => ({
      key: sec.key, label: sec.label, n: sec.items.length, glyph: NOW_GLYPH[sec.key], titles: sec.items.map((it) => itemTitle(sec.key, it)).filter(Boolean).slice(0, 3),
    })),
    shots: await pageShots("/now"),
  };
}

// One real exchange with /api/ask, asked once and cached: a film should show
// the archive answering, not a mock-up of it. FILM_ASK picks the question.
const ASK_QUESTION = process.env.FILM_ASK || "What has running taught him?";
async function askOnce(question) {
  const file = path.join(CACHE, `ask-${crypto.createHash("sha1").update(question).digest("hex").slice(0, 12)}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  const res = await fetch(`${SITE}/api/ask`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: question }) });
  if (!res.ok) { console.warn(`  /api/ask answered ${res.status}; the film leaves the exchange out`); return null; }
  const d = await res.json();
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(d));
  return d;
}

async function ask(pageShots) {
  const [facts, [settings], chunks] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/rpc/site_facts`, { method: "POST", headers: { ...HEADERS, "Content-Type": "application/json" }, body: "{}" }).then((r) => r.json()),
    rest("ask_settings", "question_pool,tiers"),
    fetch(`${SUPABASE_URL}/rest/v1/content_chunks?select=id&limit=1`, { headers: { ...HEADERS, Prefer: "count=exact" } })
      .then((r) => Number((r.headers.get("content-range") || "").split("/")[1]) || null),
  ]);
  const counts = { ...(facts?.counts || {}) };
  delete counts.tags;
  const pool = (settings?.question_pool || []).filter((x) => x?.q);
  // One per category, Marathi ones kept, the film's own question among them.
  const byCat = {};
  pool.forEach((x) => { (byCat[x.c] = byCat[x.c] || []).push(x.q); });
  const questions = [];
  Object.values(byCat).forEach((qs) => {
    const en = qs.find((q) => !/[ऀ-ॿ]/.test(q) && q !== ASK_QUESTION);
    const mr = qs.find((q) => /[ऀ-ॿ]/.test(q));
    if (en) questions.push(en);
    if (mr && questions.filter((q) => /[ऀ-ॿ]/.test(q)).length < 2) questions.push(mr);
  });
  const chips = [...questions.slice(0, 7), ASK_QUESTION].sort((a, b) => (a.length % 5) - (b.length % 5));
  const reply = await askOnce(ASK_QUESTION);
  const answer = reply?.answer ? firstSentences(reply.answer.replace(/\[(.+?)\]\(.+?\)/g, "$1").replace(/\s*\[\d+\]/g, ""), 300) : null;
  return {
    chunks,
    counts,
    things: Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0),
    questions: chips.map((q) => ({ q, mr: /[ऀ-ॿ]/.test(q) })),
    pick: chips.indexOf(ASK_QUESTION),
    question: ASK_QUESTION,
    answer,
    tier: reply?.tier || null,
    sources: (reply?.sources || []).filter((x) => x.title && !["tag", "stats"].includes(x.entity_type)).slice(0, 5)
      .map((x) => ({ type: x.entity_type, title: x.title.trim(), date: x.date })),
    tiers: (settings?.tiers || []).filter((t) => t.enabled !== false).map((t) => ({ name: t.name, model: String(t.model).replace(/^@cf\/[^/]+\//, ""), provider: t.provider === "gemini" ? "Gemini" : "Workers AI" })),
    shots: await pageShots("/ask"),
  };
}

/** Every film's data, or just the ones named. */
export async function gather(names, { deckShots, pageShots }) {
  const { payload, from } = await getStatsPayload();
  console.info(`Stats from ${from}.`);
  const s = payload.stats;
  const jobs = {
    about: () => about(s, payload),
    resume: () => resume(s),
    ledger: () => ledger(),
    microblog: () => microblog(),
    presentations: () => presentations(deckShots),
    sports: () => sports(s),
    treks: () => treks(),
    newsletter: () => newsletter(pageShots),
    offload: () => offload(pageShots),
    now: () => now(pageShots),
    ask: () => ask(pageShots),
  };
  const out = {};
  for (const n of names) { // eslint-disable-line no-restricted-syntax
    // eslint-disable-next-line no-await-in-loop
    out[n] = await jobs[n]();
  }
  return out;
}
