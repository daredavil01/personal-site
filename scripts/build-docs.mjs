#!/usr/bin/env node
/**
 * Regenerates the machine-written half of docs/ from the live database.
 *
 *   docs/data-model.md      table dictionary (columns, checks, row counts)
 *   docs/routes.md          route → component map, scraped from src/App.js
 *   docs/tags.md            the central tag list with counts
 *   docs/facts.json         the facts card, committed as an offline fallback
 *   docs/chatbot-context.md the token-budgeted card /ask injects into its prompt
 *
 * Two readers, one folder: coding agents read the long files, the chatbot reads
 * only chatbot-context.md.
 *
 * Everything between `<!-- generated:NAME start -->` and `<!-- generated:NAME
 * end -->` is rewritten; prose outside those markers survives. Hand-edit inside
 * a marker and the next run eats it — that is the point.
 *
 * Also pushes chatbot-context.md into ask_settings.context_doc so the worker
 * reads the same text the repo does, without a redeploy.
 *
 * Usage: npm run docs:build   (needs SUPABASE_SERVICE_ROLE_KEY in .env)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { getStatsPayload } from "./lib/statsSource.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROOT, "docs");

// --- minimal .env loader (same shape as the other scripts) -----------------
export function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

export function makeClient() {
  loadEnv();
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Fill .env (see .env.example).",
    );
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// --- generated-block splicing ----------------------------------------------

// Replaces the body between the named markers, creating the file (and the
// markers) if it does not exist yet.
function spliceBlock(file, name, body, headerIfNew) {
  const start = `<!-- generated:${name} start -->`;
  const end = `<!-- generated:${name} end -->`;
  const target = path.join(DOCS, file);
  let existing = fs.existsSync(target)
    ? fs.readFileSync(target, "utf8")
    : `${headerIfNew}\n\n${start}\n${end}\n`;

  if (!existing.includes(start)) {
    existing = `${existing.trimEnd()}\n\n${start}\n${end}\n`;
  }
  const pattern = new RegExp(
    `${start.replace(/[-[\]{}()*+?.\\^$|]/g, "\\$&")}[\\s\\S]*?${end.replace(
      /[-[\]{}()*+?.\\^$|]/g,
      "\\$&",
    )}`,
  );
  const next = existing.replace(pattern, `${start}\n${body.trim()}\n${end}`);
  fs.writeFileSync(target, next, "utf8");
  return target;
}

// --- the content tables we document and index ------------------------------

export const CONTENT_TABLES = [
  { table: "books", entity: "book", purpose: "Every book read, with the review link when there is one. `year` is the year READ, not published." },
  { table: "blogs", entity: "blog", purpose: "The 100 Days To Offload challenge ledger — one row per published post, pointing at Substack/WordPress." },
  { table: "microblog", entity: "microblog", purpose: "A 2013→2019 Tumblr archive, imported in bulk. Two languages, ~59% photo posts, short and unedited." },
  { table: "projects", entity: "project", purpose: "Things built, with problem/solution/outcome prose. `visible = false` means draft and is hidden by RLS, not by React." },
  { table: "presentations", entity: "presentation", purpose: "HTML slide decks hosted elsewhere and embedded by URL in an iframe. The row is metadata only; the deck text is fetched at index time." },
  { table: "sports", entity: "sport", purpose: "Races run. `date` is free text ('February 22, 2026'), `time` is chip time HH:MM:SS." },
  { table: "treks", entity: "trek", purpose: "Forts and hills climbed. `date` is free text in DD-MM-YYYY." },
  { table: "instagram", entity: "instagram", purpose: "Photo sets mirrored from Instagram. No detail route — everything renders on /instagram." },
  { table: "now_months", entity: "now", purpose: "One row per month of the /now page. `sections` is a free-form jsonb blob." },
  { table: "tags", entity: null, purpose: "The central tag vocabulary: lowercase name, display name, colour, category." },
  { table: "tag_associations", entity: null, purpose: "Polymorphic join from a tag to a row in any content table." },
  { table: "content_chunks", entity: null, purpose: "The /ask search index. Written only by `npm run ask:index` — never by hand." },
  { table: "ask_settings", entity: null, purpose: "Runtime config for /ask, edited from /admin. Singleton, id = 1." },
];

// Client-side field renames, so an agent reading this folder does not go
// looking for `project.description` in a component.
const FIELD_RENAMES = {
  projects: "`description` → `desc`, `tech_stack` → `techStack`, `slide_images` → `slideImages`",
  blogs: "tags live on `blog_tags`, not `tags`",
  sports: "`time_certificate_link` → `timeCertificateLink`, `bib_number` → `bibNumber`, `slide_images` → `slideImages`",
  treks: "`slide_images` → `slideImages`",
  microblog: "`source_id` → `sourceId`, `post_type` → `postType`, `image_url` → `imageUrl`",
  now_months: "`is_current` → `isCurrent`",
  tags: "`display_name` → `displayName`",
};

// --- generators -------------------------------------------------------------

async function buildDataModel(supabase) {
  const [{ data: columns }, { data: checks }] = await Promise.all([
    supabase.rpc("schema_columns"),
    supabase.rpc("schema_checks"),
  ]);

  const lines = [];
  for (const spec of CONTENT_TABLES) {
    const cols = (columns || []).filter((c) => c.table_name === spec.table);
    if (!cols.length) continue;
    const { count } = await supabase
      .from(spec.table)
      .select("*", { count: "exact", head: true });

    lines.push(`### \`${spec.table}\``);
    lines.push("");
    lines.push(`${spec.purpose}`);
    lines.push("");
    lines.push(`Rows: **${count ?? "?"}**` + (spec.entity ? ` · indexed as \`${spec.entity}\`` : ""));
    if (FIELD_RENAMES[spec.table]) {
      lines.push("");
      lines.push(`Client-side renames: ${FIELD_RENAMES[spec.table]}`);
    }
    lines.push("");
    lines.push("| column | type | null | default |");
    lines.push("|---|---|---|---|");
    for (const c of cols) {
      lines.push(
        `| \`${c.column_name}\` | ${c.data_type} | ${c.is_nullable ? "yes" : "no"} | ${
          c.column_default ? `\`${String(c.column_default).slice(0, 40)}\`` : "—"
        } |`,
      );
    }
    const tableChecks = (checks || []).filter((c) => c.table_name === spec.table);
    if (tableChecks.length) {
      lines.push("");
      lines.push("Constraints:");
      for (const c of tableChecks) lines.push(`- \`${c.definition}\``);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function buildRoutes() {
  const app = fs.readFileSync(path.join(ROOT, "src", "App.js"), "utf8");
  const rows = [...app.matchAll(/<Route\s+path="([^"]+)"\s+element={<(\w+)/g)].map(
    (m) => `| \`${m[1]}\` | ${m[2]} |`,
  );
  return ["| route | component |", "|---|---|", ...rows].join("\n");
}

async function buildTags(supabase) {
  const { data } = await supabase.rpc("tags_with_counts");
  const rows = (data || [])
    .slice()
    .sort((a, b) => (b.total || 0) - (a.total || 0))
    .map((t) => `| \`${t.name}\` | ${t.total} | ${t.category || "—"} |`);
  return ["| tag | items | category |", "|---|---|---|", ...rows].join("\n");
}

// The only artifact the chatbot itself reads. Hard budget: keep it small —
// it rides along on every single question.
const CONTEXT_TOKEN_BUDGET = 1200;

// Every figure on /stats, from the same hourly snapshot the page renders. One
// line per chapter: this card rides along on every question.
function statsSection(p) {
  if (!p?.stats) return "";
  const s = p.stats;
  const m = p.micro || {};
  const pb = (r) => (r ? `${r.time} (${r.title})` : "—");
  return `## Headline stats (the numbers on /stats, refreshed hourly)

- Reading: ${s.booksCount} books, ~${s.pagesTurnedK.toFixed(1)}k pages, ${s.booksEnglish} English / ${s.booksMarathi} Marathi; top genres ${s.topGenres.join(", ")}.
- Running: ${s.totalRaces} races, ${Math.round(s.totalKmRun)} km. PBs: marathon ${pb(s.pbMarathon)}, half ${pb(s.pbHalf)}, 10K ${pb(s.pbTenK)}.
- Treks: ${s.totalTreks} (${s.hardTreks} hard) over ${s.trekYearsActive} years; latest ${s.latestTrek}.
- 100 Days To Offload: ${s.offloadCount} of 100 posts.
- Micro posts: ${m.total ?? "?"}; longest daily streak ${m.longestStreak ?? "?"} days.
- Photos: ${s.instaPostCount} Instagram sets, ${s.totalPhotos} photos.
- Work: ${s.orgCount} organisations, ${s.projectCount} projects, ${s.certCount} certifications (latest: ${s.latestCert}).
- Based in ${p.personal?.city || "?"}.

`;
}

function buildChatbotContext(facts, statsPayload) {
  const c = facts?.counts || {};
  const topTags = (facts?.top_tags || [])
    .slice(0, 20)
    .map((t) => `${t.name} (${t.total})`)
    .join(", ");
  const fmt = (o) =>
    o ? Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(", ") : "—";

  return `# What this archive contains

Sanket Tambare's personal site. Every answer must come from the retrieved items
below the facts block, or from these facts. Never invent a title, date or link.

## Content types and where they live

- **Books** (${c.books ?? "?"}) — /books/:id. \`year\` is the year he READ it, not the
  publication year. \`date_precision\` is 'year' when the exact finish date is a guess.
  Status: ${fmt(facts?.books?.by_status)}. Language: ${fmt(facts?.books?.by_language)}.
- **Micro posts** (${c.microblog ?? "?"}) — /micro-blog/:id. A Tumblr archive,
  ${facts?.microblog?.date_range?.min || "?"} → ${facts?.microblog?.date_range?.max || "?"},
  English and Marathi, short and unedited. Many are photo posts with no text.
- **Blog posts** (${c.blogs ?? "?"}) — /100-days-to-offload/:id. Ledger rows that link out
  to Substack/WordPress. Their full text is indexed too; published essays with
  no ledger row are the **writing** type and link straight to the post.
- **Projects** (${c.projects ?? "?"}) — /projects/:id. Status: ${fmt(facts?.projects?.by_status)}.
- **Races** (${c.sports ?? "?"}) — /sports/:id. Distances: ${fmt(facts?.sports?.by_distance)}.
- **Treks** (${c.treks ?? "?"}) — /treks/:id. Forts and hills, mostly around Pune.
- **Instagram sets** (${c.instagram ?? "?"}) — /instagram (no detail page).
- **Now** — /now. Current entry: ${facts?.now_current?.month || "?"} ${facts?.now_current?.year || ""}.
- **Résumé** — /resume. Positions, degrees, certifications and skills.
- **Stats** — /stats and /writing-ledger.html. Every figure on those pages.
- **Tags, site pages, contact** — what each tag and page is, and how to reach him.

${statsSection(statsPayload)}## Tags

${c.tags ?? "?"} tags, shared across every content type, always lowercase.
Most used: ${topTags}.
Tag pages live at /tags/:name.

## Answering rules

- Cite by naming the item; the interface renders the links itself.
- Counting questions: use the facts block, never count the retrieved items.
- A retrieved micro post is a passing thought from years ago, not a considered
  position. Say so when it matters.
- If the retrieved items do not cover the question, say what the archive does
  cover instead of guessing.`;
}

// --- entry point ------------------------------------------------------------

export async function buildDocs(supabase) {
  if (!fs.existsSync(DOCS)) fs.mkdirSync(DOCS, { recursive: true });

  const { data: facts, error: factsError } = await supabase.rpc("site_facts");
  if (factsError) throw factsError;

  const written = [];
  written.push(
    spliceBlock(
      "data-model.md",
      "data-model",
      await buildDataModel(supabase),
      "# Data model\n\nGenerated from the live database by `npm run docs:build`. The prose\noutside the generated block is hand-written; edit it freely. Anything inside\nthe markers is overwritten on the next run.\n\nSee [entities.md](entities.md) for what these tables *mean*.",
    ),
  );
  written.push(
    spliceBlock(
      "routes.md",
      "routes",
      buildRoutes(),
      "# Routes\n\nScraped from `src/App.js` by `npm run docs:build`.",
    ),
  );
  written.push(
    spliceBlock(
      "tags.md",
      "tags",
      await buildTags(supabase),
      "# Tags\n\nThe central tag vocabulary with usage counts, from `tags_with_counts()`.",
    ),
  );

  fs.writeFileSync(
    path.join(DOCS, "facts.json"),
    `${JSON.stringify(facts, null, 2)}\n`,
    "utf8",
  );
  written.push(path.join(DOCS, "facts.json"));

  // Same hourly snapshot the /stats page renders; a docs run never fails on it.
  const statsPayload = await getStatsPayload().then((r) => r.payload).catch(() => null);
  const context = buildChatbotContext(facts, statsPayload);
  fs.writeFileSync(path.join(DOCS, "chatbot-context.md"), `${context}\n`, "utf8");
  written.push(path.join(DOCS, "chatbot-context.md"));

  // ~4 chars per token is close enough to catch the file doubling in size.
  const approxTokens = Math.round(context.length / 4);
  if (approxTokens > CONTEXT_TOKEN_BUDGET) {
    console.warn(
      `  ! chatbot-context.md is ~${approxTokens} tokens, over the ${CONTEXT_TOKEN_BUDGET} budget`,
    );
  }

  const { error: pushError } = await supabase
    .from("ask_settings")
    .update({ context_doc: context, context_doc_updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (pushError) console.warn(`  ! could not push context_doc: ${pushError.message}`);

  return { written, facts, approxTokens };
}

async function main() {
  const supabase = makeClient();
  const { written, approxTokens } = await buildDocs(supabase);
  for (const f of written) console.log(`  wrote ${path.relative(ROOT, f)}`);
  console.log(`  chatbot context ~${approxTokens} tokens`);
}

if (import.meta.url === `file://${process.argv[1]}` ||
    process.argv[1]?.endsWith("build-docs.mjs")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
