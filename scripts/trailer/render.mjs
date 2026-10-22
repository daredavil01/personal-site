#!/usr/bin/env node
/**
 * Renders the 90-second vertical trailer (1080×1920, 30 fps, H.264 + AAC).
 *
 *   node scripts/trailer/capture.mjs              # once: the phone footage
 *   npm run trailer                               # the film
 *   npm run trailer -- --frame=12.5,40            # single frames, for review
 *   npm run trailer -- --from=34 --to=42          # one stretch, silent preview
 *   npm run trailer -- --workers=6
 *   npm run trailer -- --publish                  # web copy for the homepage
 *
 * The picture is scripts/trailer/trailer.html, a page that draws any moment of
 * itself; Chrome seeks it frame by frame, several tabs at once, each piping
 * JPEGs into its own ffmpeg. The music is synthesised by score.mjs on the same
 * 120 BPM grid the cuts use, and the site's own SFX sprite adds the hits.
 * The numbers are read from the live /api/stats, the Logbook data, git and the
 * route manifest — like the share cards, they are baked in when it renders.
 *
 * Output: knowledge_base/trailer/sanket-tambare-trailer.mp4 (+ a poster PNG).
 * --publish re-encodes that render for the homepage player into
 * public/video/the-trailer.{mp4,jpg,vtt} — 720×1280, grain softened so it
 * fits the budget src/components/Index/trailer.test.js holds it to. Those three
 * files are committed; render first, then publish.
 * Needs playwright-core and ffmpeg-static (npm i --no-save playwright-core
 * ffmpeg-static) and a local Chrome or Edge.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

import { getStatsPayload } from "../lib/statsSource.mjs";
import { colorForTag } from "../../src/lib/generativeArt.js";
import { DEFAULT_ASK_SETTINGS, SEARCH_ONLY_TIER } from "../../src/data/askConfig.js";
import { ROUTE_MANIFEST } from "../../src/data/routeManifest.js";
import SFX_MAP from "../../src/atlas/audio/sfxMap.js";
import { renderScore, toWav } from "./score.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const OUT = path.join(ROOT, "knowledge_base", "trailer");
const SHOTS = path.join(OUT, "shots");
const WORK = path.join(OUT, ".work");
const FILE = "sanket-tambare-trailer";
const FPS = 30;
const DURATION = 90;
// Where the picture is hit (trailer.html IMPACTS): the score booms on these.
const IMPACTS = [6, 10, 68, 76, 84];
// The site's own sprite on the cuts: whooshes on transitions, stamps on numbers.
const SFX = [
  ...[18, 26, 34, 42, 52, 54, 56, 58, 76].map((at) => ({ name: "whoosh", at: at - 0.2 })),
  ...[18.5, 19, 20, 20.5, 21.5, 22, 23, 23.5, 27, 27.75, 28.5, 31].map((at) => ({ name: "stamp", at })),
  ...[48.6, 86.5].map((at) => ({ name: "chime", at })),
];

const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || "").split("=")[1] || null;
const run = (bin, args) => execFileSync(bin, args, { stdio: ["ignore", "ignore", "pipe"] });

async function findFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return "ffmpeg";
  } catch (_) {
    const mod = await import("ffmpeg-static").catch(() => null);
    if (mod?.default) return mod.default;
  }
  throw new Error("ffmpeg not found. Install it on PATH or run: npm i --no-save ffmpeg-static");
}

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => fs.existsSync(p));

// --- what the trailer says ------------------------------------------------------

async function gatherData() {
  const { payload, from } = await getStatsPayload();
  console.info(`Stats from ${from}.`);
  const s = payload.stats;
  const logbook = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "data", "logbook.json"), "utf8")).totals;
  const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  const version = (git(["log", "-50", "--format=%s"]).match(/v\d+\.\d+\.\d+/) || [""])[0];
  const pretty = { gemini: "Gemini", "workers-ai": "Workers AI" };
  const tags = (payload.tags || []).slice().sort((a, b) => b.total - a.total);
  const fileUrl = (p) => pathToFileURL(p).href;

  const missing = ["orbit", "map", "map-night", "ask", "logbook", "treks", "treks-atlas", "sports", "books", "projects",
    "stats", "micro-blog", "tags", "newsletter", "blueprint", "changelog-graph", "mindmap", "home"]
    .filter((nm) => !fs.existsSync(path.join(SHOTS, `${nm}.jpg`)));
  if (missing.length) throw new Error(`Missing shots: ${missing.join(", ")}. Run node scripts/trailer/capture.mjs first.`);

  return {
    km: s.totalKmRun,
    races: s.totalRaces,
    treks: s.totalTreks,
    hardTreks: s.hardTreks,
    trekYears: s.trekYearsActive,
    latestTrek: s.latestTrek,
    books: s.booksCount,
    booksMarathi: s.booksMarathi,
    booksReviewed: s.booksWithReviews,
    booksPerYear: (s.booksPerYearSorted || []).map(([y, n]) => [Number(y), n]),
    projects: s.projectCount,
    pbMarathon: s.pbMarathon,
    pbHalf: s.pbHalf,
    pbTenK: s.pbTenK,
    micro: payload.micro.total,
    microSince: payload.micro.monthCounts[0].key.slice(0, 4),
    essays: logbook.posts,
    essaysMr: logbook.mr,
    words: logbook.words,
    tagCount: tags.length,
    tagNodes: tags.map((t) => ({ display: t.displayName || t.name, color: colorForTag(t.name, t.color), total: t.total })),
    commits: Number(git(["rev-list", "--count", "HEAD"])),
    version,
    routes: ROUTE_MANIFEST.length,
    rungs: [...new Set(DEFAULT_ASK_SETTINGS.tiers.map((t) => pretty[t.provider] || t.provider))].concat(SEARCH_ONLY_TIER.replace("-", " ")),
    // The question capture.mjs asks on /ask, and the forts its answer named.
    question: "Which was the hardest fort trek, and what did he write about it?",
    askSources: ["ढाक बहिरी", "हरिश्चंद्रगड", "कात्रज ते सिंहगड"],
    shots: Object.fromEntries(fs.readdirSync(SHOTS).filter((f) => f.endsWith(".jpg")).map((f) => [f.slice(0, -4), fileUrl(path.join(SHOTS, f))])),
    me: fileUrl(path.join(ROOT, "public", "images", "me.jpg")),
    logo: fileUrl(path.join(ROOT, "public", "images", "logo.png")),
    sign: fileUrl(path.join(ROOT, "public", "images", "brand", "white_sign.png")),
  };
}

// --- picture ----------------------------------------------------------------------

async function openPage(browser, dataFile) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const url = `${pathToFileURL(path.join(HERE, "trailer.html")).href}?data=${encodeURIComponent(pathToFileURL(dataFile).href)}`;
  await page.goto(url);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error(`trailer.html: ${err}`);
  return page;
}

async function frameAt(page, t, type = "jpeg") {
  await page.evaluate((v) => window.renderAt(v), t);
  return page.screenshot(type === "jpeg" ? { type, quality: 94 } : { type });
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

// --- sound -------------------------------------------------------------------------

function mixAudio(ffmpeg, video, out, duration) {
  const score = path.join(WORK, "score.wav");
  fs.writeFileSync(score, toWav(renderScore(duration, IMPACTS)));
  const sprite = path.join(ROOT, "public", "audio", "sfx.m4a");
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
      graph.push(`[${nm}${j}]adelay=${Math.round(e.at * 1000)}:all=1,volume=${nm === "whoosh" ? 0.9 : 0.6}[${nm}e${j}]`);
      mixed.push(`[${nm}e${j}]`);
    });
  });
  // Feeds play loud: -14 LUFS, the level Reels and Shorts normalise to.
  graph.push(`${mixed.join("")}amix=inputs=${mixed.length}:normalize=0:duration=first,afade=t=out:st=${duration - 1.5}:d=1.5,loudnorm=I=-14:TP=-1:LRA=9,aresample=48000[aout]`);
  run(ffmpeg, [
    "-y", "-i", video, "-i", score, ...files.flatMap((f) => ["-i", f]),
    "-filter_complex", graph.join(";"), "-map", "0:v", "-map", "[aout]",
    // Grain makes every frame unique; capped so the file uploads anywhere (~60 MB).
    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-maxrate", "5M", "-bufsize", "10M", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-t", String(duration), "-movflags", "+faststart", out,
  ]);
}

// --- the homepage copy -----------------------------------------------------------

// The trailer has no voice; its captions are the words on screen, per scene.
const captions = (d) => [
  [0, 6, `${d.km} kilometres run. ${d.treks} forts climbed. ${d.books} books read. ${fmtIN(d.micro)} short posts. One person. One website.`],
  [6, 10, "Sanket Tambare. The Digital Hub — a life, archived in a database."],
  [10, 18, "Chapter 1: enter the Wanderer's Atlas. Six regions, one world, day and night."],
  [18, 26, `Chapter 2: life in numbers — ${d.races} races, ${d.essays} essays, ${d.projects} projects, ${d.tagCount} tags.`],
  [26, 30, `Run. Marathon best ${d.pbMarathon ? d.pbMarathon.time : ""}.`],
  [30, 34, `Climb. ${d.treks} forts, latest ${d.latestTrek}.`],
  [34, 38, `Read. वाचा. ${d.books} books, ${d.booksMarathi} in Marathi.`],
  [38, 42, `Write. The Wanderer's Logbook: ${fmtIN(d.words)} words, read as data.`],
  [42, 52, "Ask it anything — answers in English and मराठी, with the pages they came from."],
  [52, 60, `The Workshop: projects, metrics, the Blueprint, ${fmtIN(d.commits)} commits.`],
  [60, 68, `${d.tagCount} tags. One web. And once a month… a letter.`],
  [68, 76, "Every page, a place. Classic or Atlas. Light or dark. English or मराठी. Always live."],
  [76, 84, "This is not a portfolio. It's a life, archived."],
  [84, 90, "sankettambare.in — Enter the World."],
];
const fmtIN = (n) => Number(n).toLocaleString("en-IN");
const stamp = (s) => `00:${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}.000`;

function publishWeb(ffmpeg, data) {
  const src = path.join(OUT, `${FILE}.mp4`);
  if (!fs.existsSync(src)) throw new Error(`${path.relative(ROOT, src)} is missing: run npm run trailer first`);
  const dir = path.join(ROOT, "public", "video");
  run(ffmpeg, [
    "-y", "-i", src, "-vf", "scale=720:1280:flags=lanczos,hqdn3d=3:3:4:4",
    "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-maxrate", "750k", "-bufsize", "1500k", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", path.join(dir, "the-trailer.mp4"),
  ]);
  run(ffmpeg, ["-y", "-ss", "7.6", "-i", src, "-frames:v", "1", "-vf", "scale=720:1280", "-q:v", "4", path.join(dir, "the-trailer.jpg")]);
  const cues = captions(data).map(([a, b, txt]) => `${stamp(a)} --> ${stamp(b)}\n${txt}\n`);
  fs.writeFileSync(path.join(dir, "the-trailer.vtt"), `WEBVTT\n\n${cues.join("\n")}`);
  const kb = Math.round(fs.statSync(path.join(dir, "the-trailer.mp4")).size / 1024);
  console.info(`Published public/video/the-trailer.{mp4,jpg,vtt}  (${kb.toLocaleString("en-IN")} KB video)`);
}

// --- main --------------------------------------------------------------------------

async function main() {
  if (!CHROME) throw new Error("No Chrome or Edge found.");
  fs.mkdirSync(WORK, { recursive: true });
  const data = await gatherData();
  const dataFile = path.join(WORK, "data.js");
  fs.writeFileSync(dataFile, `window.TRAILER = ${JSON.stringify(data)};\n`);
  const ffmpeg = await findFfmpeg();
  if (process.argv.includes("--publish")) {
    publishWeb(ffmpeg, data);
    return;
  }
  const browser = await chromium.launch({ executablePath: CHROME });

  try {
    const frames = (arg("frame") || "").split(",").filter(Boolean).map(Number);
    if (frames.length) {
      const page = await openPage(browser, dataFile);
      for (const t of frames) { // eslint-disable-line no-restricted-syntax
        // eslint-disable-next-line no-await-in-loop
        fs.writeFileSync(path.join(OUT, `frame-${t}.png`), await frameAt(page, t, "png"));
      }
      console.info(`Wrote ${frames.length} frame(s) to ${path.relative(ROOT, OUT)}/`);
      return;
    }

    const from = Math.round(Number(arg("from") || 0) * FPS);
    const to = Math.round(Number(arg("to") || DURATION) * FPS);
    const preview = from > 0 || to < DURATION * FPS;
    const workers = Math.max(1, Math.min(Number(arg("workers")) || Math.max(1, os.cpus().length - 2), 8));
    const per = Math.ceil((to - from) / workers);
    const ranges = Array.from({ length: workers }, (_, i) => [from + i * per, Math.min(to, from + (i + 1) * per)]).filter(([a, b]) => b > a);
    console.info(`Rendering ${to - from} frames on ${ranges.length} tabs.`);
    const started = Date.now();
    const segs = await Promise.all(ranges.map(async ([a, b], i) => {
      const page = await openPage(browser, dataFile);
      const file = path.join(WORK, `seg-${i}.mp4`);
      await encodeRange(ffmpeg, page, a, b, file, `tab ${i + 1}`);
      await page.close();
      return file;
    }));
    console.info(`Picture done in ${((Date.now() - started) / 1000).toFixed(0)}s.`);
    const list = path.join(WORK, "segs.txt");
    fs.writeFileSync(list, segs.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n"));
    const video = path.join(WORK, "video.mp4");
    run(ffmpeg, ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", video]);

    if (preview) {
      const out = path.join(OUT, `preview-${from / FPS}-${to / FPS}.mp4`);
      fs.copyFileSync(video, out);
      console.info(`Preview: ${path.relative(ROOT, out)}`);
      return;
    }
    const out = path.join(OUT, `${FILE}.mp4`);
    mixAudio(ffmpeg, video, out, DURATION);
    const page = await openPage(browser, dataFile);
    fs.writeFileSync(path.join(OUT, `${FILE}.png`), await frameAt(page, 7.6, "png"));
    console.info(`${path.relative(ROOT, out)}  ${(fs.statSync(out).size / 1048576).toFixed(1)} MB`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
