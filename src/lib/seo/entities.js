// What a crawler should learn from one row, per content type.
//
// Every detail route resolves its row to a "view": the facts a person reading
// the page would take away, normalised across tables that store them in five
// different shapes. The middleware turns a view into the #root fallback and the
// JSON-LD; /sitemap.xml, /feed.xml and /llms-full.txt read the same list
// selects. One description per type, so the crawler layer cannot describe a
// trek one way in the page body and another way in the feed.
//
// The `meta` on a view is the existing build*Meta result, unchanged: head tags
// and share cards were already right and stay derived exactly as before.

import {
  buildMicroblogMeta,
  buildTrekMeta,
  buildSportMeta,
  buildBookMeta,
  buildBlogMeta,
  buildProjectMeta,
  buildPresentationMeta,
  buildVideoMeta,
  buildTagMeta,
  buildNewsletterMeta,
} from "../../data/pageMeta";
import { storageUrl, firstSlideImage } from "../og/paths";
import { parseContentDate, toIsoDate } from "../monthDigest";
import {
  issueModel, issueStats, slugLabel, itemTitle, noteToHtml,
} from "../newsletterIssue";
import { isMarathi } from "../logbook";
import {
  effectiveKind, embedUrl, formatCount, formatDuration, isoDuration, watchUrl,
} from "../youtube";
import {
  clip, paragraphs, safeUrl, tagHref, escHtml,
} from "./text";
import { isIndexableMicroblog } from "./indexing";

// Where each entity type's detail pages live. `instagram` has no detail route
// (everything renders on /instagram), so tag_entities rows of that type link
// to the section.
export const ENTITY_TYPE_PATHS = {
  book: "/books",
  blog: "/100-days-to-offload",
  microblog: "/micro-blog",
  sport: "/sports",
  trek: "/treks",
  project: "/projects",
  presentation: "/presentations",
  video: "/videos",
};

export const entityHref = (type, id) => {
  const section = ENTITY_TYPE_PATHS[type];
  if (section && id != null) return `${section}/${id}`;
  return type === "instagram" ? "/instagram" : null;
};

// How many rows a tag page lists for crawlers.
const TAG_ITEMS = 200;

const isoOf = (row, type) => toIsoDate(parseContentDate(row, type)) || null;

const langOf = (language, text) => {
  if (language) return /marathi/i.test(language) ? "mr" : "en";
  return text && isMarathi(text) ? "mr" : "en";
};

const slideUrls = (slides, base) => (Array.isArray(slides) ? slides : [])
  .map((entry) => storageUrl(typeof entry === "string" ? entry : entry?.url, base))
  .filter(Boolean);

const facts = (pairs) => pairs.filter(([, value]) => value != null && String(value).trim() !== "");

const outbound = (href, label) => (safeUrl(href) ? [{ href: safeUrl(href), label }] : []);

const tagsOf = (row) => (Array.isArray(row.tag_names) ? row.tag_names.filter(Boolean) : []);

