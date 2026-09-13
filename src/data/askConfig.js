// Shared constants for the second brain (/ask).
//
// Imported by three very different runtimes — the browser bundle, the
// Cloudflare Pages Function (bundled by esbuild), and the Node indexer script —
// so, like pageMeta.js, this module is dependency-free by contract. Nothing but
// plain data and pure functions belongs here.

// The indexer and the query path MUST use the same embedding model: vectors
// from two different models are not comparable, and the mismatch fails silently
// as "retrieval got worse" rather than as an error.
export const EMBEDDING_MODEL = "@cf/baai/bge-m3";
export const EMBEDDING_DIMS = 1024;

// Every entity type in content_chunks, with the site route a chunk links back
// to. `path(id)` returning null means the type has no detail page — link to the
// listing instead.
export const ENTITY_TYPES = {
  book: { label: "Book", list: "/books", path: (id) => `/books/${id}` },
  blog: {
    label: "Blog post",
    list: "/100-days-to-offload",
    path: (id) => `/100-days-to-offload/${id}`,
  },
  microblog: {
    label: "Micro post",
    list: "/micro-blog",
    path: (id) => `/micro-blog/${id}`,
  },
  project: { label: "Project", list: "/projects", path: (id) => `/projects/${id}` },
  sport: { label: "Race", list: "/sports", path: (id) => `/sports/${id}` },
  trek: { label: "Trek", list: "/treks", path: (id) => `/treks/${id}` },
  instagram: { label: "Instagram", list: "/instagram", path: () => "/instagram" },
  now: { label: "Now", list: "/now", path: () => "/now" },
  page: { label: "Page", list: "/", path: () => null },
  // Types added by the source registry (scripts/ask-sources/). Their chunks
  // carry their own url; `list` is where "browse everything" points.
  resume: { label: "Résumé", list: "/resume", path: () => "/resume" },
  writing: { label: "Essay", list: "/writing-ledger.html", path: () => null },
  stats: { label: "Stats", list: "/stats", path: () => "/stats" },
  tag: { label: "Tag", list: "/tags", path: () => null },
  site: { label: "Site page", list: null, path: () => null },
};

export function entityUrl(type, id, fallback) {
  const spec = ENTITY_TYPES[type];
  if (!spec) return fallback || "/";
  return spec.path(id) || spec.list || fallback || "/";
}

// The listing page for a type — where to send someone when the answer has no
// single item to point at ("browse all 20 treks").
export function entityListUrl(type) {
  return ENTITY_TYPES[type]?.list || null;
}

export const ENTITY_PLURALS = {
  book: "books",
  blog: "blog posts",
  microblog: "micro posts",
  project: "projects",
  sport: "races",
  trek: "treks",
  instagram: "photo sets",
  now: "now updates",
  page: "pages",
  resume: "résumé entries",
  writing: "essays",
  stats: "stats",
  tag: "tags",
  site: "site pages",
};

// A source dropped into scripts/ask-sources/ without an entry above still
// renders: "reading_list" becomes "Reading list".
export function entityLabel(type) {
  return ENTITY_TYPES[type]?.label
    || String(type || "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

// Used when ask_settings is unreachable, so a Supabase blip degrades the answer
// instead of taking the endpoint down. Mirrors the seed in migration 0009.
export const DEFAULT_ASK_SETTINGS = {
  enabled: true,
  daily_global_cap: 300,
  daily_ip_cap: 15,
  max_message_chars: 500,
  max_history_turns: 8,
  match_count: 8,
  full_text_weight: 1,
  semantic_weight: 1,
  tiers: [
    {
      name: "gemini-flash-lite",
      provider: "gemini",
      model: "gemini-flash-lite-latest",
      enabled: true,
      timeout_ms: 6000,
    },
    {
      name: "cf-gpt-oss-20b",
      provider: "workers-ai",
      model: "@cf/openai/gpt-oss-20b",
      enabled: true,
      timeout_ms: 8000,
    },
    {
      name: "cf-llama-3.2-3b",
      provider: "workers-ai",
      model: "@cf/meta/llama-3.2-3b-instruct",
      enabled: true,
      timeout_ms: 8000,
    },
  ],
  system_persona: "",
  refusal_note: "I could not find that in the archive.",
  disabled_note: "The second brain is switched off right now.",
  quota_note:
    "The second brain has answered its quota of questions for today — it wakes up again at midnight UTC.",
  suggested_questions: [],
  context_doc: "",
  turnstile_required: false,
};

export const ASK_PROVIDERS = ["gemini", "workers-ai"];

// The terminal rung of the tier ladder: no model answered, but retrieval did.
export const SEARCH_ONLY_TIER = "search-only";
