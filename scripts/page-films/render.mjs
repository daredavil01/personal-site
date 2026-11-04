#!/usr/bin/env node
/**
 * Renders the vertical page films with Remotion (1080×1920, 30 fps, H.264 +
 * AAC): seven of 30 seconds — /about, /resume, /writing-ledger, /micro-blog,
 * /presentations, /sports, /treks — and four of 45 — /newsletter,
 * /100-days-to-offload, /now and /ask, each of which shows its page in both
 * shells, classic and atlas, from phone screenshots of the live site.
 *
 *   npm run page:films                          # all seven masters
 *   npm run page:films -- --only=sports,treks   # some of them (key or slug)
 *   npm run page:films -- --only=about --frame=5,12.5   # PNG stills, for review
 *   npm run page:films -- --publish             # web copies for the pages
 *   npm run page:films -- --recapture           # re-shoot the deck and page screenshots
 *
 * 1. data.mjs reads what each film says from the live tables (and fetches the
 *    race / fort photos and deck screenshots once into knowledge_base/).
 * 2. script.js turns that into each film's plan: scenes with their lengths and
 *    slide-ins, the burned-in captions with a time per word, and every sound cue.
 * 3. score.mjs synthesises the music and mixes every cue into it, so each
 *    whoosh, tick, key click and shutter lands on the frame it belongs to.
 * 4. Remotion bundles remotion/index.jsx and renders the plan.
 *
 * Masters: knowledge_base/page-films/<slug>.mp4 (gitignored). --publish
 * re-encodes each to public/video/page-films/<slug>.{mp4,jpg,vtt,json} (720×1280;
 * the .vtt is the same caption chunks the film burns in), committed and held
 * to a budget by src/components/common/pageFilms.test.js. Numbers are baked in
 * when it renders: re-render after content moves. Storylines: docs/page-films.md.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

import { PAGE_FILMS } from "../../src/data/pageFilms.js";
import { gather, OUT, ROOT } from "./data.mjs";
import { buildFilm, FPS } from "./script.js";
import { mixSfx, renderScore, toWav } from "./score.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.join(OUT, ".work");
const PUB = path.join(WORK, "public");
const SHOTS = path.join(OUT, "cache", "decks");
const PAGES = path.join(OUT, "cache", "pages");
const SITE = process.env.FILM_SITE || "https://sankettambare.in";
const PAGE_W = 390;
const PAGE_H = 2400; // css px of each page kept, for the phone to scroll through
const WEB = path.join(ROOT, "public", "video", "page-films");
const CHROME = process.env.CHROME_PATH || (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : null);
const FONTS = [
  "noto-serif-latin-400-normal.woff", "noto-serif-latin-700-normal.woff", "plus-jakarta-sans-latin-700-normal.woff",
  "inter-latin-400-normal.woff", "inter-latin-700-normal.woff",
  "noto-sans-devanagari-devanagari-400-normal.woff", "noto-sans-devanagari-devanagari-700-normal.woff",
];

const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || "").split("=").slice(1).join("=") || null;
const flag = (name) => process.argv.includes(`--${name}`);
const run = (args) => execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });

async function loadPlaywright() {
  const mod = await import("playwright-core").catch(() => null);
  if (mod?.chromium) return mod.chromium;
  return createRequire(import.meta.url)("playwright").chromium;
}

// --- deck screenshots (once; --recapture to redo) -------------------------------------

async function deckShots(decks) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const file = (d) => path.join(SHOTS, `${d.id}.jpg`);
  const missing = decks.filter((d) => flag("recapture") || !fs.existsSync(file(d)));
  if (missing.length) {
    const chromium = await loadPlaywright();
    const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    for (const d of missing) { // eslint-disable-line no-restricted-syntax
      try {
        await page.goto(d.url, { waitUntil: "networkidle", timeout: 30000 }); // eslint-disable-line no-await-in-loop
        await page.waitForTimeout(1800); // eslint-disable-line no-await-in-loop
        fs.writeFileSync(file(d), await page.screenshot({ type: "jpeg", quality: 82 })); // eslint-disable-line no-await-in-loop
        console.info(`  deck ${d.id}  ${d.title}`);
      } catch (e) {
        console.warn(`  deck ${d.id} not captured: ${e.message.split("\n")[0]}`);
      }
    }
    await browser.close();
  }
  return decks.map((d) => (fs.existsSync(file(d)) ? pathToFileURL(file(d)).href : null));
}

// --- each page in both shells, at phone size (once; --recapture to redo) -----------

let pageBrowser = null;
async function pageShots(route) {
  fs.mkdirSync(PAGES, { recursive: true });
  const out = {};
  for (const mode of ["classic", "atlas"]) { // eslint-disable-line no-restricted-syntax
    const name = `${route.replace(/^\//, "").replace(/\W+/g, "-")}-${mode}`;
    const file = path.join(PAGES, `${name}.jpg`);
    const meta = path.join(PAGES, `${name}.json`);
    if (flag("recapture") || !fs.existsSync(file) || !fs.existsSync(meta)) {
      if (!pageBrowser) pageBrowser = await (await loadPlaywright()).launch(CHROME ? { executablePath: CHROME } : {}); // eslint-disable-line no-await-in-loop
      const page = await pageBrowser.newPage({ viewport: { width: PAGE_W, height: 844 }, deviceScaleFactor: 1.5 }); // eslint-disable-line no-await-in-loop
      try {
        await page.goto(`${SITE}${route}?view=${mode}`, { waitUntil: "networkidle", timeout: 60000 }); // eslint-disable-line no-await-in-loop
      } catch (_) { /* a long-polling page still renders */ }
      await page.waitForTimeout(2500); // eslint-disable-line no-await-in-loop
      // The atlas greets a first visit with passport toasts; a film shows the page, not the welcome.
      await page.evaluate(() => { // eslint-disable-line no-await-in-loop
        document.querySelectorAll("body *").forEach((el) => {
          const cs = getComputedStyle(el);
          if (cs.position === "fixed" && /stamped|Got it|passport/i.test(el.textContent || "")) el.remove();
        });
      });
      const full = await page.evaluate(() => document.documentElement.scrollHeight); // eslint-disable-line no-await-in-loop
      const height = Math.min(PAGE_H, full);
      fs.writeFileSync(file, await page.screenshot({ type: "jpeg", quality: 78, fullPage: true, clip: { x: 0, y: 0, width: PAGE_W, height } })); // eslint-disable-line no-await-in-loop
      fs.writeFileSync(meta, JSON.stringify({ route, mode, ratio: height / PAGE_W, at: new Date().toISOString() }));
      await page.close(); // eslint-disable-line no-await-in-loop
      console.info(`  page ${route} (${mode})`);
    }
    out[mode] = { file: pathToFileURL(file).href, ratio: JSON.parse(fs.readFileSync(meta, "utf8")).ratio };
  }
  return out;
}

