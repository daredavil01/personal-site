// One newsletter issue, derived from its now_months row.
//
// Both layouts (the atlas Letter and the classic Magazine), the share cards, the
// Substack copy, the ask chips and the OG card generator read an issue through
// this module, so they cannot disagree about what a month contained. Pure and
// import-free: scripts/newsletter-draft.mjs imports it under Node.

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Reading order of an issue. `key` is the now_months.sections key; the label is
// how the issue names it (treks arrive as `events`, see nowAutofill.js).
export const ISSUE_SECTIONS = [
  { key: "running", label: "On the road", icon: "directions_run" },
  { key: "events", label: "Treks & outings", icon: "landscape" },
  { key: "books", label: "On the shelf", icon: "auto_stories" },
  { key: "blogs", label: "Written", icon: "history_edu" },
  { key: "micro", label: "Short posts", icon: "chat" },
  { key: "projects", label: "Built", icon: "code" },
  { key: "certificates", label: "Learned", icon: "workspace_premium" },
  { key: "website", label: "This site", icon: "web" },
  { key: "misc", label: "Everything else", icon: "more_horiz" },
];

export const REACTIONS = [
  { key: "love", emoji: "❤️", label: "Love it" },
  { key: "fire", emoji: "🔥", label: "Impressive" },
  { key: "clap", emoji: "👏", label: "Well done" },
  { key: "wow", emoji: "🤯", label: "Surprising" },
];

const clean = (v) => (typeof v === "string" ? v.trim() : "");

/** "2026-09" → "September 2026". */
export function slugLabel(slug) {
  const [y, m] = String(slug || "").split("-").map(Number);
  return y && m ? `${MONTHS[m - 1]} ${y}` : "";
}

/** The one-line title of a row in any section, for lists and cards. */
export function itemTitle(sectionKey, item) {
  if (typeof item === "string") return clean(item);
  if (!item) return "";
  const t = {
    running: item.event,
    events: item.name,
    books: item.author ? `${clean(item.title)} — ${clean(item.author)}` : item.title,
    blogs: item.title,
    micro: item.text || item.title,
    projects: item.name,
    certificates: item.name,
  }[sectionKey];
  return clean(t) || clean(item.title) || clean(item.name);
}

/** The ordered, non-empty sections of an issue. */
export function issueSections(sections = {}) {
  return ISSUE_SECTIONS
    .map((s) => ({ ...s, items: Array.isArray(sections[s.key]) ? sections[s.key].filter(Boolean) : [] }))
    .filter((s) => s.items.length > 0);
}

const isTrek = (event) => event?.ref?.type === "trek";

const count = (list, one, many) => {
  const n = (list || []).length;
  return n ? { value: String(n), label: n === 1 ? one : many } : null;
};

/**
 * At most three headline numbers, in priority order. A stat with no value is
 * omitted, never shown as 0 — the same rule the share cards follow.
 */
export function issueStats(sections = {}) {
  const running = sections.running || [];
  const km = running.reduce((sum, r) => sum + (Number(r.distance) || 0), 0);
  const treks = (sections.events || []).filter(isTrek).length;
  const candidates = [
    km > 0 ? { value: String(Math.round(km * 10) / 10), label: "km raced" } : null,
    !km && running.length ? { value: String(running.length), label: running.length === 1 ? "race" : "races" } : null,
    treks ? { value: String(treks), label: treks === 1 ? "trek" : "treks" } : null,
    count(sections.books, "book", "books"),
    count(sections.blogs, "post written", "posts written"),
    count(sections.micro, "short post", "short posts"),
  ];
  return candidates.filter(Boolean).slice(0, 3);
}

/**
 * Day-of-month → section keys that happened that day, for the calendar strip.
 * Only rows with a real date in this month count; books carry the date they
 * were added, not read, so they are left off.
 */
export function issueDays(slug, sections = {}) {
  const days = {};
  ["running", "events", "blogs", "micro"].forEach((key) => {
    (sections[key] || []).forEach((item) => {
      const date = clean(item?.date);
      if (!date.startsWith(`${slug}-`)) return;
      const day = Number(date.slice(8, 10));
      if (!day) return;
      days[day] = [...new Set([...(days[day] || []), key])];
    });
  });
  return days;
}

/** Days in the month and the weekday (0 = Sunday) the 1st falls on. */
export function monthGrid(slug) {
  const [y, m] = String(slug || "").split("-").map(Number);
  if (!y || !m) return { daysInMonth: 0, firstWeekday: 0 };
  return {
    daysInMonth: new Date(y, m, 0).getDate(),
    firstWeekday: new Date(y, m - 1, 1).getDay(),
  };
}

