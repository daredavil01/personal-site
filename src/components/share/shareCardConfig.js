// Per-content-type adapters that normalize a raw item into a single shared
// `ShareModel` shape consumed by ShareCard. This is the ONLY type-aware code in
// the share module — ShareCard itself never reads raw item fields.
//
// ShareModel = {
//   kind, eyebrow, title, subtitle?, metaRows:[{ icon?, label, isDate? }],
//   body?, quote?, tags?:string[], imageUrl?:string|null, footerNote?, footerUrl,
//   author?, stats?:[{ label, value }], date?, lang
// }
//
// `stats` feeds the Ticket layout's big numbers, `author` the attribution under
// a pull quote, `date` the Note/Letter datelines and `lang` ("en" | "mr")
// decides which font pairings can set the post.
//
// Rows flagged `isDate: true` are the item's timestamp — ShareCard hides them
// when the user turns "Timestamp" off in the editor.

import { SITE_URL } from "../../data/pageMeta";
import { stripMarkdownImages } from "../../lib/askFormat";
import { sourceLabels } from "../MicroBlog/constants";
import { isMarathi } from "../../lib/logbook";
import { IDENTITY } from "../../data/identity";

// Domain shown on the exported card's footer (without protocol).
export const SITE_DOMAIN = SITE_URL.replace(/^https?:\/\//, "");

// Every 100-Days post carries this tag; it is noise on a share card.
const CHALLENGE_TAG = "100_Days_to_Offload";

const clean = (value) => (value == null ? "" : String(value));

const firstImage = (slideImages) => (Array.isArray(slideImages) && slideImages[0] ? slideImages[0].url : null);

const microblog = (item) => {
  const isQuote = item.postType === "quote";
  return {
    kind: "microblog",
    eyebrow: "Micro Blog",
    title: "",
    metaRows: [
      item.date ? { icon: "calendar_today", label: item.date, isDate: true } : null,
      item.postType ? { label: item.postType } : null,
    ].filter(Boolean),
    body: clean(item.text || item.title),
    quote: isQuote,
    tags: item.tags || [],
    // API rows arrive camelCased (imageUrl); raw DB rows keep image_url.
    imageUrl: item.imageUrl || item.image_url || null,
    footerNote: `Source: ${sourceLabels[item.source] || item.source || "—"}`,
    footerUrl: `${SITE_DOMAIN}/micro-blog/${item.id}`,
  };
};

const book = (item) => ({
  kind: "book",
  eyebrow: "From the Library",
  title: clean(item.title),
  subtitle: item.author
    ? clean(item.author) + (item.translator ? ` · tr. ${item.translator}` : "")
    : "",
  metaRows: [
    item.category ? { icon: "category", label: item.category } : null,
    item.language ? { icon: "translate", label: item.language } : null,
    item.year ? { icon: "event", label: String(item.year) } : null,
  ].filter(Boolean),
  body: clean(item.description),
  tags: item.tags || [],
  author: clean(item.author),
  stats: item.year ? [{ label: "Read", value: String(item.year) }] : [],
  imageUrl: null,
  footerUrl: `${SITE_DOMAIN}/books/${item.id}`,
});

const blog = (item) => ({
  kind: "blog",
  eyebrow: "100 Days To Offload",
  title: clean(item.blog_title),
  metaRows: [
    item.blog_date ? { icon: "calendar_today", label: item.blog_date, isDate: true } : null,
    item.blog_platform ? { icon: "public", label: item.blog_platform } : null,
    item.language ? { icon: "translate", label: item.language } : null,
  ].filter(Boolean),
  body: clean(item.blog_description),
  tags: (item.blog_tags || []).filter((tag) => tag.toLowerCase() !== CHALLENGE_TAG.toLowerCase()),
  imageUrl: null,
  footerUrl: `${SITE_DOMAIN}/100-days-to-offload/${item.id}`,
});

const instagram = (item) => ({
  kind: "instagram",
  eyebrow: "Instagram",
  title: clean(item.title),
  metaRows: [],
  body: clean(item.caption),
  tags: item.tags || [],
  imageUrl: firstImage(item.slideImages),
  footerUrl: `${SITE_DOMAIN}/instagram`,
});

const sport = (item) => ({
  kind: "sport",
  eyebrow: "Physical Endurance",
  title: clean(item.title),
  metaRows: [
    item.date ? { icon: "calendar_today", label: item.date, isDate: true } : null,
    item.place ? { icon: "location_on", label: item.place } : null,
    item.distance ? { icon: "social_leaderboard", label: item.distance } : null,
    item.time ? { icon: "timer", label: item.time } : null,
  ].filter(Boolean),
  body: clean(item.description),
  tags: [],
  stats: [
    item.distance ? { label: "Distance", value: clean(item.distance) } : null,
    item.time ? { label: "Finish", value: clean(item.time) } : null,
    item.bibNumber ? { label: "Bib", value: clean(item.bibNumber) } : null,
  ].filter(Boolean),
  date: clean(item.date),
  imageUrl: firstImage(item.slideImages),
  footerUrl: `${SITE_DOMAIN}/sports/${item.id}`,
});

const trek = (item) => ({
  kind: "trek",
  eyebrow: "My Treks",
  title: clean(item.fort_name),
  subtitle: item.endurance_level ? `${item.endurance_level} endurance` : "",
  metaRows: [
    item.date ? { icon: "calendar_today", label: item.date, isDate: true } : null,
    item.trek_time ? { icon: "schedule", label: item.trek_time } : null,
    item.endurance_level ? { icon: "terrain", label: item.endurance_level } : null,
  ].filter(Boolean),
  body: "",
  tags: [],
  stats: [
    item.trek_time ? { label: "Duration", value: clean(item.trek_time) } : null,
    item.endurance_level ? { label: "Endurance", value: clean(item.endurance_level) } : null,
  ].filter(Boolean),
  date: clean(item.date),
  imageUrl: firstImage(item.slideImages),
  footerUrl: `${SITE_DOMAIN}/treks/${item.id}`,
});

// An /ask answer. The question is the title, the answer is the body, and the
// sources become the tag row so the card says where it came from.
const ask = (item) => ({
  kind: "ask",
  eyebrow: "Ask the Archive",
  title: clean(item.question),
  metaRows: [],
  // Images and link targets are for the page, not the card.
  body: clean(stripMarkdownImages(item.answer))
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\[(\d{1,2})\]/g, ""),
  tags: (item.sources || []).slice(0, 4).map((s) => clean(s.title)).filter(Boolean),
  imageUrl: null,
  footerUrl: `${SITE_DOMAIN}/ask`,
});