// Remotion serves files from its public dir: copy each file:// asset in and
// hand the composition its name instead.
function stage(value) {
  if (typeof value === "string" && value.startsWith("file://")) {
    const file = fileURLToPath(value);
    const name = `a-${path.basename(path.dirname(file))}-${path.basename(file)}`;
    if (!fs.existsSync(path.join(PUB, name))) fs.copyFileSync(file, path.join(PUB, name));
    return name;
  }
  if (Array.isArray(value)) return value.map(stage);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stage(v)]));
  return value;
}

// --- the page copy --------------------------------------------------------------------------

const stamp = (frames) => {
  const ms = Math.round((frames / FPS) * 1000);
  return `00:${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
};

function publish(film) {
  const src = path.join(OUT, `${film.slug}.mp4`);
  const capFile = path.join(OUT, `${film.slug}.captions.json`);
  if (!fs.existsSync(src) || !fs.existsSync(capFile)) throw new Error(`${path.relative(ROOT, src)} is missing: render it first`);
  fs.mkdirSync(WEB, { recursive: true });
  const base = path.join(WEB, film.slug);
  run([
    "-y", "-i", src, "-vf", "scale=720:1280:flags=lanczos,hqdn3d=2:2:3:3",
    "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-maxrate", "900k", "-bufsize", "1800k", "-pix_fmt", "yuv420p",
    "-af", "loudnorm=I=-14:TP=-1:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "112k", "-movflags", "+faststart", `${base}.mp4`,
  ]);
  run(["-y", "-ss", String(film.poster), "-i", src, "-frames:v", "1", "-vf", "scale=720:1280", "-q:v", "4", `${base}.jpg`]);
  const caps = JSON.parse(fs.readFileSync(capFile, "utf8"));
  fs.copyFileSync(path.join(OUT, `${film.slug}.chapters.json`), `${base}.json`);
  fs.writeFileSync(`${base}.vtt`, `WEBVTT\n\n${caps.map((c) => `${stamp(c.from)} --> ${stamp(c.to + 4)}\n${c.words.map((w) => w.w).join(" ")}\n`).join("\n")}`);
  console.info(`Published public/video/page-films/${film.slug}.{mp4,jpg,vtt}  (${Math.round(fs.statSync(`${base}.mp4`).size / 1024).toLocaleString("en-IN")} KB)`);
}

// --- main -------------------------------------------------------------------------------------

async function main() {
  const only = (arg("only") || "").split(",").filter(Boolean);
  const films = PAGE_FILMS.filter((f) => !only.length || only.includes(f.key) || only.includes(f.slug));
  if (!films.length) throw new Error(`No film matches --only=${only.join(",")}. Films: ${PAGE_FILMS.map((f) => f.key).join(", ")}`);
  if (flag("publish")) {
    films.forEach(publish);
    return;
  }

  fs.mkdirSync(PUB, { recursive: true });
  FONTS.forEach((f) => fs.copyFileSync(path.join(ROOT, "scripts", "og-fonts", f), path.join(PUB, f)));
  run(["-y", "-f", "lavfi", "-i", "color=c=gray:s=512x512", "-vf", "noise=alls=90:allf=u", "-frames:v", "1", path.join(PUB, "grain.png")]);
  const all = stage(await gather(films.map((f) => f.key), { deckShots, pageShots }));
  if (pageBrowser) await pageBrowser.close();

  console.info("Bundling the composition…");
  const serveUrl = await bundle({ entryPoint: path.join(HERE, "remotion", "index.jsx"), publicDir: PUB, onProgress: () => {} });
  const frames = (arg("frame") || "").split(",").filter(Boolean).map(Number);

  for (const film of films) { // eslint-disable-line no-restricted-syntax
    const data = all[film.key];
    const plan = buildFilm(film.key, data);
    fs.writeFileSync(path.join(OUT, `${film.slug}.captions.json`), JSON.stringify(plan.captions));
    fs.writeFileSync(path.join(OUT, `${film.slug}.chapters.json`), `${JSON.stringify({
      duration: plan.frames / FPS,
      sound: "Synthesised score and sound effects; captions burned in",
      chapters: plan.scenes.map((s) => ({ title: s.chapter, start: Math.round((s.from / FPS) * 10) / 10 })),
    }, null, 1)}\n`);
    // Music, then every sound cue of the plan mixed in on its frame.
    const audio = mixSfx(renderScore(film.key, plan.frames / FPS, plan.hits), plan.sfx, FPS);
    fs.writeFileSync(path.join(PUB, `${film.key}.wav`), toWav(audio));
    const inputProps = { film: film.key, data, name: film.label, route: film.route };
    // eslint-disable-next-line no-await-in-loop
    const composition = await selectComposition({ serveUrl, id: "PageFilm", inputProps, browserExecutable: CHROME });
    if (frames.length) {
      for (const s of frames) { // eslint-disable-line no-restricted-syntax
        // eslint-disable-next-line no-await-in-loop
        await renderStill({
          serveUrl, composition, inputProps, frame: Math.min(plan.frames - 1, Math.round(s * FPS)), output: path.join(OUT, `${film.slug}-${s}.png`), browserExecutable: CHROME,
        });
      }
      console.info(`${film.slug}: ${frames.length} still(s)  (${plan.scenes.length} scenes, ${plan.sfx.length} sound cues)`);
      continue; // eslint-disable-line no-continue
    }
    const out = path.join(OUT, `${film.slug}.mp4`);
    const started = Date.now();
    let last = -1;
    process.stdout.write(`${film.slug}: ${plan.scenes.length} scenes, ${plan.sfx.length} sound cues, ${plan.captions.length} caption lines  `);
    // eslint-disable-next-line no-await-in-loop
    await renderMedia({
      serveUrl, composition, inputProps, codec: "h264", crf: 18, audioCodec: "aac", outputLocation: out, browserExecutable: CHROME,
      concurrency: Number(arg("concurrency")) || null,
      onProgress: ({ progress }) => { const p = Math.floor(progress * 10); if (p !== last) { last = p; process.stdout.write(`${p * 10}% `); } },
    });
    console.info(`\n  ${path.relative(ROOT, out)}  ${(fs.statSync(out).size / 1048576).toFixed(1)} MB in ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
