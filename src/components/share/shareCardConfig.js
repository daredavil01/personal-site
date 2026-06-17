// Per-content-type adapters that normalize a raw item into a single shared
// `ShareModel` shape consumed by ShareCard. This is the ONLY type-aware code in
// the share module — ShareCard itself never reads raw item fields.
//
// ShareModel = {
//   kind, eyebrow, title, subtitle?, metaRows:[{ icon?, label }],
//   body?, quote?, tags?:string[], imageUrl?:string|null, footerNote?, footerUrl
// }

import { BASE_URL } from "../../data/pageMeta";
import { sourceLabels } from "../MicroBlog/constants";

// Domain shown on the exported card's footer (without protocol).
export const SITE_DOMAIN = BASE_URL.replace(/^https?:\/\//, "");

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
      item.date ? { icon: "calendar_today", label: item.date } : null,
      item.postType ? { label: item.postType } : null,
    ].filter(Boolean),
    body: clean(item.text || item.title),
    quote: isQuote,
    tags: item.tags || [],
    imageUrl: item.image_url || null,
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
  imageUrl: null,
  footerUrl: `${SITE_DOMAIN}/books/${item.id}`,
});

const blog = (item) => ({
  kind: "blog",
  eyebrow: "100 Days To Offload",
  title: clean(item.blog_title),
  metaRows: [
    item.blog_date ? { icon: "calendar_today", label: item.blog_date } : null,
    item.blog_platform ? { icon: "public", label: item.blog_platform } : null,
    item.language ? { icon: "translate", label: item.language } : null,
  ].filter(Boolean),
  body: clean(item.blog_description),
  tags: (item.blog_tags || []).filter((tag) => tag !== CHALLENGE_TAG),
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
    item.date ? { icon: "calendar_today", label: item.date } : null,
    item.place ? { icon: "location_on", label: item.place } : null,
    item.distance ? { icon: "social_leaderboard", label: item.distance } : null,
    item.time ? { icon: "timer", label: item.time } : null,
  ].filter(Boolean),
  body: clean(item.description),
  tags: [],
  imageUrl: firstImage(item.slideImages),
  footerUrl: `${SITE_DOMAIN}/sports/${item.id}`,
});

const trek = (item) => ({
  kind: "trek",
  eyebrow: "My Treks",
  title: clean(item.fort_name),
  subtitle: item.endurance_level ? `${item.endurance_level} endurance` : "",
  metaRows: [
    item.date ? { icon: "calendar_today", label: item.date } : null,
    item.trek_time ? { icon: "schedule", label: item.trek_time } : null,
    item.endurance_level ? { icon: "terrain", label: item.endurance_level } : null,
  ].filter(Boolean),
  body: "",
  tags: [],
  imageUrl: firstImage(item.slideImages),
  footerUrl: `${SITE_DOMAIN}/treks/${item.id}`,
});

export const ADAPTERS = {
  microblog,
  book,
  blog,
  instagram,
  sport,
  trek,
};

// Human label used in the trigger title / share sheet text.
export const KIND_LABELS = {
  microblog: "Micro Blog",
  book: "Book",
  blog: "Blog",
  instagram: "Post",
  sport: "Race",
  trek: "Trek",
};

export const toShareModel = (kind, item) => (ADAPTERS[kind] && item ? ADAPTERS[kind](item) : null);

export const hasImage = (kind, item) => {
  const model = toShareModel(kind, item);
  return Boolean(model && model.imageUrl);
};