// A whole newsletter issue: `item` is issueModel() plus the resolved `hero`
// photo. The month's numbers ride in the meta row, the headline is the title.
const newsletter = (item) => ({
  kind: "newsletter",
  eyebrow: `Newsletter · ${clean(item.label)}`,
  title: clean(item.headline),
  metaRows: (item.stats || []).map((s) => ({ label: `${s.value} ${s.label}` })),
  body: clean(item.note).replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_#>]/g, ""),
  // Section names are not tags; the card would print them as "#On the shelf".
  tags: [],
  imageUrl: item.hero || null,
  footerUrl: `${SITE_DOMAIN}/newsletter/${item.slug}`,
});

// One section of an issue ("Books I read in September"): `item` is
// { issue, section, titles } with `section` from issueSections() and `titles`
// its rows as one-liners (itemTitle).
const newsletterSection = ({ issue, section, titles = [] }) => ({
  kind: "newsletter-section",
  eyebrow: `${clean(section.label)} · ${clean(issue.label)}`,
  title: `${section.items.length} ${section.items.length === 1 ? "entry" : "entries"} this month`,
  metaRows: [],
  body: titles.map((t) => `• ${t}`).join("\n"),
  tags: [],
  imageUrl: null,
  footerUrl: `${SITE_DOMAIN}/newsletter/${issue.slug}`,
});

export const ADAPTERS = {
  newsletter,
  "newsletter-section": newsletterSection,
  microblog,
  book,
  blog,
  instagram,
  sport,
  trek,
  ask,
};

// Human label used in the trigger title / share sheet text.
export const KIND_LABELS = {
  microblog: "Micro Blog",
  book: "Book",
  blog: "Blog",
  instagram: "Post",
  sport: "Race",
  trek: "Trek",
  ask: "Answer",
  newsletter: "Newsletter",
  "newsletter-section": "Newsletter section",
};

// Facts every adapter would otherwise repeat: the date from the dated meta row,
// the author (the site's owner unless the item names one, as a book does) and
// the language, by share of letters.
const finish = (model) => {
  const dateRow = (model.metaRows || []).find((row) => row.isDate);
  const lang = isMarathi(`${model.title || ""} ${model.body || ""}`) ? "mr" : "en";
  return {
    stats: [],
    ...model,
    date: model.date || (dateRow ? dateRow.label : ""),
    author: model.author || (lang === "mr" ? IDENTITY.nameMr : IDENTITY.name),
    lang,
  };
};

export const toShareModel = (kind, item) => (ADAPTERS[kind] && item ? finish(ADAPTERS[kind](item)) : null);

export const hasImage = (kind, item) => {
  const model = toShareModel(kind, item);
  return Boolean(model && model.imageUrl);
};
