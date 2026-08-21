#!/usr/bin/env node
/**
 * Builds a self-contained infographic page from the word-count data:
 *   scripts/infographic-template.html + knowledge_base/blog-word-counts.json
 *     →  knowledge_base/blog-infographic.html
 *
 * The template carries all the markup, CSS and chart code; this step only
 * inlines the JSON at the `__DATA__` marker so the result opens straight from
 * disk with no fetch, no server and no CORS.
 *
 * Usage:
 *   1. npm run blogs:wordcount     (produces the JSON)
 *   2. npm run blogs:infographic
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE = path.join(ROOT, "scripts", "infographic-template.html");
const DATA = path.join(ROOT, "knowledge_base", "blog-word-counts.json");
// Shipped from public/, which Vite copies verbatim into build/ — so the page is
// served at /writing-ledger.html on Cloudflare Pages. The "." in the filename
// makes functions/_middleware.js skip it, so the page keeps its own <head>
// tags instead of getting the SPA's meta injected over the top.
const OUT = path.join(ROOT, "public", "writing-ledger.html");

if (!fs.existsSync(DATA)) {
  console.error("\nMissing knowledge_base/blog-word-counts.json — run `npm run blogs:wordcount` first.\n");
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(DATA, "utf8"));
const template = fs.readFileSync(TEMPLATE, "utf8");

// `<` / `>` are escaped so a post title can never terminate the host <script>
// element early. U+2028 / U+2029 are line terminators in JS but legal inside a
// JSON string, so they have to go too — built by code point to keep this file
// free of the literal characters.
const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);
const ESCAPES = {
  "<": "\\u003c",
  ">": "\\u003e",
  [LINE_SEP]: "\\u2028",
  [PARA_SEP]: "\\u2029",
};
const payload = JSON.stringify(report).replace(
  new RegExp("[<>" + LINE_SEP + PARA_SEP + "]", "g"),
  (ch) => ESCAPES[ch],
);

if (!template.includes("__DATA__")) {
  console.error("\nTemplate has no __DATA__ marker — nothing to inline.\n");
  process.exit(1);
}

fs.writeFileSync(OUT, template.replace("__DATA__", payload), "utf8");

const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`\n  ✓ ${report.totals.posts} posts, ${report.totals.words.toLocaleString("en-US")} words`);
console.log(`\nWrote ${path.relative(ROOT, OUT)} (${kb} KB, self-contained)\n`);
