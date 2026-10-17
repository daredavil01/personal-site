// node --test scripts/lib/indexnow.test.mjs  (npm run test:scripts)

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseSitemap, changedSince, payloads, KEY_PATH, MAX_URLS,
} from "./indexnow.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const XML = `<?xml version="1.0"?><urlset>
  <url><loc>https://sankettambare.in/</loc></url>
  <url><loc>https://sankettambare.in/books/1</loc><lastmod>2026-10-16T08:00:00+00:00</lastmod></url>
  <url><loc>https://sankettambare.in/treks/2</loc><lastmod>2026-01-01T00:00:00+00:00</lastmod></url>
</urlset>`;

test("reads loc and lastmod out of a sitemap", () => {
  assert.deepEqual(parseSitemap(XML), [
    { loc: "https://sankettambare.in/", lastmod: null },
    { loc: "https://sankettambare.in/books/1", lastmod: "2026-10-16T08:00:00+00:00" },
    { loc: "https://sankettambare.in/treks/2", lastmod: "2026-01-01T00:00:00+00:00" },
  ]);
});

test("submits only what changed in the window, unless asked for all", () => {
  const entries = parseSitemap(XML);
  const now = new Date("2026-10-17T00:00:00Z");
  assert.deepEqual(changedSince(entries, { days: 3, now }), ["https://sankettambare.in/books/1"]);
  assert.equal(changedSince(entries, { all: true, now }).length, 3);
});

test("never submits micro-post permalinks, but keeps the /micro-blog page", () => {
  const entries = parseSitemap(`<urlset>
    <url><loc>https://sankettambare.in/micro-blog</loc><lastmod>2026-10-16T00:00:00Z</lastmod></url>
    <url><loc>https://sankettambare.in/micro-blog/42</loc><lastmod>2026-10-16T00:00:00Z</lastmod></url>
  </urlset>`);
  const now = new Date("2026-10-17T00:00:00Z");
  const only = ["https://sankettambare.in/micro-blog"];
  assert.deepEqual(changedSince(entries, { days: 3, now }), only);
  assert.deepEqual(changedSince(entries, { all: true, now }), only);
});

test("splits into protocol-sized batches and names the key file", () => {
  const urls = Array.from({ length: MAX_URLS + 1 }, (_, i) => `https://sankettambare.in/micro-blog/${i}`);
  const out = payloads(urls, { site: "https://sankettambare.in", key: "k" });
  assert.equal(out.length, 2);
  assert.equal(out[0].host, "sankettambare.in");
  assert.equal(out[0].keyLocation, "https://sankettambare.in/indexnow-key.txt");
  assert.equal(out[1].urlList.length, 1);
});

test("the key file is committed and holds a valid key", () => {
  const key = fs.readFileSync(path.join(ROOT, "public", KEY_PATH), "utf8").trim();
  // IndexNow keys: 8–128 characters of a-z, A-Z, 0-9 and dashes.
  assert.match(key, /^[a-zA-Z0-9-]{8,128}$/);
});
