#!/usr/bin/env node
/**
 * Builds `content_chunks` — the search index behind /ask — from every content
 * table plus the two hand-written markdown files, then regenerates docs/.
 *
 * Idempotent: upserts on (entity_type, entity_id, chunk_index) and skips rows
 * whose `updated_at` already matches the stored `source_updated_at`, so a
 * re-run after editing one book re-embeds one book.
 *
 * Embeddings come from Cloudflare Workers AI (@cf/baai/bge-m3, 1024 dims,
 * multilingual — the archive is part Marathi). The whole corpus is ~400k tokens,
 * which is well inside the free daily neuron allowance.
 *
 * Uses the SERVICE ROLE key (bypasses RLS) — run locally only.
 *
 * Usage:
 *   1. Apply supabase/migrations/0009_second_brain.sql.
 *   2. .env needs SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
 *      CF_ACCOUNT_ID and CF_API_TOKEN (a token with Workers AI read access).
 *   3. npm run ask:index            (add --full to re-embed everything)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildDocs, makeClient } from "./build-docs.mjs";
import { EMBEDDING_MODEL, entityUrl } from "../src/data/askConfig.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EMBED_BATCH = 32;
// Workers AI rejects a request whose texts total more than 60k tokens, and it
// counts every text in the batch PADDED to the longest one — so the cost of a
// batch is (item count x longest item), not the sum of the items.
const EMBED_TOKEN_BUDGET = 45000;
const EMBED_MAX_CHARS = 4000;
const UPSERT_BATCH = 200;
const MAX_CHUNK_CHARS = 1200;
const FULL = process.argv.includes("--full");

const supabase = makeClient();

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;
if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
  console.error("Missing CF_ACCOUNT_ID / CF_API_TOKEN in .env (Workers AI embeddings).");
  process.exit(1);
}

// --- helpers ----------------------------------------------------------------

const clean = (v) =>
  String(v ?? "")
    .replace(/\s+/g, " ")
    .trim();

// One flat labelled string per chunk. Metadata is inlined on purpose: the
// keyword half of hybrid_search then matches on "Marathi" or "42 Kms" even
// though those live in columns, not prose.
function compose(parts) {
  return parts
    .filter(([, v]) => v !== null && v !== undefined && clean(v) !== "")
    .map(([label, v]) => (label ? `${label}: ${clean(v)}` : clean(v)))
    .join(" | ");
}

// Splits long prose on paragraph boundaries, never mid-sentence.
//
// Line endings are normalised first: the markdown files in src/data are CRLF,
// and /\n{2,}/ does not match \r\n\r\n — without this the whole changelog comes
// back as one 136KB "paragraph" and everything past its first 4000 characters
// is dropped at embedding time.
function splitProse(text, limit = MAX_CHUNK_CHARS) {
  const paras = String(text || "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out = [];
  let current = "";
  const flush = () => {
    if (current) out.push(current);
    current = "";
  };
  for (const p of paras) {
    if (p.length > limit) {
      // One paragraph over the limit (a long changelog entry) still has to be
      // cut somewhere; cut on a line break rather than mid-word.
      flush();
      let rest = p;
      while (rest.length > limit) {
        const cut = rest.lastIndexOf("\n", limit);
        const at = cut > limit / 2 ? cut : limit;
        out.push(rest.slice(0, at).trim());
        rest = rest.slice(at).trim();
      }
      current = rest;
    } else if (current && current.length + p.length + 2 > limit) {
      flush();
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  flush();
  return out.length ? out : [""];
}

// Free-text dates: "February 22, 2026" (sports) and "17-02-2019" (treks).
function parseLooseDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  const dmy = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return s;
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString().slice(0, 10);
  return null;
}

async function fetchAll(table, columns = "*, tag_names") {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

// --- per-table chunk builders ----------------------------------------------
//
// Each returns [{ entity_type, entity_id, chunk_index, title, url, body,
// chunk_date, tags, source_updated_at }].

function bookChunks(rows) {
  return rows.map((r) => ({
    entity_type: "book",
    entity_id: r.id,
    chunk_index: 0,
    title: r.title,
    url: entityUrl("book", r.id),
    chunk_date: r.date_finished || null,
    tags: r.tag_names || [],
    source_updated_at: r.updated_at,
    body: compose([
      ["Book", r.title],
      ["Author", r.author],
      ["Translator", r.translator],
      ["Category", r.category],
      ["Language", r.language],
      ["Status", r.status],
      ["Year read", r.year],
      ["Rating", r.rating ? `${r.rating}/5` : null],
      ["Publisher", r.publisher],
      ["Format", r.format],
      ["Tags", (r.tag_names || []).join(", ")],
      [null, r.description],
      ["Quote", r.quote],
      ["Note", r.note],
      ["Review", r.blog_link],
    ]),
  }));
}

function blogChunks(rows) {
  return rows.map((r) => ({
    entity_type: "blog",
    entity_id: r.id,
    chunk_index: 0,
    title: r.blog_title,
    url: entityUrl("blog", r.id),
    chunk_date: parseLooseDate(r.blog_date),
    tags: r.tag_names || [],
    source_updated_at: r.updated_at,
    body: compose([
      ["Blog post", r.blog_title],
      ["Published", r.blog_date],
      ["Platform", r.blog_platform],
      ["Language", r.language],
      ["Tags", (r.tag_names || []).join(", ")],
      [null, r.blog_description],
      ["Link", r.blog_link],
    ]),
  }));
}

function microblogChunks(rows) {
  return rows.map((r) => ({
    entity_type: "microblog",
    entity_id: r.id,
    chunk_index: 0,
    title: r.title || `${r.post_type} post`,
    url: entityUrl("microblog", r.id),
    chunk_date: r.date || null,
    tags: r.tag_names || [],
    source_updated_at: r.updated_at,
    body: compose([
      ["Micro post", r.title],
      ["Date", r.date],
      ["Type", r.post_type],
      ["Tags", (r.tag_names || []).join(", ")],
      [null, r.text],
    ]),
  }));
}

function projectChunks(rows) {
  const out = [];
  for (const r of rows.filter((p) => p.visible)) {
    const head = compose([
      ["Project", r.title],
      ["Subtitle", r.subtitle],
      ["Category", r.category],
      ["Status", r.status],
      ["Role", r.role],
      ["Org", r.org],
      ["Date", r.date],
      ["Tech", (r.tech_stack || []).join(", ")],
      ["Tags", (r.tag_names || []).join(", ")],
      [null, r.description],
      ["Highlights", (r.highlights || []).join(" · ")],
    ]);
    const detail = compose([
      ["Problem", r.problem],
      ["Solution", r.solution],
      ["Outcome", r.outcome],
    ]);
    const bodies = [head, ...splitProse(detail).filter(Boolean)];
    bodies.forEach((body, i) => {
      out.push({
        entity_type: "project",
        entity_id: r.id,
        chunk_index: i,
        title: r.title,
        url: entityUrl("project", r.id),
        chunk_date: r.date || null,
        tags: r.tag_names || [],
        source_updated_at: r.updated_at,
        body: i === 0 ? body : compose([["Project", r.title], [null, body]]),
      });
    });
  }
  return out;
}

function sportChunks(rows) {
  return rows.map((r) => ({
    entity_type: "sport",
    entity_id: r.id,
    chunk_index: 0,
    title: r.title,
    url: entityUrl("sport", r.id),
    chunk_date: parseLooseDate(r.date),
    tags: r.tag_names || [],
    source_updated_at: r.updated_at,
    body: compose([
      ["Race", r.title],
      ["Date", r.date],
      ["Place", r.place],
      ["Distance", r.distance],
      ["Finish time", r.time],
      ["Bib", r.bib_number],
      ["Tags", (r.tag_names || []).join(", ")],
      [null, r.description],
    ]),
  }));
}

function trekChunks(rows) {
  return rows.map((r) => ({
    entity_type: "trek",
    entity_id: r.id,
    chunk_index: 0,
    title: r.fort_name,
    url: entityUrl("trek", r.id),
    chunk_date: parseLooseDate(r.date),
    tags: r.tag_names || [],
    source_updated_at: r.updated_at,
    body: compose([
      ["Trek", r.fort_name],
      ["Date", r.date],
      ["Duration", r.trek_time],
      ["Endurance", r.endurance_level],
      ["Tags", (r.tag_names || []).join(", ")],
      ["Write-up", r.blog_link],
    ]),
  }));
}

function instagramChunks(rows) {
  return rows.map((r) => ({
    entity_type: "instagram",
    entity_id: r.id,
    chunk_index: 0,
    title: r.title,
    url: entityUrl("instagram", r.id),
    chunk_date: null,
    tags: r.tag_names || [],
    source_updated_at: r.updated_at,
    body: compose([
      ["Instagram set", r.title],
      ["Tags", (r.tag_names || []).join(", ")],
      [null, r.caption],
    ]),
  }));
}

// The /now page: each month's `sections` blob flattened into readable prose.
function nowChunks(rows) {
  return rows.map((r) => {
    const sections = r.sections || {};
    const flat = Object.entries(sections)
      .map(([key, value]) => {
        const text = Array.isArray(value)
          ? value
              .map((item) =>
                typeof item === "string" ? item : Object.values(item || {}).join(" "),
              )
              .join(" · ")
          : typeof value === "object"
            ? Object.values(value || {}).join(" · ")
            : String(value ?? "");
        return `${key}: ${clean(text)}`;
      })
      .filter((s) => s.split(": ")[1]);
    return {
      entity_type: "now",
      entity_id: r.id,
      chunk_index: 0,
      title: `Now — ${r.month} ${r.year}`,
      url: entityUrl("now", r.id),
      chunk_date: null,
      tags: [],
      source_updated_at: r.updated_at,
      body: compose([
        ["Now update", `${r.month} ${r.year}`],
        ["Current", r.is_current ? "yes" : "no"],
        [null, flat.join(" | ")],
      ]),
    };
  });
}

// Two hand-written files that are not in Postgres. Stable synthetic ids so the
// unique key keeps working across runs.
const PAGE_FILES = [
  { id: 1, file: "src/data/about.md", title: "About", url: "/about" },
  { id: 2, file: "src/data/changelog.md", title: "Changelog", url: "/changelog" },
];

function pageChunks() {
  const out = [];
  for (const spec of PAGE_FILES) {
    const abs = path.join(ROOT, spec.file);
    if (!fs.existsSync(abs)) continue;
    const raw = fs.readFileSync(abs, "utf8").replace(/^---[\s\S]*?---\n/, "");
    const stat = fs.statSync(abs);
    splitProse(raw).forEach((body, i) => {
      out.push({
        entity_type: "page",
        entity_id: spec.id,
        chunk_index: i,
        title: spec.title,
        url: spec.url,
        chunk_date: null,
        tags: [],
        source_updated_at: stat.mtime.toISOString(),
        body: compose([[spec.title, null], [null, body]]) || body,
      });
    });
  }
  return out;
}

// --- embeddings -------------------------------------------------------------

async function embed(texts) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${EMBEDDING_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: texts }),
    },
  );
  if (!res.ok) {
    throw new Error(`Workers AI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = await res.json();
  const vectors = json?.result?.data;
  if (!Array.isArray(vectors) || vectors.length !== texts.length) {
    throw new Error(`Workers AI returned ${vectors?.length ?? "no"} vectors for ${texts.length} texts`);
  }
  return vectors;
}

// --- main -------------------------------------------------------------------

async function main() {
  console.log(FULL ? "Rebuilding the whole index…" : "Indexing changed content…");

  const [books, blogs, micro, projects, sports, treks, instagram, nowMonths] =
    await Promise.all([
      fetchAll("books"),
      fetchAll("blogs"),
      fetchAll("microblog"),
      fetchAll("projects"),
      fetchAll("sports"),
      fetchAll("treks"),
      fetchAll("instagram"),
      fetchAll("now_months", "*"),
    ]);

  const chunks = [
    ...bookChunks(books),
    ...blogChunks(blogs),
    ...microblogChunks(micro),
    ...projectChunks(projects),
    ...sportChunks(sports),
    ...trekChunks(treks),
    ...instagramChunks(instagram),
    ...nowChunks(nowMonths),
    ...pageChunks(),
  ].filter((c) => clean(c.body).length > 0);

  console.log(`  ${chunks.length} chunks composed`);

  // What is already indexed, and at which source version.
  // Paginated: PostgREST caps an unbounded select at 1000 rows, and a truncated
  // picture here makes every run re-embed the tail of the index.
  const existing = [];
  const existingPage = 1000;
  for (let from = 0; ; from += existingPage) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase
      .from("content_chunks")
      .select("entity_type, entity_id, chunk_index, source_updated_at")
      .order("id", { ascending: true })
      .range(from, from + existingPage - 1);
    if (error) throw error;
    existing.push(...(data || []));
    if (!data || data.length < existingPage) break;
  }

  const key = (c) => `${c.entity_type}:${c.entity_id}:${c.chunk_index}`;
  // Compared as instants, not strings: Postgres hands back "...479+00:00" where
  // Node wrote "...479Z", and a string compare marks those rows stale forever.
  const stamp = (v) => (v ? Date.parse(v) : null);
  const seen = new Map(existing.map((r) => [key(r), stamp(r.source_updated_at)]));

  const stale = FULL
    ? chunks
    : chunks.filter((c) => seen.get(key(c)) !== stamp(c.source_updated_at));
  console.log(`  ${stale.length} need embedding`);

  // Batches are packed against the padded cost above, not a simple sum, and the
  // per-text estimate is deliberately pessimistic (2 chars/token) because
  // Devanagari tokenises far worse than English and half this archive is Marathi.
  let done = 0;
  let cursor = 0;
  while (cursor < stale.length) {
    const batch = [];
    let longest = 0;
    while (cursor < stale.length && batch.length < EMBED_BATCH) {
      const text = stale[cursor].body.slice(0, EMBED_MAX_CHARS);
      const estimate = Math.ceil(text.length / 2);
      const padded = Math.max(longest, estimate) * (batch.length + 1);
      if (batch.length && padded > EMBED_TOKEN_BUDGET) break;
      batch.push({ chunk: stale[cursor], text });
      longest = Math.max(longest, estimate);
      cursor += 1;
    }
    // eslint-disable-next-line no-await-in-loop
    const vectors = await embed(batch.map((b) => b.text));
    batch.forEach((b, j) => {
      b.chunk.embedding = vectors[j];
    });
    done += batch.length;
    process.stdout.write(`\r  embedded ${done}/${stale.length}`);
  }
  if (stale.length) process.stdout.write("\n");

  for (let i = 0; i < stale.length; i += UPSERT_BATCH) {
    const batch = stale.slice(i, i + UPSERT_BATCH);
    const { error } = await supabase
      .from("content_chunks")
      .upsert(batch, { onConflict: "entity_type,entity_id,chunk_index" });
    if (error) throw error;
  }

  // Drop chunks whose source row is gone (deleted book, hidden project, a
  // changelog that got shorter). Cheap at this size: compare the full key set.
  const live = new Set(chunks.map(key));
  const orphans = existing.filter((r) => !live.has(key(r)));
  for (const o of orphans) {
    await supabase
      .from("content_chunks")
      .delete()
      .match({
        entity_type: o.entity_type,
        entity_id: o.entity_id,
        chunk_index: o.chunk_index,
      });
  }
  if (orphans.length) console.log(`  removed ${orphans.length} orphaned chunks`);

  console.log("Regenerating docs/…");
  const { approxTokens } = await buildDocs(supabase);
  console.log(`  chatbot context ~${approxTokens} tokens`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(`\n${err.message || err}`);
  process.exit(1);
});
