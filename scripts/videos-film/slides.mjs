#!/usr/bin/env node
/**
 * The /videos release as six 4:5 slides (1080×1350): the carousel under the
 * video grid on /videos, and a PDF of the same six for a LinkedIn document
 * post.
 *
 *   npm run videos:slides
 *
 * Run it after the film (npm run videos:film): the slides use the film's own
 * frames, pulled from knowledge_base/videos-film/the-videos-story.mp4 at the
 * moments named in FRAMES, and every number is computed from the live videos
 * table when it runs, then baked in. Re-run it with the film after the
 * channel moves.
 *
 * Writes public/video/the-videos-story-slides/01–06.webp (committed;
 * src/components/Videos/story.test.js holds each under 300 KB) and
 * knowledge_base/videos-film/the-videos-story-slides.pdf (not committed).
 * Needs playwright-core, a Chrome or Chromium (CHROME=path) and ffmpeg.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

import { effectiveKind } from "../../src/lib/youtube.js";
import { OUT, liveVideos } from "./capture.mjs";
import { cleanTitle } from "./titles.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const WORK = path.join(OUT, ".work", "slides");
const FILM = path.join(OUT, "the-videos-story.mp4");
const DEST = path.join(ROOT, "public", "video", "the-videos-story-slides");
const COUNT = 6;

// Seconds into the film for each picture; they follow film.html's acts.
const FRAMES = {
  cover: 39, // the gold "Videos." reveal
  ch1: 10.8, // the pin on Pune
  ch2: 15.8, // the VHS rewind
  ch3: 35.4, // the wrapped page
  ch4: 46.5, // the Shorts switch
  ch5: 71.6, // the Shorts checks on the pipeline
  ch6: 87, // the end card
  end: 87,
};

const CHROME = [
  process.env.CHROME,
  "/opt/pw-browsers/chromium",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => p && fs.existsSync(p));

const run = (args, input) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { input, stdio: [input ? "pipe" : "ignore", "ignore", "pipe"] });

async function main() {
  if (!fs.existsSync(FILM)) throw new Error(`${path.relative(ROOT, FILM)} is missing: run npm run videos:film first`);
  if (!CHROME) throw new Error("No Chrome or Chromium found (set CHROME).");
  fs.mkdirSync(path.join(WORK, "frames"), { recursive: true });
  fs.mkdirSync(DEST, { recursive: true });

  const rows = await liveVideos();
  if (!rows.length) throw new Error("No videos in the table: run Sync now at /admin/videos/sync first.");
  const videos = rows.map((r) => ({
    t: cleanTitle(r.title),
    d: r.date,
    v: r.view_count || 0,
    s: effectiveKind(r) === "short" ? 1 : 0,
    len: r.duration_seconds || 0,
    p: r.playlists || [],
  }));

  Object.entries(FRAMES).forEach(([name, t]) => {
    run(["-ss", String(t), "-i", FILM, "-frames:v", "1", "-vf", "scale=480:-2", "-q:v", "3", path.join(WORK, "frames", `${name}.jpg`)]);
  });
  const top = rows.reduce((a, b) => ((b.view_count || 0) > (a.view_count || 0) ? b : a));
  const thumb = path.join(OUT, "thumbs", `${top.youtube_id}.jpg`);
  if (!fs.existsSync(thumb)) throw new Error(`${path.relative(ROOT, thumb)} is missing: run node scripts/videos-film/capture.mjs thumbs`);
  fs.copyFileSync(thumb, path.join(WORK, "frames", "top-short.jpg"));

  const page = path.join(WORK, "slides.html");
  const data = JSON.stringify({ videos }).replace(/</g, "\\u003c");
  fs.writeFileSync(page, fs.readFileSync(path.join(HERE, "slides.html"), "utf8").replace("__DATA__", data));

  const browser = await chromium.launch({ executablePath: CHROME });
  try {
    const tab = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
    const errors = [];
    tab.on("pageerror", (e) => errors.push(e.message));
    await tab.goto(pathToFileURL(page).href, { waitUntil: "networkidle" });
    await tab.evaluate(() => document.fonts.ready);
    await tab.waitForTimeout(500);
    if (errors.length) throw new Error(`slides.html: ${errors.join("; ")}`);
    const over = await tab.evaluate(() => [...document.querySelectorAll(".slide .inner")]
      .map((el, i) => (el.scrollHeight > el.clientHeight ? i + 1 : null)).filter(Boolean));
    if (over.length) throw new Error(`Slide(s) ${over.join(", ")} overflow 1350 px: shorten their text`);

    const slides = tab.locator(".slide");
    for (let i = 0; i < COUNT; i += 1) {
      // eslint-disable-next-line no-await-in-loop -- one slide at a time
      const png = await slides.nth(i).screenshot();
      const file = path.join(DEST, `${String(i + 1).padStart(2, "0")}.webp`);
      // Shot at 2× and scaled down, so type stays crisp at 1080 wide.
      run(["-f", "png_pipe", "-i", "-", "-vf", "scale=1080:1350:flags=lanczos", "-c:v", "libwebp", "-quality", "86", file], png);
      console.info(`  ${path.relative(ROOT, file)}  ${Math.round(fs.statSync(file).size / 1024)} KB`);
    }
    const pdf = path.join(OUT, "the-videos-story-slides.pdf");
    await tab.emulateMedia({ media: "print" });
    await tab.pdf({ path: pdf, width: "1080px", height: "1350px", printBackground: true });
    console.info(`  ${path.relative(ROOT, pdf)}  (for a LinkedIn document post)`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