// Each kind: the table, how its detail key is spelled in a URL, the columns a
// detail page and a list need, and how a row reads.
export const KINDS = {
  book: {
    table: "books",
    section: "/books",
    keyPattern: /^\d+$/,
    detailSelect: "id,title,author,category,language,description,year,translator,blog_link,blog_platform,rating,quote,note,cover_url,date_finished,date_precision,updated_at,tag_names",
    listSelect: "id,title,author,year,language,description,date_finished,date_precision,updated_at,created_at",
    listOrder: "year.desc,id.desc",
    listItem: (r) => ({ href: `/books/${r.id}`, text: `${r.title} — ${r.author}`, note: r.year ? `read ${r.year}` : "" }),
    view(r, base) {
      const meta = buildBookMeta({ title: r.title, author: r.author, description: r.description });
      return {
        title: meta.title,
        description: meta.description,
        date: isoOf(r, "book") || (r.year ? String(r.year) : null),
        image: storageUrl(r.cover_url, base),
        lang: langOf(r.language),
        facts: facts([
          ["Author", r.author],
          ["Translator", r.translator],
          ["Category", r.category],
          ["Language", r.language],
          ["Year read", r.year],
          ["Rating", r.rating ? `${r.rating} / 5` : null],
        ]),
        body: [...paragraphs(r.description), ...(r.quote ? [`“${clip(r.quote, 400)}”`] : []), ...paragraphs(r.note)],
        outbound: outbound(r.blog_link, `Read the review${r.blog_platform ? ` on ${r.blog_platform}` : ""}`),
        book: { name: r.title, author: r.author, translator: r.translator, rating: r.rating },
        meta,
      };
    },
  },

  trek: {
    table: "treks",
    section: "/treks",
    keyPattern: /^\d+$/,
    detailSelect: "id,fort_name,trek_time,endurance_level,date,blog_link,slide_images,updated_at,tag_names",
    listSelect: "id,fort_name,trek_time,endurance_level,date,updated_at,created_at",
    listOrder: "id.desc",
    listItem: (r) => ({ href: `/treks/${r.id}`, text: `${r.fort_name} Trek`, note: [r.endurance_level, r.date].filter(Boolean).join(" · ") }),
    view(r, base) {
      const images = slideUrls(r.slide_images, base);
      const meta = buildTrekMeta({
        fortName: r.fort_name,
        enduranceLevel: r.endurance_level,
        trekTime: r.trek_time,
        date: r.date,
        image: firstSlideImage(r.slide_images, base),
      });
      return {
        title: meta.title,
        description: meta.description,
        date: isoOf(r, "trek"),
        image: images[0] || null,
        images,
        lang: "en",
        facts: facts([["Fort", r.fort_name], ["Date", r.date], ["Duration", r.trek_time], ["Endurance", r.endurance_level]]),
        body: [meta.description],
        outbound: outbound(r.blog_link, "Read the trek story"),
        place: r.fort_name,
        meta,
      };
    },
  },

  sport: {
    table: "sports",
    section: "/sports",
    keyPattern: /^\d+$/,
    detailSelect: "id,title,date,description,place,distance,time,bib_number,time_certificate_link,slide_images,updated_at,tag_names",
    listSelect: "id,title,date,place,distance,time,description,updated_at,created_at",
    listOrder: "id.desc",
    listItem: (r) => ({ href: `/sports/${r.id}`, text: r.title, note: [r.distance, r.time, r.date].filter(Boolean).join(" · ") }),
    view(r, base) {
      const images = slideUrls(r.slide_images, base);
      const meta = buildSportMeta({
        title: r.title,
        distance: r.distance,
        place: r.place,
        date: r.date,
        time: r.time,
        description: r.description,
        image: firstSlideImage(r.slide_images, base),
      });
      return {
        title: meta.title,
        description: meta.description,
        date: isoOf(r, "sport"),
        image: images[0] || null,
        images,
        lang: "en",
        facts: facts([
          ["Date", r.date],
          ["Place", r.place],
          ["Distance", r.distance],
          ["Finish time", r.time],
          ["Bib", r.bib_number],
        ]),
        body: paragraphs(r.description),
        outbound: outbound(r.time_certificate_link, "Timing certificate"),
        place: r.place,
        meta,
      };
    },
  },

  project: {
    table: "projects",
    section: "/projects",
    keyPattern: /^\d+$/,
    detailSelect: "id,title,subtitle,link,image,date,description,slide_images,links,tech_stack,highlights,category,status,role,org,problem,solution,outcome,updated_at,tag_names",
    listSelect: "id,title,subtitle,date,category,status,description,updated_at,created_at",
    listOrder: "featured.desc,date.desc.nullslast,id.desc",
    listItem: (r) => ({ href: `/projects/${r.id}`, text: r.title, note: r.subtitle || r.category || "" }),
    view(r, base) {
      const images = slideUrls(r.slide_images, base);
      const cover = storageUrl(r.image, base) || images[0] || null;
      const meta = buildProjectMeta({
        title: r.title, subtitle: r.subtitle, description: r.description, image: cover,
      });
      const extraLinks = (Array.isArray(r.links) ? r.links : [])
        .filter((l) => safeUrl(l?.url))
        .map((l) => ({ href: l.url, label: l.label || l.url }));
      return {
        title: r.title,
        subtitle: r.subtitle,
        description: meta.description,
        date: isoOf(r, "project"),
        image: cover,
        images,
        lang: "en",
        facts: facts([
          ["Category", r.category],
          ["Status", r.status],
          ["Role", r.role],
          ["Organisation", r.org],
          ["Date", r.date],
          ["Built with", Array.isArray(r.tech_stack) && r.tech_stack.length ? r.tech_stack.join(", ") : null],
        ]),
        body: [
          ...paragraphs(r.description),
          ...(r.problem ? [`Problem: ${clip(r.problem, 1200)}`] : []),
          ...(r.solution ? [`Solution: ${clip(r.solution, 1200)}`] : []),
          ...(r.outcome ? [`Outcome: ${clip(r.outcome, 1200)}`] : []),
        ],
        bullets: Array.isArray(r.highlights) ? r.highlights.filter(Boolean) : [],
        outbound: [...outbound(r.link, "Open the project"), ...extraLinks],
        keywords: Array.isArray(r.tech_stack) ? r.tech_stack : [],
        meta,
      };
    },
  },

  blog: {
    table: "blogs",
    section: "/100-days-to-offload",
    keyPattern: /^\d+$/,
    detailSelect: "id,blog_title,blog_description,blog_date,blog_link,blog_platform,language,updated_at,tag_names",
    listSelect: "id,blog_title,blog_description,blog_date,blog_platform,language,updated_at,created_at",
    listOrder: "blog_date.desc,id.desc",
    listItem: (r) => ({ href: `/100-days-to-offload/${r.id}`, text: r.blog_title, note: [r.blog_date, r.blog_platform].filter(Boolean).join(" · ") }),
    view(r) {
      const meta = buildBlogMeta({ title: r.blog_title, description: r.blog_description });
      return {
        title: r.blog_title,
        description: meta.description,
        date: isoOf(r, "blog"),
        image: null,
        lang: langOf(r.language),
        facts: facts([["Published", r.blog_date], ["Platform", r.blog_platform], ["Language", r.language]]),
        body: paragraphs(r.blog_description),
        outbound: outbound(r.blog_link, `Read the full post${r.blog_platform ? ` on ${r.blog_platform}` : ""}`),
        externalUrl: safeUrl(r.blog_link),
        meta,
      };
    },
  },

  presentation: {
    table: "presentations",
    section: "/presentations",
    keyPattern: /^\d+$/,
    detailSelect: "id,title,description,url,date,updated_at,tag_names",
    listSelect: "id,title,description,date,updated_at,created_at",
    listOrder: "date.desc.nullslast,id.desc",
    listItem: (r) => ({ href: `/presentations/${r.id}`, text: r.title, note: r.date || "" }),
    view(r) {
      const meta = buildPresentationMeta({ title: r.title, description: r.description });
      return {
        title: r.title,
        description: meta.description,
        date: isoOf(r, "presentation"),
        image: null,
        lang: "en",
        facts: facts([["Date", r.date]]),
        body: paragraphs(r.description),
        outbound: outbound(r.url, "Open the deck"),
        externalUrl: safeUrl(r.url),
        meta,
      };
    },
  },

  video: {
    table: "videos",
    section: "/videos",
    keyPattern: /^\d+$/,
    detailSelect: "id,youtube_id,title,description,date,published_at,duration_seconds,kind,kind_override,view_count,thumbnail_url,playlists,updated_at,tag_names",
    listSelect: "id,title,description,date,kind,kind_override,updated_at,created_at",
    listOrder: "date.desc.nullslast,id.desc",
    listItem: (r) => ({
      href: `/videos/${r.id}`,
      text: r.title,
      note: [effectiveKind(r) === "short" ? "Short" : null, r.date].filter(Boolean).join(" · "),
    }),
    view(r) {
      const kind = effectiveKind(r);
      const meta = buildVideoMeta({
        title: r.title, description: r.description, image: r.thumbnail_url, kind,
      });
      const watch = watchUrl(r);
      return {
        title: r.title,
        description: meta.description,
        date: isoOf(r, "video"),
        image: r.thumbnail_url || null,
        lang: langOf(null, `${r.title || ""} ${r.description || ""}`),
        facts: facts([
          ["Published", r.date],
          ["Type", kind === "short" ? "YouTube Short" : "YouTube video"],
          ["Duration", formatDuration(r.duration_seconds) || null],
          ["Views", Number.isFinite(r.view_count) ? formatCount(r.view_count) : null],
          ["Playlists", Array.isArray(r.playlists) && r.playlists.length ? r.playlists.join(", ") : null],
        ]),
        body: paragraphs(r.description),
        outbound: outbound(watch, "Watch on YouTube"),
        externalUrl: safeUrl(watch),
        video: r.youtube_id ? {
          embedUrl: embedUrl(r.youtube_id),
          uploadDate: r.published_at || r.date || null,
          duration: isoDuration(r.duration_seconds),
          thumbnailUrl: r.thumbnail_url || null,
          views: Number.isFinite(r.view_count) ? r.view_count : null,
        } : null,
        meta,
      };
    },
  },

  microblog: {
    table: "microblog",
    section: "/micro-blog",
    keyPattern: /^\d+$/,
    detailSelect: "id,title,text,date,url,image_url,post_type,updated_at,tag_names",
    listSelect: "id,title,text,date,updated_at,created_at",
    // The section page lists text posts only — a photo post with no words is
    // noindexed (see indexing.js) and makes a poor link. `match.\S` is the
    // same test as isIndexableMicroblog: at least one non-space character.
    listFilter: "text=match.%5CS",
    listOrder: "date.desc,id.desc",
    listLimit: 50,
    listItem: (r) => ({ href: `/micro-blog/${r.id}`, text: clip(r.title || r.text, 90), note: r.date || "" }),
    view(r, base) {
      const image = storageUrl(r.image_url, base);
      const meta = buildMicroblogMeta({ title: r.title, text: r.text, date: r.date, image });
      return {
        title: meta.title,
        description: meta.description,
        date: isoOf(r, "micro"),
        image,
        lang: langOf(null, `${r.title || ""} ${r.text || ""}`),
        facts: facts([["Posted", r.date], ["Type", r.post_type]]),
        body: [...(r.title && r.title !== r.text ? [r.title] : []), ...paragraphs(r.text)],
        outbound: outbound(r.url, "Original post"),
        articleBody: clip(r.text, 5000),
        indexable: isIndexableMicroblog(r),
        meta,
      };
    },
  },

  newsletter: {
    table: "now_months",
    section: "/newsletter",
    keyColumn: "slug",
    keyPattern: /^\d{4}-\d{2}$/,
    // RLS already hides drafts from the anon key; the filter says so too.
    detailFilter: "published_at=not.is.null",
    detailSelect: "slug,headline,note,sections,card_url,published_at,updated_at",
    listSelect: "slug,headline,published_at,updated_at,created_at",
    listFilter: "published_at=not.is.null&slug=not.is.null",
    listOrder: "slug.desc",
    listItem: (r) => ({ href: `/newsletter/${r.slug}`, text: r.headline ? `${r.headline} — ${slugLabel(r.slug)}` : slugLabel(r.slug), note: "" }),
    view(r) {
      const meta = buildNewsletterMeta({
        label: slugLabel(r.slug),
        headline: r.headline,
        stats: issueStats(r.sections || {}).map((st) => `${st.value} ${st.label}`).join(", "),
        image: r.card_url,
      });
      const model = issueModel(r);
      const sectionsHtml = model.sections.map((s) => {
        const items = s.items.map((item) => {
          const title = escHtml(itemTitle(s.key, item));
          const href = (item?.ref && entityHref(item.ref.type, item.ref.id))
            || safeUrl(item?.url || item?.link);
          return `<li>${href ? `<a href="${escHtml(href)}">${title}</a>` : title}</li>`;
        }).join("");
        return `<h2>${escHtml(s.label)}</h2><ul>${items}</ul>`;
      }).join("");
      return {
        title: meta.title,
        description: meta.description,
        date: r.published_at ? String(r.published_at).slice(0, 10) : null,
        image: r.card_url || null,
        lang: "en",
        facts: facts([["Issue", model.label], ["In numbers", model.stats.map((s) => `${s.value} ${s.label}`).join(", ")]]),
        bodyHtml: `${noteToHtml(model.note)}${sectionsHtml}`,
        articleBody: clip(model.note, 5000),
        meta,
      };
    },
  },

  tag: {
    table: "tags",
    section: "/tags",
    keyColumn: "name",
    // Names arrive percent-encoded and are stored lowercased (CLAUDE.md).
    normaliseKey: (raw) => {
      try {
        return decodeURIComponent(raw).toLowerCase();
      } catch (_) {
        return null;
      }
    },
    keyPattern: /^[^/]+$/,
    detailSelect: "name,display_name,description,category",
    // Capped in the database: the busiest tag carries ~500 rows, and parsing
    // them all is the single largest CPU cost in the middleware. 200 links is
    // plenty for a crawler.
    related: (key) => ({ path: `rpc/tag_entities?limit=${TAG_ITEMS}`, body: { p_name: key } }),
    list: { path: "rpc/tags_with_counts", body: {} },
    listItem: (r) => (r.total > 0
      ? { href: tagHref(r.name), text: `#${r.display_name || r.name}`, note: `${r.total} ${r.total === 1 ? "item" : "items"}` }
      : null),
    view(r, base, related) {
      const meta = buildTagMeta({
        name: r.name, displayName: r.display_name, description: r.description, category: r.category,
      });
      const items = (Array.isArray(related) ? related : [])
        .slice(0, TAG_ITEMS)
        .map((e) => ({ href: entityHref(e.entity_type, e.entity_id), text: clip(e.title, 90), note: e.entity_type }))
        .filter((e) => e.href && e.text);
      return {
        title: meta.title,
        description: meta.description,
        date: null,
        image: null,
        lang: langOf(null, r.display_name || r.name),
        facts: facts([["Category", r.category]]),
        body: paragraphs(r.description),
        items,
        meta,
      };
    },
  },
};

