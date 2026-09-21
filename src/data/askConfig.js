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
  // Chunks carry their own /changelog#vX.Y.Z anchor, so path() adds nothing.
  changelog: { label: "Changelog", list: "/changelog", path: () => null },
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
  changelog: "changelog versions",
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
  // The same idea for the other half. Until 0023 the keyword branch had no
  // floor of any kind: any chunk containing any prefix of any non-stopword term
  // was eligible, so a question with no answer in the archive still filled every
  // slot with whatever matched loosest. This is a normalised ts_rank_cd, so it
  // means the same thing across queries; 0 restores the old behaviour.
  keyword_floor: 0.02,
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
  // Shown only when question_pool is empty — a bad edit at /admin degrades to
  // six good questions rather than none.
  suggested_questions: [
    "What kind of books does he read?",
    "What is he working on right now?",
    "What are his personal bests across distances?",
    "Which forts has he trekked?",
    "What does he think about privacy and surveillance?",
    "Tell me about the 50K ultra at Lonavala",
  ],
  question_pool: [],
  context_doc: "",
  daily_voice_global_cap: 200,
  daily_voice_ip_cap: 20,
  turnstile_required: false,
  // Automatic evaluation of logged answers (migration 0022). Off by default and
  // off in this fallback too: if ask_settings is unreachable the judge must not
  // run, because a default that spends money is not a safe default.
  auto_eval_enabled: false,
  // The judge's own ladder, tried in order (src/lib/askJudgeTiers.js). Jev first
  // because it is the only rung that returns calibrated probabilities; the free
  // language models behind it answer the same rubric as JSON, which is worse and
  // is tagged as such. The metered rung is present but disabled: with
  // auto_eval_allow_metered false it cannot run even if it is switched on.
  auto_eval_tiers: [
    {
      name: "jev-gateway",
      provider: "jev",
      route: "gateway",
      model: "typesafe-ai/jev",
      enabled: true,
      timeout_ms: 10000,
    },
    {
      name: "gemini-judge",
      provider: "gemini",
      model: "gemini-flash-lite-latest",
      enabled: true,
      timeout_ms: 12000,
    },
    {
      name: "cf-gpt-oss-20b",
      provider: "workers-ai",
      model: "@cf/openai/gpt-oss-20b",
      enabled: true,
      timeout_ms: 15000,
    },
    {
      name: "jev-direct",
      provider: "jev",
      route: "typesafe",
      model: "jev-latest",
      enabled: false,
      timeout_ms: 10000,
    },
  ],
  // The one switch that decides whether this feature can ever cost anything. Off
  // means a rung billed per token is skipped, however it is configured.
  auto_eval_allow_metered: false,
  auto_eval_batch_cap: 50,
  auto_eval_request_batch: 8,
  auto_eval_min_confidence: 0.7,
  auto_eval_monthly_token_cap: 2000000,
  auto_eval_explain_enabled: false,
  // Every AI feature outside /ask is off until switched on at
  // /admin/ask/settings. Off in the fallback too, so an unreachable database
  // switches the machine off rather than on — the same bargain as
  // auto_eval_enabled above.
  ai_features: {},
};

// ---------------------------------------------------------------------------
// AI features outside /ask (migration 0024)
// ---------------------------------------------------------------------------
//
// One key per feature, stored as booleans in ask_settings.ai_features. This
// list is what the admin switchboard renders, so adding a feature is a row
// here plus a call to aiFeatureOn() at the point that spends — not a new
// column, a new table or a deploy-time constant.
//
// `AI_MASTER_KEY` is the switch above all of them: off means none of them run,
// whatever their own flag says.
export const AI_MASTER_KEY = "enabled";

