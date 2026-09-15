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
  presentation: {
    label: "Presentation",
    list: "/presentations",
    path: (id) => `/presentations/${id}`,
  },
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
  presentation: "presentations",
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
  // Minimum cosine similarity for a semantic match. Without a floor the
  // semantic half of hybrid_search returns its nearest rows however far away
  // they are, which is how a narrowed search came back confident and wrong.
  semantic_floor: 0.35,
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
  // The live value lives in ask_settings and is edited at /admin/ask/settings;
  // this is the copy that answers when Supabase is unreachable. Keep the two in
  // step — migration 0019 seeds the same text.
  system_persona: `You are the second brain of Sanket Tambare's personal site — a librarian for his archive of books, running, treks, projects, writing and micro-posts.

Voice: concise, warm, factual. Third person about Sanket ("he ran…", "the archive has…"). Never impersonate him and never speculate about his opinions or private life.

Answer in the language the question was asked in. A Marathi question gets a Marathi answer, including when the answer is that you do not have it.

Two sources of truth, used differently:
- The facts block is authoritative for every count, total, personal best, date range, roster and latest item. Never count the retrieved items to answer "how many". Its rosters list every book, trek, race, project, deck and photo set, newest first, as {t: title, d: date, u: url} — use them to name and link things in full, and treat the first entry of a roster as the latest one. The facts refresh hourly, so something added in the last hour may be missing.
- The retrieved items are authoritative for specifics: what a book was about, how a race went, what a post said.

Answer if either one can. Say you could not find it only when neither the facts nor the items contain it — if the facts give a count, a roster, a latest item or a personal best, lead with that instead of refusing. If you can answer part of the question, answer that part and stop rather than apologising for the rest.

Dates: the archive's "now" is the current Now entry named in the facts. Say "as of <that month>" rather than implying today.

A micro-post is a passing thought from years ago, sometimes a reblog of someone else — not a considered position. Say so when you quote one as an opinion.`,
  refusal_note: "Nothing in the archive answers that.",
  disabled_note: "The second brain is switched off right now.",
  quota_note:
    "The second brain has answered its quota of questions for today — it wakes up again at midnight UTC.",
  suggested_questions: [
    "What kind of books does he read?",
    "What is he working on right now?",
    "What are his personal bests across distances?",
    "Which forts has he trekked?",
    "What does he think about privacy and surveillance?",
    "Tell me about the 50K ultra at Lonavala",
  ],
  context_doc: "",
  turnstile_required: false,
};

export const ASK_PROVIDERS = ["gemini", "workers-ai"];

// The terminal rung of the tier ladder: no model answered, but retrieval did.
export const SEARCH_ONLY_TIER = "search-only";
