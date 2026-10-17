#!/usr/bin/env node
/**
 * Submit recently changed URLs to IndexNow (Bing and friends).
 *
 *   npm run indexnow                  URLs whose sitemap lastmod is in the last 3 days
 *   npm run indexnow -- --days 14     a wider window
 *   npm run indexnow -- --all         every URL in the sitemap (first run, after a move)
 *   npm run indexnow -- --dry-run     list what would be sent, send nothing
 *
 * Reads the LIVE sitemap, so it submits what is actually deployed. Needs no
 * secret: the key is public at /indexnow-key.txt. Runs nightly in
 * .github/workflows/ask-refresh.yml and as the last step of `npm run refresh`.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ENDPOINT, KEY_PATH, parseSitemap, changedSince, payloads,
} from "./lib/indexnow.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const site = value("--site", "https://sankettambare.in").replace(/\/$/, "");
const days = Number(value("--days", 3));
const all = flag("--all");
const dry = flag("--dry-run");
const key = fs.readFileSync(path.join(ROOT, "public", KEY_PATH), "utf8").trim();

const res = await fetch(`${site}/sitemap.xml`);
if (!res.ok) {
  console.error(`Could not read ${site}/sitemap.xml: HTTP ${res.status}`);
  process.exit(1);
}
const entries = parseSitemap(await res.text());
const urls = changedSince(entries, { days, all });
console.log(`${entries.length} URLs in the sitemap; ${urls.length} to submit (${all ? "all" : `changed in the last ${days} days`}).`);
if (!urls.length) process.exit(0);

if (dry) {
  urls.forEach((u) => console.log(`  ${u}`));
  process.exit(0);
}

for (const body of payloads(urls, { site, key })) {
  // eslint-disable-next-line no-await-in-loop -- batches go one at a time
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  // 200 = accepted, 202 = accepted, key validation pending.
  if (r.status !== 200 && r.status !== 202) {
    console.error(`IndexNow refused ${body.urlList.length} URLs: HTTP ${r.status} ${await r.text()}`);
    process.exit(1);
  }
  console.log(`Submitted ${body.urlList.length} URLs (HTTP ${r.status}).`);
}
