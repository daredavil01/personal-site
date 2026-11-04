#!/usr/bin/env node
/**
 * Renders the seven 30-second vertical page films (1080×1920, 30 fps, H.264 +
 * AAC): /about, /resume, /writing-ledger, /micro-blog, /presentations,
 * /sports and /treks.
 *
 *   npm run page:films                          # all seven masters
 *   npm run page:films -- --only=sports,treks   # some of them
 *   npm run page:films -- --only=about --frame=5,12.5   # stills, for review
 *   npm run page:films -- --publish             # web copies for the pages
 *   npm run page:films -- --recapture           # re-shoot the deck screenshots
 *
 * The picture is scripts/page-films/film.html?film=<name>, a page that draws
 * any moment of itself; Chrome seeks it frame by frame on several tabs, each
 * piping JPEGs into its own ffmpeg. The music is synthesised by score.mjs on
 * the 120 BPM grid the cuts use, and the site's SFX sprite adds the hits. The
 * numbers are read by data.mjs from the live tables and committed JSON — like
 * the share cards, they are baked in when it renders, so re-render after
 * content moves. The storylines are in docs/page-films.md.
 *
 * Masters: knowledge_base/page-films/<slug>.mp4 (gitignored).
 * --publish re-encodes each master to public/video/page-films/<slug>.{mp4,jpg,vtt}
 * (720×1280; the captions are the words each scene puts on screen). Those
 * files are committed and held to a budget by src/components/common/pageFilms.test.js.
 * Needs ffmpeg and a Chromium (playwright-core or playwright).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

import SFX_MAP from "../../src/atlas/audio/sfxMap.js";
import { PAGE_FILMS } from "../../src/data/pageFilms.js";
import { gather, OUT, ROOT } from "./data.mjs";
import { renderScore, toWav } from "./score.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.join(OUT, ".work");
const SHOTS = path.join(OUT, "cache", "decks");
const PUBLIC = path.join(ROOT, "public", "video", "page-films");
const FPS = 30;
const DURATION = 30;

const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || "").split("=").slice(1).join("=") || null;
const flag = (name) => process.argv.includes(`--${name}`);
const run = (bin, args) => execFileSync(bin, args, { stdio: ["ignore", "ignore", "pipe"] });

async function loadChromium() {
  const mod = await import("playwright-core").catch(() => null);
  if (mod?.chromium) return mod.chromium;
  try {
    return createRequire(import.meta.url)("playwright").chromium;
  } catch (_) {
    throw new Error("No Playwright: npm i --no-save playwright-core");
  }
}

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => fs.existsSync(p));

function findFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return "ffmpeg";
  } catch (_) {
    throw new Error("ffmpeg not found on PATH.");
  }
}

// --- deck screenshots (once; --recapture to redo) ----------------------------------

function deckShooter(browser) {
  return async (decks) => {
    fs.mkdirSync(SHOTS, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const out = [];
    for (const d of decks) { // eslint-disable-line no-restricted-syntax
      const file = path.join(SHOTS, `${d.id}.jpg`);
      if (!fs.existsSync(file) || flag("recapture")) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await page.goto(d.url, { waitUntil: "networkidle", timeout: 30000 });
          // eslint-disable-next-line no-await-in-loop
          await page.waitForTimeout(1800);
          // eslint-disable-next-line no-await-in-loop
          fs.writeFileSync(file, await page.screenshot({ type: "jpeg", quality: 82 }));
          console.info(`  deck ${d.id}  ${d.title}`);
        } catch (e) {
          console.warn(`  deck ${d.id} not captured: ${e.message.split("\n")[0]}`);
        }
      }
      out.push(fs.existsSync(file) ? pathToFileURL(file).href : null);
    }
    await page.close();
    return out;
  };
}

// --- picture ------------------------------------------------------------------------

async function openPage(browser, name, dataFile) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const url = `${pathToFileURL(path.join(HERE, "film.html")).href}?film=${name}&data=${encodeURIComponent(pathToFileURL(dataFile).href)}`;
  await page.goto(url);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 90000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error(`film.html (${name}): ${err}`);
  return page;
}

async function frameAt(page, t, type = "jpeg") {
  await page.evaluate((v) => window.renderAt(v), t);
  return page.screenshot(type === "jpeg" ? { type, quality: 92 } : { type });
}

function encodeRange(ffmpeg, page, from, to, file, label) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, [
      "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
      "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-r", String(FPS), file,
    ], { stdio: ["pipe", "ignore", "pipe"] });
    let err = "";
    proc.stderr.on("data", (c) => { err += c; });
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${err}`))));
    (async () => {
      const started = Date.now();
      for (let f = from; f < to; f += 1) {
        // eslint-disable-next-line no-await-in-loop -- frames are strictly in order
        const jpg = await frameAt(page, f / FPS);
        // eslint-disable-next-line no-await-in-loop
        if (!proc.stdin.write(jpg)) await new Promise((r) => proc.stdin.once("drain", r));
        if ((f - from) % 150 === 0) console.info(`  ${label}  ${((f - from) / (to - from) * 100).toFixed(0).padStart(3)}%  ${((Date.now() - started) / 1000).toFixed(0)}s`);
      }
      proc.stdin.end();
    })().catch(reject);
  });
}

// --- sound ----------------------------------------------------------------------------

function mixAudio(ffmpeg, name, video, out, cuts, flashes) {
  const score = path.join(WORK, `${name}-score.wav`);
  fs.writeFileSync(score, toWav(renderScore(name, DURATION, [...new Set([...flashes, 26])])));
  const sprite = path.join(ROOT, "public", "audio", "sfx.m4a");
  // Whooshes on the scene cuts, a stamp on each flash, a chime on the end card.
  const SFX = [
    ...cuts.filter((t) => t > 0.5 && t < 26).map((at) => ({ name: "whoosh", at: Math.max(0, at - 0.25) })),
    ...flashes.map((at) => ({ name: "stamp", at })),
    { name: "chime", at: 26.4 },
  ];
  const names = [...new Set(SFX.map((e) => e.name))];
  const files = names.map((nm) => {
    const [offset, len] = SFX_MAP[nm];
    const f = path.join(WORK, `sfx-${nm}.wav`);
    run(ffmpeg, ["-y", "-ss", String(offset), "-t", String(len), "-i", sprite, "-ac", "2", "-ar", "44100", f]);
    return f;
  });
  const graph = ["[1:a]aresample=44100[score]"];
  const mixed = ["[score]"];
  names.forEach((nm, k) => {
    const mine = SFX.filter((e) => e.name === nm);
    graph.push(`[${k + 2}:a]asplit=${mine.length}${mine.map((_, j) => `[${nm}${j}]`).join("")}`);
    mine.forEach((e, j) => {
      graph.push(`[${nm}${j}]adelay=${Math.round(e.at * 1000)}:all=1,volume=${nm === "whoosh" ? 0.55 : 0.5}[${nm}e${j}]`);
      mixed.push(`[${nm}e${j}]`);
    });
  });
  graph.push(`${mixed.join("")}amix=inputs=${mixed.length}:normalize=0:duration=first,afade=t=in:d=0.3,afade=t=out:st=${DURATION - 1.5}:d=1.5,loudnorm=I=-14:TP=-1:LRA=9,aresample=48000[aout]`);
  run(ffmpeg, [
    "-y", "-i", video, "-i", score, ...files.flatMap((f) => ["-i", f]),
    "-filter_complex", graph.join(";"), "-map", "0:v", "-map", "[aout]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-maxrate", "6M", "-bufsize", "12M", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-t", String(DURATION), "-movflags", "+faststart", out,
  ]);
}

// --- the page copy ------------------------------------------------------------------

const stamp = (s) => {
  const ms = Math.round(s * 1000);
  return `00:${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
};

function publish(ffmpeg, film) {
  const src = path.join(OUT, `${film.slug}.mp4`);
  const cuesFile = path.join(OUT, `${film.slug}.cues.json`);
  if (!fs.existsSync(src)) throw new Error(`${path.relative(ROOT, src)} is missing: render it first`);
  fs.mkdirSync(PUBLIC, { recursive: true });
  const base = path.join(PUBLIC, film.slug);
  run(ffmpeg, [
    "-y", "-i", src, "-vf", "scale=720:1280:flags=lanczos,hqdn3d=2:2:3:3",
    "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-maxrate", "850k", "-bufsize", "1700k", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", `${base}.mp4`,
  ]);
  run(ffmpeg, ["-y", "-ss", String(film.poster), "-i", src, "-frames:v", "1", "-vf", "scale=720:1280", "-q:v", "4", `${base}.jpg`]);
  const cues = JSON.parse(fs.readFileSync(cuesFile, "utf8"));
  fs.writeFileSync(`${base}.vtt`, `WEBVTT\n\n${cues.map(([a, b, txt]) => `${stamp(a)} --> ${stamp(b)}\n${txt}\n`).join("\n")}`);
  const kb = Math.round(fs.statSync(`${base}.mp4`).size / 1024);
  console.info(`Published public/video/page-films/${film.slug}.{mp4,jpg,vtt}  (${kb.toLocaleString("en-IN")} KB)`);
}

// --- main -----------------------------------------------------------------------------

async function renderFilm(browser, ffmpeg, film, dataFile) {
  const frames = (arg("frame") || "").split(",").filter(Boolean).map(Number);
  if (frames.length) {
    const page = await openPage(browser, film.key, dataFile);
    for (const t of frames) { // eslint-disable-line no-restricted-syntax
      // eslint-disable-next-line no-await-in-loop
      fs.writeFileSync(path.join(OUT, `${film.slug}-${t}.png`), await frameAt(page, t, "png"));
    }
    await page.close();
    console.info(`Wrote ${frames.length} frame(s) of ${film.slug} to ${path.relative(ROOT, OUT)}/`);
    return;
  }
  const probe = await openPage(browser, film.key, dataFile);
  const meta = await probe.evaluate(() => ({ cues: window.CUES, cuts: window.CUES.map((c) => c[0]), flashes: window.FLASHES }));
  const { flashes } = meta;
  await probe.close();
  fs.writeFileSync(path.join(OUT, `${film.slug}.cues.json`), JSON.stringify(meta.cues, null, 1));

  const workers = Math.max(1, Math.min(Number(arg("workers")) || Math.max(1, os.cpus().length - 1), 8));
  const total = DURATION * FPS;
  const per = Math.ceil(total / workers);
  const ranges = Array.from({ length: workers }, (_, i) => [i * per, Math.min(total, (i + 1) * per)]).filter(([a, b]) => b > a);
  console.info(`${film.slug}: ${total} frames on ${ranges.length} tabs.`);
  const started = Date.now();
  const segs = await Promise.all(ranges.map(async ([a, b], i) => {
    const page = await openPage(browser, film.key, dataFile);
    const file = path.join(WORK, `${film.slug}-seg-${i}.mp4`);
    await encodeRange(ffmpeg, page, a, b, file, `${film.slug} tab ${i + 1}`);
    await page.close();
    return file;
  }));
  const list = path.join(WORK, `${film.slug}-segs.txt`);
  fs.writeFileSync(list, segs.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n"));
  const video = path.join(WORK, `${film.slug}-video.mp4`);
  run(ffmpeg, ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", video]);
  const out = path.join(OUT, `${film.slug}.mp4`);
  mixAudio(ffmpeg, film.key, video, out, meta.cuts, flashes);
  console.info(`${path.relative(ROOT, out)}  ${(fs.statSync(out).size / 1048576).toFixed(1)} MB  in ${((Date.now() - started) / 1000).toFixed(0)}s`);
}

async function main() {
  fs.mkdirSync(WORK, { recursive: true });
  const ffmpeg = findFfmpeg();
  const only = (arg("only") || "").split(",").filter(Boolean);
  const films = PAGE_FILMS.filter((f) => !only.length || only.includes(f.key) || only.includes(f.slug));
  if (!films.length) throw new Error(`No film matches --only=${only.join(",")}. Films: ${PAGE_FILMS.map((f) => f.key).join(", ")}`);

  if (flag("publish")) {
    films.forEach((f) => publish(ffmpeg, f));
    return;
  }
  const chromium = await loadChromium();
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  try {
    const data = await gather(films.map((f) => f.key), { deckShots: deckShooter(browser) });
    const dataFile = path.join(WORK, "data.js");
    fs.writeFileSync(dataFile, `window.FILM = ${JSON.stringify(data)};\n`);
    for (const film of films) { // eslint-disable-line no-restricted-syntax
      // eslint-disable-next-line no-await-in-loop
      await renderFilm(browser, ffmpeg, film, dataFile);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
