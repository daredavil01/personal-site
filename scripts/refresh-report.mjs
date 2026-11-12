#!/usr/bin/env node
/**
 * Before/after report for `npm run refresh` (the /site-upkeep skill, .claude/skills/site-upkeep/).
 *
 *   node scripts/refresh-report.mjs snapshot <file>     record the numbers now
 *   node scripts/refresh-report.mjs diff <before-file>  compare, then validate
 *
 * The snapshot reads the committed data files (writing ledger, blog text
 * cache, logbook, micro-blog insights, share cards) and the live tables the
 * refresh writes (changelog summaries, chapter summaries, /ask chunks). `diff`
 * prints a Markdown table of what moved and a list of checks; it exits 1 when
 * a check fails, so a refresh that left something behind cannot read as done.
 *
 * Read-only. Needs SUPABASE_SERVICE_ROLE_KEY for the table half; without it
 * the file half still runs and the table checks are reported as skipped.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./build-docs.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CARD_CAP = 300 * 1024;
// Over the cap before this report existed (CLAUDE.md, docs/og-cards.md);
// reported, but only a newly oversized card fails.
const KNOWN_LARGE_CARDS = new Set(["about.png", "home.png", "instagram.png"]);

const readJson = (rel) => {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
};

function files() {
  const ledger = readJson("public/data/writing-ledger.json");
  const cache = readJson("knowledge_base/blog-posts-text.json");
  const logbook = readJson("public/data/logbook.json");
  const micro = readJson("public/data/microblog-insights.json");
  const anomalies = {};
  (ledger?.anomalies || []).forEach((a) => { anomalies[a.kind] = (anomalies[a.kind] || 0) + 1; });
  const cards = {};
  const ogDir = path.join(ROOT, "public", "og");
  if (fs.existsSync(ogDir)) {
    fs.readdirSync(ogDir).filter((f) => f.endsWith(".png"))
      .forEach((f) => { cards[f] = fs.statSync(path.join(ogDir, f)).size; });
  }
  const cachePosts = cache ? (Array.isArray(cache.posts) ? cache.posts : Object.values(cache.posts || {})) : [];
  return {
    ledger: ledger && {
      posts: ledger.totals?.posts,
      words: ledger.totals?.words,
      tracked: ledger.totals?.trackedPosts,
      latest: ledger.totals?.latestPost,
      anomalies,
      unmatched: (ledger.anomalies || []).filter((a) => a.kind === "unmatched_blogs_row").map((a) => a.title),
      urls: (ledger.posts || []).map((p) => p.url),
    },
    textCache: cache && { posts: cachePosts.length, missing: (cache.missing || []).length },
    logbook: logbook && {
      posts: logbook.totals?.posts,
      words: logbook.totals?.words,
      regions: (logbook.clusters || []).length,
      // Characters, not bytes: logbook.test.js measures the string (Marathi
      // is three bytes a letter, so the file on disk reads larger).
      chars: fs.readFileSync(path.join(ROOT, "public/data/logbook.json"), "utf8").length,
    },
    microblog: micro && {
      posts: micro.all?.posts,
      last: micro.all?.last,
      bytes: fs.statSync(path.join(ROOT, "public/data/microblog-insights.json")).size,
    },
    cards,
  };
}

async function tables() {
  loadEnv();
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: versions, error: vErr } = await db.from("changelog").select("version, major, summary");
  if (vErr) throw new Error(`changelog: ${vErr.message}`);
  const { data: majors, error: mErr } = await db.from("changelog_majors").select("major, model");
  if (mErr) throw new Error(`changelog_majors: ${mErr.message}`);
  const haveMajor = new Set((majors || []).map((m) => m.major));

  const chunks = {};
  for (let from = 0; ; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await db.from("content_chunks").select("entity_type").range(from, from + 999);
    if (error) throw new Error(`content_chunks: ${error.message}`);
    data.forEach((r) => { chunks[r.entity_type] = (chunks[r.entity_type] || 0) + 1; });
    if (data.length < 1000) break;
  }

  return {
    versions: versions.length,
    latestVersion: versions.map((v) => v.version)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0],
    versionsWithoutSummary: versions.filter((v) => !v.summary).map((v) => v.version),
    majorsWithoutSummary: [...new Set(versions.map((v) => v.major))].filter((m) => !haveMajor.has(m)),
    majorsByModel: (majors || []).reduce((acc, m) => ({ ...acc, [m.model || "?"]: (acc[m.model || "?"] || 0) + 1 }), {}),
    chunks,
  };
}

const fmt = (v) => (v === undefined || v === null ? "—" : typeof v === "number" ? v.toLocaleString("en-IN") : String(v));

function row(label, a, b) {
  const moved = JSON.stringify(a) !== JSON.stringify(b);
  let delta = "";
  if (typeof a === "number" && typeof b === "number" && a !== b) delta = ` (${b - a > 0 ? "+" : ""}${b - a})`;
  return `| ${label} | ${fmt(a)} | ${fmt(b)}${delta} | ${moved ? "changed" : ""} |`;
}

function report(before, after) {
  const lines = ["| Measure | Before | After | |", "|---|---|---|---|"];
  const b = before; const a = after;
  lines.push(row("Ledger posts", b.files.ledger?.posts, a.files.ledger?.posts));
  lines.push(row("Ledger words", b.files.ledger?.words, a.files.ledger?.words));
  lines.push(row("Ledger posts tracked in `blogs`", b.files.ledger?.tracked, a.files.ledger?.tracked));
  lines.push(row("Latest post", b.files.ledger?.latest, a.files.ledger?.latest));
  lines.push(row("Text cache posts", b.files.textCache?.posts, a.files.textCache?.posts));
  lines.push(row("Text cache missing", b.files.textCache?.missing, a.files.textCache?.missing));
  lines.push(row("Logbook posts", b.files.logbook?.posts, a.files.logbook?.posts));
  lines.push(row("Logbook regions", b.files.logbook?.regions, a.files.logbook?.regions));
  lines.push(row("Micro-blog posts", b.files.microblog?.posts, a.files.microblog?.posts));
  lines.push(row("Micro-blog latest", b.files.microblog?.last, a.files.microblog?.last));
  if (b.tables && a.tables) {
    lines.push(row("Changelog versions", b.tables.versions, a.tables.versions));
    lines.push(row("Latest version", b.tables.latestVersion, a.tables.latestVersion));
    lines.push(row("Versions without a summary", b.tables.versionsWithoutSummary.length, a.tables.versionsWithoutSummary.length));
    lines.push(row("Majors without a summary", b.tables.majorsWithoutSummary.length, a.tables.majorsWithoutSummary.length));
    const types = [...new Set([...Object.keys(b.tables.chunks), ...Object.keys(a.tables.chunks)])].sort();
    lines.push(row("/ask chunks (all)", sum(b.tables.chunks), sum(a.tables.chunks)));
    types.forEach((t) => {
      if (b.tables.chunks[t] !== a.tables.chunks[t]) lines.push(row(`/ask chunks: ${t}`, b.tables.chunks[t], a.tables.chunks[t]));
    });
  }
  const newPosts = (a.files.ledger?.urls || []).filter((u) => !(b.files.ledger?.urls || []).includes(u));
  const cardsMoved = Object.keys(a.files.cards).filter((c) => a.files.cards[c] !== b.files.cards[c]);
  return { table: lines.join("\n"), newPosts, cardsMoved };
}

const sum = (o) => Object.values(o || {}).reduce((s, n) => s + n, 0);

function checks(after) {
  const out = [];
  const add = (ok, label, detail = "", level = "fail") => out.push({ ok, label, detail, level });
  const { ledger, textCache, logbook, microblog, cards } = after.files;

  add(textCache && textCache.missing === 0, "Every post's text is in the cache",
    textCache ? `${textCache.missing} missing — Substack did not answer; run where it does` : "cache file missing");
  add(ledger && logbook && ledger.posts === logbook.posts, "Logbook counts every ledger post",
    `ledger ${fmt(ledger?.posts)}, logbook ${fmt(logbook?.posts)}`);
  add(ledger && ledger.unmatched.length === 0, "Every `blogs` row matches a published post",
    ledger?.unmatched.join("; "), "warn");
  // The same measures and limits as logbook.test.js and microblogInsights.test.js.
  add(logbook && logbook.chars < 200 * 1024, "logbook.json within its 200 K-character budget", `${Math.round((logbook?.chars || 0) / 1024)} K characters`);
  add(microblog && microblog.bytes < 150 * 1024, "microblog-insights.json within its 150 KB budget", `${Math.round((microblog?.bytes || 0) / 1024)} KB`);
  const big = Object.entries(cards).filter(([f, s]) => s > CARD_CAP && !KNOWN_LARGE_CARDS.has(f)).map(([f]) => f);
  add(big.length === 0, "No newly oversized share card (300 KB cap)", big.join(", "));

  if (after.tables) {
    const t = after.tables;
    add(t.versionsWithoutSummary.length === 0, "Every changelog version has a summary", t.versionsWithoutSummary.join(", "));
    add(t.majorsWithoutSummary.length === 0, "Every major has a chapter summary", t.majorsWithoutSummary.map((m) => `v${m}`).join(", "));
    const writing = (t.chunks.writing || 0);
    add(writing > 0 && (ledger?.posts || 0) > 0, "/ask holds essay text (writing chunks)", `${writing} chunks`);
  } else {
    add(true, "Table checks", "skipped — no SUPABASE_SERVICE_ROLE_KEY", "warn");
  }
  return out;
}

async function snapshot() {
  return { takenAt: new Date().toISOString(), files: files(), tables: await tables() };
}

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (mode === "snapshot" && file) {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(await snapshot(), null, 1));
    console.log(`snapshot written to ${file}`);
    return;
  }
  if (mode === "diff" && file) {
    const before = JSON.parse(fs.readFileSync(file, "utf8"));
    const after = await snapshot();
    const { table, newPosts, cardsMoved } = report(before, after);
    console.log("## What moved\n");
    console.log(table);
    if (newPosts.length) console.log(`\n**New posts in the ledger (${newPosts.length}):**\n${newPosts.map((u) => `- ${u}`).join("\n")}`);
    if (cardsMoved.length) console.log(`\n**Share cards re-rendered:** ${cardsMoved.join(", ")}`);
    const list = checks(after);
    console.log("\n## Checks\n");
    list.forEach((c) => {
      const mark = c.ok ? "PASS" : c.level === "warn" ? "WARN" : "FAIL";
      console.log(`- ${mark} — ${c.label}${c.detail && !c.ok ? `: ${c.detail}` : c.detail && c.level === "warn" ? `: ${c.detail}` : ""}`);
    });
    if (list.some((c) => !c.ok && c.level === "fail")) process.exit(1);
    return;
  }
  console.error("Usage: node scripts/refresh-report.mjs snapshot <file> | diff <before-file>");
  process.exit(2);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