export const AI_FEATURES = [
  {
    key: "tag_descriptions",
    label: "Tag descriptions",
    hint: "npm run tags:describe — fills tags.description from each tag's own items.",
  },
  {
    key: "draft_fields",
    label: "Draft long-text fields",
    hint: "The Draft button on admin textareas. Owner-only, fills the box, saves nothing.",
  },
  {
    key: "book_metadata",
    label: "Book metadata gap-fill",
    hint: "npm run books:propose — proposes into the template books:apply already reads.",
  },
  {
    key: "tag_suggest",
    label: "Tag suggestions on save",
    hint: "Suggests tags on an admin form. Writes still go through set_entity_tags.",
  },
  {
    key: "microblog_autotag",
    label: "Micro-blog bulk auto-tagging",
    hint: "npm run microblog:tag — a batch pass over untagged micro-posts.",
  },
  {
    key: "microblog_kind",
    label: "Micro-blog own/reblog classifier",
    hint: "npm run microblog:classify — fills post_kind so a reblog can be told from a thought.",
  },
  {
    key: "answer_cache",
    label: "Answer cache on /ask",
    hint: "Serves a stored answer for the same question over the same sources. Saves the model call, not the quota.",
  },
  {
    key: "rerank",
    label: "Rerank /ask results",
    hint: "A cross-encoder re-orders what search found. One extra call on the visitor path; fails open.",
  },
  {
    key: "voice_input",
    label: "Voice input on /ask",
    hint: "Whisper transcribes into the question box. Audio is never stored, and it has its own daily cap.",
  },
  {
    key: "release_notes",
    label: "Changelog release notes",
    hint: "npm run changelog:notes — one reader-facing paragraph per version, written under its heading.",
  },
  {
    key: "archive_gaps",
    label: "Archive gap report",
    hint: "npm run ask:gaps — clusters what readers asked and what /ask could not answer. Report only.",
  },
  {
    key: "image_alt",
    label: "Image alt text",
    hint: "Describes an image as it is uploaded in /admin.",
  },
];

/**
 * Whether one feature may run right now.
 *
 * Reads a settings object of either shape — the row (`ai_features`) or the
 * mapped client value (`aiFeatures`) — because the worker holds the first and
 * the admin the second, and a second spelling of this check is a second thing
 * to get wrong. Anything missing is off.
 */
export function aiFeatureOn(settings, key) {
  const flags = settings?.ai_features || settings?.aiFeatures || {};
  return flags[AI_MASTER_KEY] === true && flags[key] === true;
}

// The subject axis for starter questions. Four chips are drawn per page load,
// one from each of four random categories — a flat shuffle of the pool below
// would regularly offer four reading questions at once, and the chips are the
// only advertisement the archive's breadth gets.
export const QUESTION_CATEGORIES = [
  "reading", "running", "treks", "writing", "work", "site",
];

// Every question here is a shape the conversation log shows the archive answers
// well: thematic, single-item, facts-backed, or roster-backed. Superlatives the
// data does not record ("his favourite book") are deliberately absent — they
// refuse, and a chip that refuses reads as a broken feature.
//
// The live pool is ask_settings.question_pool, edited at /admin/ask/settings;
// migration 0020 seeds it from this exact list.
export const DEFAULT_QUESTION_POOL = [
  { q: "What kind of books does he read?", c: "reading" },
  { q: "What has he read in Marathi?", c: "reading" },
  { q: "What does he read about technology?", c: "reading" },
  { q: "Has he written reviews of the books he's read?", c: "reading" },
  { q: "मराठी पुस्तकांविषयी सांग.", c: "reading" },

  { q: "What are his personal bests across distances?", c: "running" },
  { q: "Tell me about the 50K ultra at Lonavala", c: "running" },
  { q: "How far has he run in total?", c: "running" },
  { q: "What has running taught him?", c: "running" },
  { q: "How does he train for a marathon?", c: "running" },
  { q: "त्याने पळालेल्या मॅरेथॉनविषयी सांग.", c: "running" },

  { q: "Which forts has he trekked?", c: "treks" },
  { q: "Which of his treks was the hardest?", c: "treks" },
  { q: "Which trek would he recommend to a beginner?", c: "treks" },
  { q: "Tell me about the Harishchandragad trek", c: "treks" },
  { q: "त्याने केलेल्या ट्रेकबद्दल माहिती दे.", c: "treks" },

  { q: "What is the 100 Days to Offload challenge?", c: "writing" },
  { q: "What does he write about most?", c: "writing" },
  { q: "What does he think about privacy and surveillance?", c: "writing" },
  { q: "What does he think about AI and writing?", c: "writing" },
  { q: "What does he think about digital wellbeing?", c: "writing" },

  { q: "What is he working on right now?", c: "work" },
  { q: "What does he do for a living?", c: "work" },
  { q: "Tell me about the E20 data story", c: "work" },
  { q: "What are his strongest skills?", c: "work" },
  { q: "Which projects has he built?", c: "work" },

  { q: "How was this second brain built?", c: "site" },
  { q: "What is this site, in one minute?", c: "site" },
  { q: "Which themes connect his books, runs and writing?", c: "site" },
];

export const ASK_PROVIDERS = ["gemini", "workers-ai"];

// Providers that can grade an answer. `jev` is the decision model; the other two
// answer the same rubric as JSON and are free.
export const ASK_JUDGE_PROVIDERS = ["jev", "gemini", "workers-ai"];

// The terminal rung of the tier ladder: no model answered, but retrieval did.
export const SEARCH_ONLY_TIER = "search-only";
