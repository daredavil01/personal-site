#!/usr/bin/env node
/**
 * Renders every share-card layout against the shared fixtures and writes a
 * contact sheet. This is how cards get reviewed — there is no other way to see
 * one without deploying, because the real endpoint runs at the edge.
 *
 *   npm run og:preview                 # every layout
 *   npm run og:preview -- --only=trek  # one kind or page slug
 *
 * Needs no network and no Supabase: fixtures stand in for rows, so this runs
 * anywhere. Output lands in the gitignored knowledge_base/ folder, matching the
 * repo rule that generated caches never go in public/.
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

import { FONT_FACES } from "../src/lib/og/fonts.js";
import { ogModelFor, PAGE_SLUGS } from "../src/lib/og/model.js";
import { OG_CARDS } from "../src/lib/og/registry.js";
import { ENTITY_FIXTURES, STATS_FIXTURE } from "../src/lib/og/fixtures.js";
import { renderCard } from "../src/lib/og/render.js";
import { CARD } from "../src/lib/og/tokens.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "knowledge_base", "og-preview");
const FONT_DIR = path.join(ROOT, "public", "og", "fonts");

const only = (process.argv.find((a) => a.startsWith("--only=")) || "").split("=")[1] || null;

// --fallbacks writes the committed public/og/*.png set instead of a preview.
// These are what `OG_MODE=static` serves and what the endpoint redirects to
// when a row is missing or a render fails.
//
// They are rendered with NO stats payload on purpose: a fallback must not
// assert a number it cannot verify, and `stat()` drops any tile without a real
// value. Re-run this after changing a page layout or LAYOUT_VERSION.
const writeFallbacks = process.argv.includes("--fallbacks");

async function loadFonts() {
  return Promise.all(FONT_FACES.map(async (face) => ({
    name: face.name,
    weight: face.weight,
    style: face.style,
    data: await fs.promises.readFile(path.join(FONT_DIR, face.file)),
  })));
}

// Inlined so the contact sheet shows the portrait cards as they will actually
// ship. The endpoint points at the site's own /images/me.jpg instead.
function portraitDataUri() {
  try {
    const bytes = fs.readFileSync(path.join(ROOT, "public", "images", "me.jpg"));
    return `data:image/jpeg;base64,${bytes.toString("base64")}`;
  } catch (_) {
    return null;
  }
}

function buildJobs() {
  const portrait = portraitDataUri();
  const jobs = [];

  if (writeFallbacks) {
    return PAGE_SLUGS.map((slug) => ({
      name: slug,
      label: `fallback / ${slug}`,
      model: ogModelFor("page", slug, { stats: null, siteUrl: "", portrait }),
    }));
  }

  PAGE_SLUGS.forEach((slug) => {
    jobs.push({
      name: `page-${slug}`,
      label: `page / ${slug}`,
      model: ogModelFor("page", slug, { stats: STATS_FIXTURE, siteUrl: "", portrait }),
    });
  });
  Object.keys(ENTITY_FIXTURES).forEach((kind) => {
    jobs.push({
      name: `entity-${kind}`,
      label: `entity / ${kind}`,
      model: ogModelFor(kind, ENTITY_FIXTURES[kind], { supabaseUrl: "" }),
    });
  });
  return only ? jobs.filter((j) => j.name.includes(only)) : jobs;
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
  await initWasm(await fs.promises.readFile(path.join(ROOT, "functions", "api", "og", "resvg.wasm")));
  const fonts = await loadFonts();
  const outDir = writeFallbacks ? path.join(ROOT, "public", "og") : OUT;
  await fs.promises.mkdir(outDir, { recursive: true });

  const jobs = buildJobs();
  if (!jobs.length) {
    console.error(`No layouts matched --only=${only}`);
    process.exit(1);
  }

  const rasterise = (svg) => new Resvg(svg, { fitTo: { mode: "width", value: CARD.width } }).render().asPng();
  const rendered = [];
  let failed = 0;

  for (const job of jobs) {
    if (!job.model) {
      rendered.push({ ...job, error: "no model built for this kind" });
      failed += 1;
      continue;
    }
    const layout = (OG_CARDS[job.model.kind] || OG_CARDS.page).layout;
    try {
      const started = Date.now();
      // eslint-disable-next-line no-await-in-loop -- sequential keeps peak memory flat and timings honest
      const png = await renderCard(layout(job.model), { satori, fonts, rasterise });
      const ms = Date.now() - started;
      // eslint-disable-next-line no-await-in-loop
      await fs.promises.writeFile(path.join(outDir, `${job.name}.png`), png);
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
    console.info(`Wrote ${ok.length} fallback cards to ${path.relative(ROOT, outDir)} — commit them.`);
  } else {
    console.info(`Contact sheet: ${path.relative(ROOT, path.join(OUT, "index.html"))}`);
  }
  console.info("Local timings say nothing about the Workers Free 10ms CPU limit — see docs/og-cards.md.");
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
