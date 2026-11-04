// The /about page's model: src/data/about.md parsed into reading tiers, the
// "How I work" principles matched against the projects that show them, and a
// life timeline assembled from the resume, races, treks and projects.
//
// about.md is hand-written and edited from the command line by
// `npm run about` (scripts/about.mjs), which uses this same parser, so the page
// and the script cannot disagree about what a section holds.

// eslint-disable-next-line import/extensions -- Node (scripts/about.mjs) imports this file too
import { parseLooseDate, parseDaterange } from "./resumeModel.js";

export const WORDS_PER_MINUTE = 230;

// Whitespace-separated tokens that hold a letter or digit. Splitting on
// letters alone breaks Marathi words at every vowel sign (\p{M}).
export const wordCount = (text) => String(text || "").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** Seconds to read a text at WORDS_PER_MINUTE, never below one second. */
export const readingSeconds = (text) => Math.max(1, Math.round((wordCount(text) / WORDS_PER_MINUTE) * 60));

export const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** `# Heading` → raw body, in file order. Front matter is skipped. */
export function splitSections(md) {
  const text = String(md || "").replace(/^---[\s\S]*?---\r?\n/, "");
  const out = [];
  let current = null;
  text.split(/\r?\n/).forEach((line) => {
    const h = line.match(/^#\s+(.+?)\s*$/);
    if (h) {
      current = { title: h[1], key: slug(h[1]), lines: [] };
      out.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  });
  return out.map((s) => ({ title: s.title, key: s.key, body: s.lines.join("\n").trim() }));
}

const paragraphs = (body) => String(body || "")
  .split(/\n\s*\n/)
  .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
  .filter((p) => p && !/^#/.test(p));

const listItems = (body) => String(body || "")
  .split(/\r?\n/)
  .map((l) => l.match(/^\s*[-*]\s+(.+)$/))
  .filter(Boolean)
  .map((m) => m[1].trim());

/** "[Label](url)" → { label, url }; plain text → { label, url: null }. */
export const parseLink = (item) => {
  const m = String(item).match(/^\[(.+?)\]\((.+?)\)\s*$/);
  return m ? { label: m[1], url: m[2] } : { label: item, url: null };
};

/** "**Title.** Body [evidence: a|b]" → { title, body, pattern }. */
export function parsePrinciple(item) {
  let rest = String(item);
  let pattern = null;
  const ev = rest.match(/\s*\[evidence:\s*(.+?)\]\s*$/i);
  if (ev) {
    pattern = ev[1].trim();
    rest = rest.slice(0, ev.index);
  }
  const t = rest.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  const title = (t ? t[1] : rest).trim().replace(/[.:]$/, "");
  const body = (t ? t[2] : "").trim();
  return { title, body, pattern };
}

// `## Chapter` blocks inside a section.
const chaptersOf = (body) => {
  const out = [];
  let cur = null;
  String(body || "").split(/\r?\n/).forEach((line) => {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = { title: h[1], key: slug(h[1]), lines: [] };
      out.push(cur);
    } else if (cur) cur.lines.push(line);
  });
  return out.map((c) => ({ title: c.title, key: c.key, body: paragraphs(c.lines.join("\n")).join("\n\n") }));
};

// The section headings about.md is expected to carry, and what each becomes.
export const ABOUT_SECTIONS = [
  { key: "10-seconds", kind: "text", note: "One line. Aim for 15–25 words." },
  { key: "updates", kind: "updates", note: "`- YYYY-MM-DD — text [#career] [(https://…)]`, newest first." },
  { key: "5-minutes", kind: "chapters", note: "`## Chapter` blocks, one paragraph each." },
  { key: "10-minutes", kind: "paragraphs", note: "The long story, in paragraphs." },
  { key: "how-i-work", kind: "principles", note: "`- **Title.** Body [evidence: regex]`" },
  { key: "facts", kind: "list" },
  { key: "i-like", kind: "list" },
  { key: "podcasts", kind: "links" },
  { key: "short-bio", kind: "text", note: "40–60 words, third person." },
  { key: "ask-me", kind: "list", note: "Questions the archive answers well." },
];

/** about.md → the page's model. Missing sections come back empty. */
export function parseAbout(md) {
  const sections = Object.fromEntries(splitSections(md).map((s) => [s.key, s.body]));
  return {
    tenSeconds: paragraphs(sections["10-seconds"]).join(" "),
    chapters: chaptersOf(sections["5-minutes"]),
    long: paragraphs(sections["10-minutes"]),
    principles: listItems(sections["how-i-work"]).map(parsePrinciple),
    facts: listItems(sections.facts),
    likes: listItems(sections["i-like"]),
    podcasts: listItems(sections.podcasts).map(parseLink),
    shortBio: paragraphs(sections["short-bio"]).join(" "),
    questions: listItems(sections["ask-me"]),
    // eslint-disable-next-line no-use-before-define -- declared with the other update helpers below
    updates: listItems(sections.updates).map(parseUpdateLine).filter(Boolean),
  };
}

const projectText = (p) => [
  p.title, p.subtitle, p.desc, p.outcome, p.solution, ...(p.highlights || []), ...(p.techStack || []),
].filter(Boolean).join(" ").toLowerCase();

/** Each principle with the visible projects whose text matches its pattern. */
export function principlesWithEvidence(principles = [], projects = [], { limit = 4 } = {}) {
  const visible = projects
    .filter((p) => p.visible !== false)
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || String(b.date || "").localeCompare(String(a.date || "")));
  return principles.map((pr) => {
    let re = null;
    try { re = pr.pattern ? new RegExp(pr.pattern, "i") : null; } catch (_) { re = null; }
    const hits = re ? visible.filter((p) => re.test(projectText(p))) : [];
    return { ...pr, count: hits.length, projects: hits.slice(0, limit).map((p) => ({ id: p.id, title: p.title })) };
  });
}

const kmOf = (distance) => {
  const m = String(distance || "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
};

const ym = (d) => (d ? d.y * 12 + (d.m ?? 0) : null);

/**
 * The life so far as dated events, oldest first:
 * { y, m, kind, title, detail, to }. kind ∈ study | campus | work | research |
 * race | trek | build. Firsts only for races and treks, featured projects only.
 */
export function buildTimeline({
  positions = [], degrees = [], sports = [], treks = [], projects = [],
} = {}) {
  const events = [];
  degrees.forEach((d) => {
    if (d.year) events.push({ y: Number(d.year), m: 5, kind: "study", title: d.degree, detail: d.school, href: d.link });
  });
  positions.forEach((p) => {
    const { start } = parseDaterange(p.daterange);
    if (!start) return;
    let kind = "campus";
    if (/fellow|research/i.test(`${p.position}`)) kind = "research";
    else if (/engineer|developer/i.test(p.position || "")) kind = "work";
    events.push({ ...start, kind, title: `${p.position}, ${p.company}`, detail: p.daterange, href: p.link });
  });

  const dated = (rows, field) => rows
    .map((r) => ({ r, d: parseLooseDate(r[field]) }))
    .filter((x) => x.d)
    .sort((a, b) => ym(a.d) - ym(b.d));

  const races = dated(sports, "date");
  const firstRace = races[0];
  if (firstRace) events.push({ ...firstRace.d, kind: "race", title: "First race", detail: firstRace.r.title, to: `/sports/${firstRace.r.id}` });
  const marathon = races.find((x) => (kmOf(x.r.distance) || 0) >= 42 && (kmOf(x.r.distance) || 0) < 43);
  if (marathon) events.push({ ...marathon.d, kind: "race", title: "First full marathon", detail: marathon.r.title, to: `/sports/${marathon.r.id}` });
  const ultra = races.find((x) => (kmOf(x.r.distance) || 0) > 42.5);
  if (ultra) events.push({ ...ultra.d, kind: "race", title: "First ultra", detail: ultra.r.title, to: `/sports/${ultra.r.id}` });

  const forts = dated(treks, "date");
  if (forts[0]) events.push({ ...forts[0].d, kind: "trek", title: "First fort", detail: forts[0].r.fort_name, to: `/treks/${forts[0].r.id}` });
  const hard = forts.find((x) => /hard/i.test(x.r.endurance_level || ""));
  if (hard) events.push({ ...hard.d, kind: "trek", title: "First hard trek", detail: hard.r.fort_name, to: `/treks/${hard.r.id}` });

  projects
    .filter((p) => p.visible !== false && p.featured)
    .forEach((p) => {
      const d = parseLooseDate(p.date);
      if (d) events.push({ ...d, kind: "build", title: p.title, detail: p.subtitle, to: `/projects/${p.id}` });
    });

  return events.sort((a, b) => ym(a) - ym(b) || a.kind.localeCompare(b.kind));
}

/** Events grouped by year, oldest first: [{ year, events }]. */
export function timelineByYear(events = []) {
  const out = [];
  events.forEach((e) => {
    let row = out[out.length - 1];
    if (!row || row.year !== e.y) { row = { year: e.y, events: [] }; out.push(row); }
    row.events.push(e);
  });
  return out;
}

/**
 * Word-count report for the reading tiers, used by `npm run about -- check`
 * and its test: [{ key, words, seconds, budget, ok }].
 */
export function tierReport(model) {
  const t = (s) => String(s || "");
  const rows = [
    { key: "10 seconds", text: model.tenSeconds, budget: 10 },
    { key: "5 minutes", text: model.chapters.map((c) => c.body).join(" "), budget: 5 * 60 },
    { key: "10 minutes", text: model.long.join(" "), budget: 10 * 60 },
    { key: "short bio", text: model.shortBio, budget: 20 },
  ];
  return rows.map((r) => {
    const seconds = t(r.text) ? readingSeconds(r.text) : 0;
    return {
      key: r.key, words: wordCount(r.text), seconds, budget: r.budget, ok: seconds > 0 && seconds <= r.budget,
    };
  });
}

// --- Updates -----------------------------------------------------------------
//
// The "Latest" log on /about and /resume. Two sources, merged:
//   1. hand-written lines in about.md's `# Updates` section, added from the
//      command line with `npm run about -- update "…"`:
//        - 2026-10-30 — Passed the Claude Certified Associate exam. #career
//      `#career` puts a line on /resume too; a trailing (https://…) links it.
//   2. updates derived from the tables — a new certification, role, project,
//      race or fort shows up here the moment it is saved in /admin or added
//      with `npm run resume -- add …`, with nothing else to write.

export const CAREER_KINDS = ["career", "cert", "role", "build", "study"];

/** "- 2026-10-30 — Text #career (https://…)" → { date, text, kind, url } or null. */
export function parseUpdateLine(item) {
  const m = String(item).match(/^(\d{4}-\d{2}(?:-\d{2})?)\s*[—–:-]+\s*(.+)$/);
  if (!m) return null;
  let text = m[2].trim();
  let url = null;
  const link = text.match(/\s*\((https?:\/\/[^)\s]+)\)\s*$/);
  if (link) { [, url] = link; text = text.slice(0, link.index).trim(); }
  let kind = "life";
  const tag = text.match(/\s+#(career|life)\b\s*$/i);
  if (tag) { kind = tag[1].toLowerCase(); text = text.slice(0, tag.index).trim(); }
  return { date: m[1], text, kind, url, source: "note" };
}

export function parseUpdates(md) {
  const { body } = splitSections(md).find((s) => s.key === "updates") || {};
  return listItems(body).map(parseUpdateLine).filter(Boolean);
}

const pad = (n) => String(n).padStart(2, "0");
const isoOf = (d) => (d ? `${d.y}-${pad((d.m ?? 0) + 1)}` : null);

/**
 * Hand-written notes plus what the tables say happened, newest first.
 * Each: { date (YYYY-MM or YYYY-MM-DD), text, kind, to?, url?, source }.
 */
export function buildUpdates({
  notes = [], positions = [], certifications = [], projects = [], sports = [], treks = [],
} = {}, { limit = 8, career = false, perKind = {} } = {}) {
  const out = [...notes];
  certifications.forEach((c) => {
    const d = parseLooseDate(c.issuedDate);
    if (d && d.m != null) out.push({ date: isoOf(d), text: `Certified: ${c.name}`, detail: c.source, kind: "cert", url: c.link || null, source: "data" });
  });
  positions.forEach((p) => {
    const { start } = parseDaterange(p.daterange);
    if (start && start.m != null) out.push({ date: isoOf(start), text: `Started as ${p.position} at ${p.company}`, kind: /fellow/i.test(p.position || "") ? "career" : "role", url: p.link || null, source: "data" });
  });
  projects.filter((p) => p.visible !== false && p.date).forEach((p) => {
    out.push({ date: String(p.date).slice(0, 10), text: `Shipped ${p.title}`, detail: p.subtitle, kind: "build", to: `/projects/${p.id}`, source: "data" });
  });
  sports.forEach((s) => {
    const d = parseLooseDate(s.date);
    if (d) out.push({ date: isoOf(d), text: `Ran ${s.title}`, detail: [s.distance, s.time].filter(Boolean).join(" · "), kind: "race", to: `/sports/${s.id}`, source: "data" });
  });
  treks.forEach((t) => {
    const d = parseLooseDate(t.date);
    if (d) out.push({ date: isoOf(d), text: `Climbed ${t.fort_name}`, detail: t.endurance_level, kind: "trek", to: `/treks/${t.id}`, source: "data" });
  });
  const left = { ...perKind };
  return out
    .filter((u) => !career || CAREER_KINDS.includes(u.kind))
    // Newest first; on the same date a hand-written note leads.
    .sort((a, b) => b.date.localeCompare(a.date) || (a.source === "note" ? -1 : 1))
    // perKind caps a kind ({ build: 2 }) so a busy month of launches does not
    // push every certification and role off the log.
    .filter((u) => {
      if (left[u.kind] == null) return true;
      left[u.kind] -= 1;
      return left[u.kind] >= 0;
    })
    .slice(0, limit);
}

// --- Editing about.md (used by scripts/about.mjs) -----------------------------

/** Replace (or append) one `# Title` section's body, leaving the rest as is. */
export function setSection(md, title, body) {
  const key = slug(title);
  const lines = String(md || "").split(/\r?\n/);
  const start = lines.findIndex((l) => {
    const h = l.match(/^#\s+(.+?)\s*$/);
    return h && slug(h[1]) === key;
  });
  const block = [`# ${title}`, "", ...String(body).trim().split(/\r?\n/), ""];
  if (start < 0) {
    const trimmed = lines.join("\n").replace(/\s*$/, "");
    return `${trimmed}\n\n${block.join("\n")}`;
  }
  let end = lines.findIndex((l, i) => i > start && /^#\s+/.test(l));
  if (end < 0) end = lines.length;
  const realTitle = lines[start].replace(/^#\s+/, "");
  block[0] = `# ${realTitle}`;
  const next = [...lines.slice(0, start), ...block, ...lines.slice(end)];
  return `${next.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "")}\n`;
}

/** The body of one section, or null. */
export function getSection(md, title) {
  const s = splitSections(md).find((x) => x.key === slug(title));
  return s ? s.body : null;
}

/** Add an update line at the top of `# Updates` (created after the 10-second line). */
export function addUpdate(md, {
  date, text, career = false, url = null,
}) {
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(date || "")) throw new Error(`Date must be YYYY-MM-DD, got "${date}"`);
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) throw new Error("An update needs some text.");
  const line = `- ${date} — ${clean}${career ? " #career" : ""}${url ? ` (${url})` : ""}`;
  const current = getSection(md, "Updates");
  if (current == null) {
    // Place it right after the 10-second line so it reads as "the latest".
    const sections = splitSections(md);
    const [first] = sections;
    if (!first) return `# Updates\n\n${line}\n`;
    const rebuilt = sections.map((s, i) => {
      const part = `# ${s.title}\n\n${s.body}\n`;
      return i === 0 ? `${part}\n# Updates\n\n${line}\n` : part;
    });
    return `${rebuilt.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "")}\n`;
  }
  const items = current ? current.split(/\r?\n/).filter((l) => l.trim()) : [];
  return setSection(md, "Updates", [line, ...items].join("\n"));
}

/** Remove the update lines whose text contains `needle` (case-insensitive). */
export function removeUpdate(md, needle) {
  const current = getSection(md, "Updates") || "";
  const n = String(needle || "").toLowerCase();
  const kept = current.split(/\r?\n/).filter((l) => l.trim() && !l.toLowerCase().includes(n));
  return { md: setSection(md, "Updates", kept.join("\n")), removed: current.split(/\r?\n/).filter((l) => l.trim()).length - kept.length };
}