// Section page → the kind it lists, for the fixed routes that index a table.
export const SECTION_KINDS = Object.fromEntries(
  Object.entries(KINDS).map(([kind, config]) => [config.section, kind]),
);

// Detail route → kind, matched on the manifest path.
export const DETAIL_KINDS = {
  "/books/:id": "book",
  "/treks/:id": "trek",
  "/sports/:id": "sport",
  "/projects/:id": "project",
  "/100-days-to-offload/:id": "blog",
  "/presentations/:id": "presentation",
  "/videos/:id": "video",
  "/micro-blog/:id": "microblog",
  "/newsletter/:slug": "newsletter",
  "/tags/:name": "tag",
};

export const keyColumnOf = (kind) => KINDS[kind].keyColumn || "id";

export const detailPath = (kind, key) => (kind === "tag" ? tagHref(key) : `${KINDS[kind].section}/${key}`);

/** The PostgREST path that reads one row of `kind`. */
export function detailQuery(kind, key) {
  const k = KINDS[kind];
  const filter = k.detailFilter ? `&${k.detailFilter}` : "";
  return `${k.table}?${keyColumnOf(kind)}=eq.${encodeURIComponent(key)}${filter}&select=${k.detailSelect}&limit=1`;
}

/** The PostgREST path (or RPC) that lists `kind`, newest first. */
export function listQuery(kind, { select, limit, filter } = {}) {
  const k = KINDS[kind];
  if (k.list) return { ...k.list };
  const parts = [`select=${select || k.listSelect}`];
  const f = filter ?? k.listFilter;
  if (f) parts.push(f);
  if (k.listOrder) parts.push(`order=${k.listOrder}`);
  const n = limit ?? k.listLimit;
  if (n) parts.push(`limit=${n}`);
  return { path: `${k.table}?${parts.join("&")}` };
}

/** A row as a crawler should read it. */
export function viewOf(kind, raw, { supabaseUrl = "", related = null } = {}) {
  const k = KINDS[kind];
  // Admin-typed values carry trailing spaces ("Pune "); trim once here so no
  // name, title or place reaches JSON-LD, meta or llms.txt padded.
  const row = Object.fromEntries(
    Object.entries(raw).map(([col, v]) => [col, typeof v === "string" ? v.trim() : v]),
  );
  const key = row[keyColumnOf(kind)];
  const view = k.view(row, supabaseUrl, related);
  return {
    kind,
    key,
    path: detailPath(kind, key),
    tags: tagsOf(row),
    updatedAt: row.updated_at || null,
    indexable: true,
    ...view,
  };
}
