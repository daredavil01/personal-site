// The card registry: everything the endpoint needs to serve one kind.
//
// `src/data/routeManifest.test.js` asserts that every route whose OG strategy
// is "entity" names a kind in here, so a new detail route cannot ship without
// a card. Keep the `select` lists tight — they run on the crawler path.

import { pageCard } from "./layouts/page.js";
import { entityCard } from "./layouts/entity.js";

// `tag_names` is a PostgREST computed field (supabase/migrations/0003), the
// same one `src/lib/api/_crud.js` requests. Tags are not columns on the row.
export const OG_CARDS = {
  page: {
    layout: pageCard,
    table: null,
    // A page card that fails to render falls back to the home card, the one
    // committed card that is always present.
    fallbackSlug: "home",
  },
  book: {
    layout: entityCard,
    table: "books",
    select: "id,title,author,category,language,year,description,tag_names",
    fallbackSlug: "books",
    route: "/books/:id",
  },
  blog: {
    layout: entityCard,
    table: "blogs",
    select: "id,blog_title,blog_description,blog_date,blog_platform,language,tag_names",
    fallbackSlug: "100-days-to-offload",
    route: "/100-days-to-offload/:id",
  },
  sport: {
    layout: entityCard,
    table: "sports",
    select: "id,title,date,place,distance,time,bib_number,slide_images,tag_names",
    fallbackSlug: "sports",
    route: "/sports/:id",
  },
  trek: {
    layout: entityCard,
    table: "treks",
    select: "id,fort_name,trek_time,endurance_level,date,slide_images,tag_names",
    fallbackSlug: "treks",
    route: "/treks/:id",
  },
  project: {
    layout: entityCard,
    table: "projects",
    // The table's RLS select policy is `visible or is_owner()`, so an
    // anon-key read can never return a draft project.
    select: "id,title,subtitle,description,status,tech_stack,image,slide_images,tag_names",
    fallbackSlug: "projects",
    route: "/projects/:id",
  },
  presentation: {
    layout: entityCard,
    table: "presentations",
    select: "id,title,description,date,tag_names",
    fallbackSlug: "presentations",
    route: "/presentations/:id",
  },
  microblog: {
    layout: entityCard,
    table: "microblog",
    select: "id,title,text,date,post_type,source,image_url,tag_names",
    fallbackSlug: "micro-blog",
    route: "/micro-blog/:id",
  },
  tag: {
    layout: entityCard,
    table: null,
    // Not a plain table select. `tags_with_counts()` returns the row PLUS the
    // per-entity-type counts the card renders, in one request — the counts are
    // not columns on `tags`, they come from tag_associations.
    rpc: "tags_with_counts",
    // The rpc takes no argument and returns every tag, so the row is picked by
    // id from the result. That is also why the card is keyed on the numeric id
    // rather than the name: the route keeps its URI-encoded, un-slugified
    // (often Devanagari) name, while the image path stays ASCII.
    rpcPickById: true,
    fallbackSlug: "tags",
    route: "/tags/:name",
  },
  "ask-share": {
    layout: entityCard,
    table: null,
    // Owner-only RLS by design; the public reaches a share only through this
    // SECURITY DEFINER, token-gated RPC (supabase/migrations/0021).
    rpc: "get_ask_share",
    rpcArg: "p_token",
    fallbackSlug: "ask-share",
    route: "/ask/s/:token",
  },
};

export const CARD_KINDS = Object.keys(OG_CARDS);

export const cardSpec = (kind) => OG_CARDS[kind] || null;

export default OG_CARDS;
