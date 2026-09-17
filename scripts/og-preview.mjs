#!/usr/bin/env node
/**
 * Generates the share cards. This is the ONLY thing that renders a card —
 * nothing runs at request time any more.
 *
 *   npm run og:fallbacks               # write public/og/*.png — commit them
 *   npm run og:preview                 # same cards into a reviewable contact sheet
 *   npm run og:preview -- --only=books # one slug
 *   npm run og:fallbacks -- --offline  # skip the stats fetch, use the fixture
 *
 * Numbers come from the same `/api/stats` snapshot the /stats page renders
 * (scripts/lib/statsSource.mjs: live endpoint first, else computed from
 * Supabase with the anon key), so a card can never disagree with the page it
 * summarises. That also means the committed PNGs age: re-run this after
 * content lands, the way `npm run blogs:wordcount` is re-run.
 *
 * The contact sheet shows each card at full size AND at 300px wide. The 300px
 * column is the real test: that is roughly what WhatsApp renders, and a layout
 * that dies there is broken however good it looks large.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";

import { FONT_FACES, FONT_DIR } from "../src/lib/og/fonts.js";
import { firstSlideImage, storageUrl } from "../src/lib/og/paths.js";
import { pageModel, PAGE_SLUGS } from "../src/lib/og/model.js";
import { pageCard } from "../src/lib/og/layouts/page.js";
import { STATS_FIXTURE } from "../src/lib/og/fixtures.js";
import { renderCard } from "../src/lib/og/render.js";
import { CARD } from "../src/lib/og/tokens.js";
import { getStatsPayload, STATS_URL } from "./lib/statsSource.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "knowledge_base", "og-preview");
const FONTS = path.join(ROOT, FONT_DIR);
// resvg's wasm is read straight out of node_modules: this is a Node-only build
// step, so there is nothing to vendor. (It was committed under functions/ only
// because a Worker cannot fetch and compile wasm at runtime.)
const WASM = path.join(ROOT, "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm");

const only = (process.argv.find((a) => a.startsWith("--only=")) || "").split("=")[1] || null;
// --fallbacks writes the committed public/og/ set; without it, a contact sheet.
const writeFallbacks = process.argv.includes("--fallbacks");
const offline = process.argv.includes("--offline");

async function loadFonts() {
  return Promise.all(FONT_FACES.map(async (face) => ({
    name: face.name,
    weight: face.weight,
    style: face.style,
    data: await fs.promises.readFile(path.join(FONTS, face.file)),
  })));
}

// Inlined rather than linked: satori has to read the pixels to composite the
// portrait, and a data URI keeps the render free of network I/O.
function portraitDataUri() {
  try {
    const bytes = fs.readFileSync(path.join(ROOT, "public", "images", "me.jpg"));
    return `data:image/jpeg;base64,${bytes.toString("base64")}`;
  } catch (_) {
    return null;
  }
}

// The Supabase url and publishable key, read from wrangler.toml when the
// environment does not carry them. Both are public — they are baked into the
// browser bundle by Vite, and wrangler.toml [vars] is their committed home — so
// reading them from there means the cards never quietly lose their photos just
// because a shell had no .env loaded.
function publicSupabase() {
  const fromEnv = {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    key: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  };
  if (fromEnv.url && fromEnv.key) return fromEnv;
  try {
    const toml = fs.readFileSync(path.join(ROOT, "wrangler.toml"), "utf8");
    const pick = (name) => (toml.match(new RegExp(`^${name}\\s*=\\s*"([^"]+)"`, "m")) || [])[1];
    return {
      url: fromEnv.url || pick("VITE_SUPABASE_URL"),
      key: fromEnv.key || pick("VITE_SUPABASE_PUBLISHABLE_KEY"),
    };
  } catch (_) {
    return fromEnv;
  }
}

// The covers for the two contact-sheet cards.
//
// Targeted selects rather than `loadSiteStatsInput`, which reads every row on
// the site to compute numbers we already have. Ordering matches each page's
// own: newest first for photo sets, featured-then-newest for projects
// (src/lib/api/projects.js).
//
// WEBP IS UNUSABLE HERE. resvg decodes PNG, JPEG and GIF only, and /admin
// uploads .webp whenever a source image has transparency
// (src/lib/imageCompress.js), so roughly half the gallery is webp. satori
// embeds it happily and resvg then draws nothing, which is why two tiles came
// out as flat accent squares. So: over-fetch, keep what is decodable, inline it
// as a data URI — which also takes the network out of the render.
const DECODABLE = /^image\/(jpeg|png|gif)$/;

async function inlineImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (!DECODABLE.test(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch (_) {
    return null;
  }
}

async function loadCardPhotos() {
  const { url, key } = publicSupabase();
  if (!url || !key) return {};
  const headers = { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" };
  const get = async (query) => {
    const res = await fetch(`${url}/rest/v1/${query}`, { headers });
    if (!res.ok) throw new Error(`${query.split("?")[0]} ${res.status}`);
    return res.json();
  };
  // Enough candidates that six decodable ones survive the webp cull.
  const usable = async (urls) => (await Promise.all(urls.slice(0, 24).map(inlineImage)))
    .filter(Boolean)
    .slice(0, 6);
  try {
    const [sets, projects] = await Promise.all([
      get("instagram?select=slide_images&order=id.desc&limit=24"),
      // RLS keeps a draft project out of this, exactly as it does on the page.
      get("projects?select=image,slide_images&order=featured.desc,date.desc.nullslast,id.desc&limit=24"),
    ]);
    const [instagram, projectCovers] = await Promise.all([
      usable(sets.map((row) => firstSlideImage(row.slide_images, url)).filter(Boolean)),
      usable(projects
        .map((row) => storageUrl(row.image, url) || firstSlideImage(row.slide_images, url))
        .filter(Boolean)),
    ]);
    return { instagram, projects: projectCovers };
  } catch (err) {
    console.warn(`  ! cover photos unavailable (${err.message}); those cards render without a grid`);
    return {};
  }
}

// Real numbers if they can be had, the fixture if not — but say which, because
// a card quietly built from fixture data would ship a lie.
async function loadStats() {
  if (offline) return { payload: STATS_FIXTURE, from: "the offline fixture" };
  try {
    return await getStatsPayload();
  } catch (err) {
    console.warn(`  ! ${STATS_URL} unreachable (${err.message}); using the offline fixture`);
    return { payload: STATS_FIXTURE, from: "the offline fixture" };
  }
}

function sheet(rendered) {
  const rows = rendered.map((r) => `
    <section>
      <h2>${r.label} ${r.ms != null ? `<em>${r.ms}ms · ${(r.bytes / 1024).toFixed(0)}KB</em>` : '<em class="bad">failed</em>'}</h2>
      ${r.error ? `<pre class="bad">${r.error}</pre>` : `
      <div class="pair">
        <img class="full" src="./${r.name}.png" alt="${r.label} at full size">
        <img class="thumb" src="./${r.name}.png" alt="${r.label} at thumbnail size">
      </div>`}
    </section>`).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>OG card contact sheet</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 32px; background: #0b0910; color: #f8fafc;
         font: 15px/1.5 ui-sans-serif, system-ui, sans-serif; }
  h1 { font-size: 22px; margin: 0 0 6px; }
  p.note { color: #8b86a3; margin: 0 0 28px; max-width: 70ch; }
  section { margin-bottom: 34px; }
  h2 { font-size: 15px; font-weight: 600; margin: 0 0 10px; color: #c7c4d6; }
  h2 em { color: #8b86a3; font-style: normal; font-size: 13px; margin-left: 8px; }
  .bad { color: #f87171; }
  .pair { display: flex; gap: 20px; align-items: flex-start; }
  img { display: block; border-radius: 8px; border: 1px solid #2a2642; }
  .full { width: 760px; }
  .thumb { width: 300px; align-self: flex-start; }
  pre { white-space: pre-wrap; font-size: 13px; }
</style></head><body>
<h1>OG card contact sheet</h1>
<p class="note">Left column is full size. <strong>Right column is 300px</strong> &mdash; roughly what
WhatsApp renders, and the column that actually decides whether a layout works. Check that the
headline is still readable, the numbers have not collided, and any Devanagari has shaped correctly
(missing glyphs render as empty boxes, not as an error).</p>
${rows}
</body></html>`;
}

async function main() {
  await initWasm(await fs.promises.readFile(WASM));
  const fonts = await loadFonts();
  const { payload, from } = await loadStats();
  const photos = offline ? {} : await loadCardPhotos();
  // Committed by `npm run blogs:wordcount`, and what public/writing-ledger.html
  // itself fetches, so the card and the page count the same words.
  let ledger = null;
  try {
    ledger = JSON.parse(await fs.promises.readFile(path.join(ROOT, "public", "data", "writing-ledger.json"), "utf8"));
  } catch (_) {
    console.warn("  ! public/data/writing-ledger.json missing; the ledger card renders without figures");
  }
  console.info(`Stats from ${from}; ${(photos.instagram || []).length + (photos.projects || []).length} cover photos.`);

  const outDir = writeFallbacks ? path.join(ROOT, "public", "og") : OUT;
  await fs.promises.mkdir(outDir, { recursive: true });

  const portrait = portraitDataUri();
  const slugs = only ? PAGE_SLUGS.filter((s) => s.includes(only)) : PAGE_SLUGS;
  if (!slugs.length) {
    console.error(`No card matched --only=${only}`);
    process.exit(1);
  }

  const rasterise = (svg) => new Resvg(svg, { fitTo: { mode: "width", value: CARD.width } }).render().asPng();
  const rendered = [];
  let failed = 0;

  for (const slug of slugs) {
    const job = { name: slug, label: `page / ${slug}` };
    try {
      const model = pageModel(slug, payload, { portrait, photos, ledger });
      const started = Date.now();
      // eslint-disable-next-line no-await-in-loop -- sequential keeps peak memory flat and timings honest
      const png = await renderCard(pageCard(model), { satori, fonts, rasterise });
      const ms = Date.now() - started;
      // eslint-disable-next-line no-await-in-loop
      await fs.promises.writeFile(path.join(outDir, `${slug}.png`), png);
      rendered.push({ ...job, ms, bytes: png.length });
      console.info(`  ${String(ms).padStart(5)}ms  ${(png.length / 1024).toFixed(0).padStart(4)}KB  ${job.label}`);
    } catch (err) {
      rendered.push({ ...job, error: String(err && err.message ? err.message : err) });
      failed += 1;
      console.error(`  FAILED  ${job.label}: ${err && err.message}`);
    }
  }

  if (!writeFallbacks) {
    await fs.promises.writeFile(path.join(OUT, "index.html"), sheet(rendered));
  }

  const ok = rendered.filter((r) => !r.error);
  const times = ok.map((r) => r.ms).sort((a, b) => a - b);
  const median = times.length ? times[Math.floor(times.length / 2)] : 0;
  console.info(`\n${ok.length}/${rendered.length} cards rendered; median ${median}ms`);
  if (writeFallbacks) {
    console.info(`Wrote ${ok.length} cards to ${path.relative(ROOT, outDir)} — commit them.`);
  } else {
    console.info(`Contact sheet: ${path.relative(ROOT, path.join(OUT, "index.html"))}`);
  }
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