// Races and treks first — they are what an issue is remembered by.
const REF_ORDER = ["running", "events", "books", "blogs", "micro"];

/** Archive rows the issue points at, most memorable first. */
export function issueRefs(sections = {}, max = 8) {
  const seen = new Set();
  const out = [];
  REF_ORDER.forEach((key) => (sections[key] || []).forEach((item) => {
    const ref = item?.ref;
    if (!ref || ref.id == null) return;
    const k = `${ref.type}:${ref.id}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ type: ref.type, id: ref.id });
  }));
  return out.slice(0, max);
}

/**
 * Starter questions for "ask about this issue". Each names something the
 * issue actually contains, so the archive can answer it.
 */
export function issueQuestions(row) {
  const label = slugLabel(row?.slug);
  const s = row?.sections || {};
  const qs = [];
  const race = (s.running || [])[0];
  const trek = (s.events || []).find(isTrek);
  if (race?.event) qs.push(`How did the ${clean(race.event)} go?`);
  if (trek?.name) qs.push(`Tell me about the ${clean(trek.name)} trek.`);
  if ((s.books || []).length) qs.push(`Which books did Sanket read in ${label}?`);
  if ((s.blogs || []).length) qs.push(`What did Sanket write about in ${label}?`);
  qs.push(`What happened in ${label}?`);
  return qs.slice(0, 3);
}

/** Everything a layout needs, in one object. */
export function issueModel(row) {
  if (!row) return null;
  const sections = row.sections || {};
  const slug = row.slug || "";
  const micro = (sections.micro || []).filter((p) => clean(p.text) && !clean(p.imageUrl));
  return {
    id: row.id,
    slug,
    label: slugLabel(slug),
    headline: clean(row.headline) || `${slugLabel(slug)}, in one letter`,
    note: clean(row.note),
    poll: row.poll?.q && Array.isArray(row.poll.options) && row.poll.options.length ? row.poll : null,
    isDraft: !row.publishedAt,
    isCurrent: !!row.isCurrent,
    cardUrl: row.cardUrl || null,
    sections: issueSections(sections),
    stats: issueStats(sections),
    days: issueDays(slug, sections),
    grid: monthGrid(slug),
    refs: issueRefs(sections),
    // The shortest text micro-post makes the best pull-quote.
    quote: micro.sort((a, b) => a.text.length - b.text.length).find((p) => p.text.length <= 220) || null,
    // Custom stat tiles the admin typed (Strava, Substack, ...), unchanged.
    extraStats: sections.stats || null,
  };
}

// --- Substack copy -----------------------------------------------------------

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const safeHref = (url) => (/^https?:\/\//i.test(String(url || "")) ? esc(url) : "");

// Enough markdown for a letter: paragraphs, links, bold, italics. The note is
// the owner's own text, and everything is escaped before any tag is added.
export function noteToHtml(markdown) {
  return clean(markdown)
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((p) => {
      const html = esc(p.trim())
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/\n/g, "<br>");
      return `<p>${html}</p>`;
    })
    .join("\n");
}

const itemLink = (item) => {
  if (typeof item === "string") return "";
  return safeHref(item.url || item.link);
};

/**
 * The issue as plain HTML for pasting into the Substack editor, which keeps
 * headings, lists and links from the clipboard. Ends by pointing back at the
 * interactive version, which is the canonical one.
 */
export function issueToHtml(row, siteUrl = "") {
  const model = issueModel(row);
  if (!model) return "";
  const url = `${siteUrl}/newsletter/${model.slug}`;
  const stats = model.stats.map((s) => `${esc(s.value)} ${esc(s.label)}`).join(" · ");
  const parts = [
    `<h1>${esc(model.headline)}</h1>`,
    `<p><em>${esc(model.label)}${stats ? ` — ${stats}` : ""}</em></p>`,
    noteToHtml(model.note),
    ...model.sections.map((s) => [
      `<h2>${esc(s.label)}</h2>`,
      "<ul>",
      ...s.items.map((item) => {
        const title = esc(itemTitle(s.key, item));
        const href = itemLink(item);
        return `<li>${href ? `<a href="${href}">${title}</a>` : title}</li>`;
      }),
      "</ul>",
    ].join("\n")),
    model.poll ? `<h2>This month's question</h2><p>${esc(model.poll.q)} — <a href="${esc(url)}#feedback">vote on the site</a></p>` : "",
    `<p><a href="${esc(url)}">Read the interactive version →</a></p>`,
  ];
  return parts.filter(Boolean).join("\n");
}

export default issueModel;
