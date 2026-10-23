#!/usr/bin/env node
/**
 * Renders the /videos film: 90 seconds, vertical (1080×1920, 30 fps, H.264 +
 * AAC), narrated, with its own score.
 *
 *   node scripts/videos-film/capture.mjs            # once: the footage
 *   npm run videos:film                             # the film
 *   npm run videos:film -- --frame=12.5,40          # single frames, for review
 *   npm run videos:film -- --from=34 --to=42        # one stretch, silent preview
 *   npm run videos:film -- --workers=3 --voice=piper
 *   npm run videos:film -- --remix                  # new sound on the last picture
 *   npm run videos:film -- --publish                # web copy for /videos
 *
 * The picture is scripts/videos-film/film.html, a page that draws any moment
 * of itself; Chrome seeks it frame by frame, several tabs at once, each piping
 * JPEGs into its own ffmpeg. The music is score.mjs on the same 120 BPM grid,
 * the site's SFX sprite adds the hits, and the narrator is the Blueprint
 * film's (scripts/blueprint-film/voice.mjs: Workers AI's Aura 2 when
 * CF_ACCOUNT_ID / CF_API_TOKEN are set, else Piper). The music ducks under it.
 *
 * Every number is read when it renders — the live videos table, /api/stats,
 * the Logbook data — and baked in, like the share cards: re-render after the
 * channel moves.
 *
 * Output: knowledge_base/videos-film/the-videos-story.mp4 (+ a poster PNG and
 * the narration as .srt/.vtt). --publish re-encodes it for the /videos player
 * into public/video/the-videos-story.{mp4,jpg,vtt}, which are committed;
 * src/components/Videos/story.test.js holds them to a size budget.
 * Needs playwright-core and a Chrome or Chromium (CHROME=path), and ffmpeg.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { createServer } from "vite";

import { getStatsPayload } from "../lib/statsSource.mjs";
import SFX_MAP from "../../src/atlas/audio/sfxMap.js";
import {
  pickVoice, speak, voiceCredit, wavSeconds,
} from "../blueprint-film/voice.mjs";
import {
  TARGET, FIRST, LAST, IMAGERY_CREDIT, GLOBE_CREDIT,
} from "./geo.mjs";
import { OUT, liveVideos } from "./capture.mjs";
import { renderScore, toWav } from "./score.mjs";
import { clip, cleanTitle } from "./titles.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const WORK = path.join(OUT, ".work");
const FILE = "the-videos-story";
const FPS = 30;
const DURATION = 90;
const HOST = "sankettambare.in";
const SPOKEN_HOST = "Sanket Tambare dot in";
const MAX_TEMPO = 1.3;

// Where the picture hits (film.html IMPACTS): the score booms on these.
const IMPACTS = [12.6, 36, 84.6];

const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || "").split("=")[1] || null;
const run = (bin, args) => execFileSync(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
const fileUrl = (p) => pathToFileURL(p).href;

const CHROME = [
  process.env.CHROME,
  "/opt/pw-browsers/chromium",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => p && fs.existsSync(p));

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

// --- words for the narrator -------------------------------------------------------

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function words(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${words(n % 100)}` : ""}`;
  if (n < 1e6) return `${words(Math.floor(n / 1000))} thousand${n % 1000 ? `${n % 1000 < 100 ? " and" : ""} ${words(n % 1000)}` : ""}`;
  return String(n);
}
// A year the way it is said: twenty nineteen, twenty twenty-six.
const year = (y) => `${words(Math.floor(y / 100))} ${y % 100 < 10 ? `oh ${words(y % 100)}` : words(y % 100)}`;
// Big counts rounded the way a person says them.
const roughly = (n) => (n >= 1000 ? words(Math.round(n / 100) * 100) : words(n));

// --- what the film says -----------------------------------------------------------

// What listing one video by hand meant: the columns the sync now writes
// (toVideoRow in src/lib/youtube.js, plus the playlists set_video_playlists()
// files), as the chores a person would do.
const CHORES = ["Copy the link", "Title", "Description", "Date", "Length", "Short or video?", "Views", "Likes",
  "Comments", "Thumbnail", "Playlists", "Keywords"];
// The Data API calls a sync makes (functions/api/youtube-sync.js).
const CALLS = ["channels.list", "playlistItems.list", "videos.list", "playlists.list"];


// The site's own modules (sort labels, the channel, the Short rule), through
// Vite's SSR loader: src/ imports omit file extensions, which Node will not.
async function siteModules() {
  const vite = await createServer({
    root: ROOT,
    logLevel: "error",
    appType: "custom",
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const [filters, youtube] = await Promise.all([
      vite.ssrLoadModule("/src/lib/videoFilters.js"),
      vite.ssrLoadModule("/src/lib/youtube.js"),
    ]);
    return { ...filters, ...youtube };
  } finally {
    await vite.close();
  }
}

async function gatherData() {
  const {
    VIDEO_SORTS, YOUTUBE_CHANNEL, SHORT_MAX_SECONDS, effectiveKind,
  } = await siteModules();
  const { payload, from } = await getStatsPayload();
  console.info(`Stats from ${from}.`);
  const s = payload.stats;
  const logbook = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "data", "logbook.json"), "utf8")).totals;
  const rows = await liveVideos();
  if (!rows.length) throw new Error("No videos in the table: run Sync now at /admin/videos/sync first.");
  const shotsMeta = JSON.parse(fs.readFileSync(path.join(OUT, "shots.json"), "utf8"));
  const missing = ["videos", "shorts", "search-4", "sort-views", "year-2020", "short", "video", "home", "admin-0", "admin-3"]
    .filter((nm) => !fs.existsSync(path.join(OUT, "shots", `${nm}.jpg`)));
  if (missing.length) throw new Error(`Missing shots: ${missing.join(", ")}. Run node scripts/videos-film/capture.mjs first.`);

  const videos = rows.map((r) => ({
    id: r.id,
    youtubeId: r.youtube_id,
    title: r.title,
    kind: effectiveKind(r),
    views: r.view_count || 0,
    likes: r.like_count || 0,
    duration: r.duration_seconds || 0,
    year: r.date ? Number(r.date.slice(0, 4)) : null,
    playlists: r.playlists || [],
  }));
  const top = videos.reduce((a, b) => (b.views > a.views ? b : a));
  const playlists = [...new Set(videos.flatMap((v) => v.playlists))];
  const years = [...new Set(videos.map((v) => v.year).filter(Boolean))].sort();
  // The scrapbook: one stop per year, its most-watched first.
  const stops = years.map((y) => {
    const mine = videos.filter((v) => v.year === y).sort((a, b) => b.views - a.views);
    return {
      year: y,
      ids: mine.slice(0, 3).map((v) => v.youtubeId),
      more: Math.max(0, mine.length - 3),
      label: mine.length === 1 ? clip(cleanTitle(mine[0].title), 34) : `${mine.length} uploads`,
      top: mine.includes(top),
    };
  });
  const byYear = years.map((y) => [y, videos.filter((v) => v.year === y).length]).sort((a, b) => b[1] - a[1]);
  const biggest = playlists.map((p) => [p, videos.filter((v) => v.playlists.includes(p)).length]).sort((a, b) => b[1] - a[1])[0];
  const short = videos.find((v) => v.id === shotsMeta.short.id) || top;
  const pages = Math.ceil(videos.length / 25);

  const stats = {
    count: videos.length,
    shorts: videos.filter((v) => v.kind === "short").length,
    longs: videos.filter((v) => v.kind !== "short").length,
    views: videos.reduce((n, v) => n + v.views, 0),
    likes: videos.reduce((n, v) => n + v.likes, 0),
    minutes: Math.round(videos.reduce((n, v) => n + v.duration, 0) / 60),
    since: years[0],
    playlists: playlists.length,
    // Every upload short enough to be a Short is checked at /shorts/<id>.
    probed: videos.filter((v) => v.duration <= SHORT_MAX_SECONDS).length,
    // channels.list once, playlistItems + videos per page of 25, then
    // playlists.list and one playlistItems.list per playlist.
    quota: 1 + 2 * pages + 1 + playlists.length,
  };
  const shots = Object.fromEntries(Object.entries(shotsMeta).filter(([k]) => !k.startsWith("$"))
    .map(([k, v]) => [k, { ...v, url: fileUrl(path.join(OUT, "shots", `${k}.jpg`)) }]));

  return {
    data: {
      host: HOST,
      channel: YOUTUBE_CHANNEL,
      geo: {
        lat: TARGET.lat, lon: TARGET.lon, name: TARGET.name, place: TARGET.place, first: FIRST, last: LAST,
        tiles: fileUrl(path.join(OUT, "tiles")),
        // Inline: film.html reads the globe's pixels, which a file:// image
        // would taint.
        globe: `data:image/jpeg;base64,${fs.readFileSync(path.join(OUT, "globe.jpg")).toString("base64")}`,
      },
      shots,
      taps: shotsMeta.$phone.taps,
      thumbs: Object.fromEntries(videos.map((v) => [v.youtubeId, fileUrl(path.join(OUT, "thumbs", `${v.youtubeId}.jpg`))])),
      byId: Object.fromEntries(videos.map((v) => [v.youtubeId, v])),
      videos,
      stops,
      top: { title: cleanTitle(top.title), views: top.views, youtubeId: top.youtubeId },
      byShortId: short.youtubeId,
      byShortDur: short.duration,
      stats,
      siteCounts: [
        ["races run", s.totalRaces], ["forts climbed", s.totalTreks], ["books read", s.booksCount],
        ["essays", logbook.posts], ["short posts", payload.micro.total],
      ].filter(([, n]) => n != null),
      chores: CHORES,
      calls: CALLS,
      sorts: VIDEO_SORTS.map((x) => x.label),
      filterChips: [`Year · ${byYear[0][0]}`, biggest ? `Playlist · ${cleanTitle(biggest[0])}` : "Playlists", "Tags", `Search · “${shotsMeta["search-4"].text}”`],
      sign: fileUrl(path.join(ROOT, "public", "images", "brand", "white_sign.png")),
      credits: { globe: GLOBE_CREDIT, imagery: IMAGERY_CREDIT, line: "" },
    },
    narration: script({ stats, top }),
  };
}

// The narration, timed to film.html. A line gets the time until the next one
// starts and is sped up (at most MAX_TEMPO) if it overruns.
function script({ stats, top }) {
  const Since = year(stats.since);
  return [
    [0.9, "Every story starts somewhere. Let's find this one."],
    [6.3, "India."],
    [8.1, "Maharashtra."],
    [10.1, "Pune."],
    [11.2, "Home to one website."],
    [13.4, `${SPOKEN_HOST}.`],
    [16.9, `Since ${Since}, there's been a YouTube channel here too.`],
    [19.9, `Talks on blogging, and a promo watched over ${words(Math.floor(top.views / 1000))} thousand times.`],
    [23.9, "A trail run up Sinhagad."],
    [25.6, "And this year, live readings of the essays."],
    [28.2, "Every race, fort and book, counted. No videos."],
    [31.5, `By hand: ${words(CHORES.length)} fields, ${words(stats.count)} times over.`],
    [34.3, "So, let's cut the ribbon."],
    [36.9, "Introducing: Videos."],
    [38.4, `Live now, on ${SPOKEN_HOST}.`],
    [40.6, "Every upload on the channel, long videos and Shorts, on one page."],
    [45.2, "One tap splits the Shorts from the rest."],
    [49.7, "Search it. Filter by year, tag or playlist."],
    [54.2, "Or sort by what got watched."],
    [56.2, `${roughly(stats.views)} views, ${words(stats.minutes)} minutes of video.`],
    [59.7, "And it plays right here. Nothing loads from YouTube until you press play."],
    [64.1, "Adding them? One button."],
    [66.2, "Sync now asks YouTube's Data API for every public upload,"],
    [70.4, "checks which ones are Shorts,"],
    [72.2, "and a Cloudflare Worker writes them into the site's database."],
    [76.3, `Before: ${words(CHORES.length * stats.count)} copy-pastes.`],
    [78.7, "Now: one click."],
    [80.7, "Made in Pune."],
    [82.3, "For every upload still to come."],
    [85.0, `${SPOKEN_HOST}, slash videos.`],
    [87.7, "See you there."],
  ].map(([at, text]) => ({ at, text: text.charAt(0).toUpperCase() + text.slice(1) }));
}

// --- sound -------------------------------------------------------------------------

// The site's own sprite on the cuts: whooshes on transitions, stamps on
// counts and badges, chimes on the pin, the live chip and the button.
function sfxCues(data) {
  const per = (27.6 - 17.0) / data.stops.length;
  const stopAt = (i) => 17.0 + i * per;
  const topStop = data.stops.findIndex((x) => x.top);
  return [
    ...[12.5, 15.1, 16.3, 28.0, 33.8, 36.0, 39.9, 44.8, 49.4, 53.9, 58.9, 62.9, 67.5, 76.0, 79.9]
      .map((at) => ({ name: "whoosh", at: at - 0.15 })),
    ...data.stops.map((_, i) => ({ name: "whoosh", at: stopAt(i) - 0.1, gain: 0.5 })),
    ...data.siteCounts.map((_, i) => ({ name: "stamp", at: 28.7 + i * 0.22, gain: 0.5 })),
    ...[32.3, 37.4, 66.35, ...(topStop >= 0 ? [stopAt(topStop) - 0.15 + 0.9] : []), ...[0, 1, 2, 3].map((i) => 56.4 + i * 0.3)]
      .map((at) => ({ name: "stamp", at })),
    ...[10.5, 37.1, 86.2].map((at) => ({ name: "chime", at })),
  ];
}

// Keystrokes: the address bar, the form typed out, the search, the address.
function typing(data) {
  const out = [];
  for (let i = 0; i < HOST.length; i += 1) out.push(13.2 + i / 18);
  for (let i = 0; i < 26; i += 2) out.push(28.1 + i * 0.035);
  data.chores.forEach((_, i) => out.push(30.9 + i * 0.1));
  for (let i = 0; i < data.shots["search-4"].text.length; i += 1) out.push(50.15 + i * 0.32);
  for (let i = 0; i < `${HOST}/videos`.length; i += 1) out.push(84.9 + i / 16);
  return out;
}

async function narrationTrack(ffmpeg, voice, lines) {
  const dir = path.join(WORK, "voice");
  for (const line of lines) { // eslint-disable-line no-restricted-syntax
    // eslint-disable-next-line no-await-in-loop -- one take at a time
    line.file = await speak(voice, line.text, { ffmpeg, dir });
    line.spoken = wavSeconds(line.file);
  }
  let squeezed = 0;
  lines.forEach((line, i) => {
    const next = lines[i + 1] ? lines[i + 1].at : DURATION - 0.5;
    const room = next - line.at - 0.12;
    line.tempo = Math.min(MAX_TEMPO, Math.max(1, line.spoken / room));
    line.end = line.at + line.spoken / line.tempo;
    if (line.tempo > 1) squeezed += 1;
    if (line.spoken / line.tempo > room + 0.05) {
      console.warn(`  ! narration overruns by ${(line.spoken / line.tempo - room).toFixed(1)}s at ${line.at}s: "${line.text}"`);
    }
  });
  const graph = lines.map((l, i) => `[${i}:a]atempo=${l.tempo.toFixed(3)},adelay=${Math.round(l.at * 1000)}:all=1[n${i}]`);
  graph.push(`${lines.map((_, i) => `[n${i}]`).join("")}amix=inputs=${lines.length}:normalize=0,apad,atrim=0:${DURATION}[out]`);
  const file = path.join(WORK, "narration.wav");
  run(ffmpeg, ["-y", ...lines.flatMap((l) => ["-i", l.file]), "-filter_complex", graph.join(";"), "-map", "[out]", "-ar", "48000", file]);
  const count = lines.reduce((n, l) => n + l.text.split(/\s+/).length, 0);
  console.info(`Narration: ${lines.length} lines, ${count} words, ${squeezed} sped up to fit — ${voiceCredit(voice)}.`);
  return { file, cues: lines.map((l) => ({ start: l.at, end: l.end, text: l.text })) };
}

function mixAudio(ffmpeg, video, out, { data, narration }) {
  const score = path.join(WORK, "score.wav");
  fs.writeFileSync(score, toWav(renderScore(DURATION, { impacts: IMPACTS, ticks: typing(data) })));
  const sfx = sfxCues(data);
  const sprite = path.join(ROOT, "public", "audio", "sfx.m4a");
  const names = [...new Set(sfx.map((e) => e.name))];
  const files = names.map((nm) => {
    const [offset, len] = SFX_MAP[nm];
    const f = path.join(WORK, `sfx-${nm}.wav`);
    run(ffmpeg, ["-y", "-ss", String(offset), "-t", String(len), "-i", sprite, "-ac", "2", "-ar", "48000", f]);
    return f;
  });
  const graph = ["[1:a]aresample=48000[score]"];
  const mixed = ["[score]"];
  names.forEach((nm, k) => {
    const mine = sfx.filter((e) => e.name === nm);
    graph.push(`[${k + 2}:a]asplit=${mine.length}${mine.map((_, j) => `[${nm}${j}]`).join("")}`);
    mine.forEach((e, j) => {
      const base = nm === "whoosh" ? 0.8 : 0.55;
      graph.push(`[${nm}${j}]adelay=${Math.round(e.at * 1000)}:all=1,volume=${(base * (e.gain ?? 1)).toFixed(2)}[${nm}e${j}]`);
      mixed.push(`[${nm}e${j}]`);
    });
  });
  // The bed ducks under the narrator; feeds play loud, so -14 LUFS overall.
  graph.push(`${mixed.join("")}amix=inputs=${mixed.length}:normalize=0:duration=first,aformat=channel_layouts=stereo[bed]`);
  graph.push(`[${names.length + 2}:a]aresample=48000,aformat=channel_layouts=stereo,volume=1.6,asplit=2[voice][key]`);
  graph.push("[bed][key]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400[ducked]");
  graph.push(`[ducked][voice]amix=inputs=2:normalize=0:duration=first,afade=t=out:st=${DURATION - 1.2}:d=1.2,loudnorm=I=-14:TP=-1:LRA=9,aresample=48000[aout]`);
  run(ffmpeg, [
    "-y", "-i", video, "-i", score, ...files.flatMap((f) => ["-i", f]), "-i", narration,
    "-filter_complex", graph.join(";"), "-map", "0:v", "-map", "[aout]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-maxrate", "6M", "-bufsize", "12M", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-t", String(DURATION), "-movflags", "+faststart", out,
  ]);
}

// --- picture ----------------------------------------------------------------------

async function openPage(browser, dataFile) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.warn(`  page error: ${e.message}`));
  const url = `${pathToFileURL(path.join(HERE, "film.html")).href}?data=${encodeURIComponent(pathToFileURL(dataFile).href)}`;
  await page.goto(url);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 120000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error(`film.html: ${err}`);
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
      "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(FPS), file,
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

// --- the /videos copy -------------------------------------------------------------

const stamp = (s) => {
  const ms = Math.round(s * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
};
const toVtt = (cues) => `WEBVTT\n\n${cues.map((c) => `${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join("\n")}`;
const toSrt = (cues) => cues.map((c, i) => `${i + 1}\n${stamp(c.start).replace(".", ",")} --> ${stamp(c.end).replace(".", ",")}\n${c.text}\n`).join("\n");

function publishWeb(ffmpeg) {
  const src = path.join(OUT, `${FILE}.mp4`);
  const vtt = path.join(OUT, `${FILE}.vtt`);
  if (!fs.existsSync(src) || !fs.existsSync(vtt)) throw new Error(`${path.relative(ROOT, src)} is missing: run npm run videos:film first`);
  const dir = path.join(ROOT, "public", "video");
  run(ffmpeg, [
    "-y", "-i", src, "-vf", "scale=720:1280:flags=lanczos,hqdn3d=2:2:3:3",
    "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-maxrate", "850k", "-bufsize", "1700k", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", path.join(dir, `${FILE}.mp4`),
  ]);
  run(ffmpeg, ["-y", "-ss", "38.2", "-i", src, "-frames:v", "1", "-vf", "scale=720:1280", "-q:v", "4", path.join(dir, `${FILE}.jpg`)]);
  fs.copyFileSync(vtt, path.join(dir, `${FILE}.vtt`));
  const kb = Math.round(fs.statSync(path.join(dir, `${FILE}.mp4`)).size / 1024);
  console.info(`Published public/video/${FILE}.{mp4,jpg,vtt}  (${kb.toLocaleString("en-IN")} KB video)`);
}

// --- main --------------------------------------------------------------------------

// Sound onto the picture, the captions, and a poster.
async function finish(ffmpeg, browser, {
  data, narration, voice, video, dataFile,
}) {
  const voiced = await narrationTrack(ffmpeg, voice, narration);
  const out = path.join(OUT, `${FILE}.mp4`);
  mixAudio(ffmpeg, video, out, { data, narration: voiced.file });
  fs.writeFileSync(path.join(OUT, `${FILE}.vtt`), toVtt(voiced.cues));
  fs.writeFileSync(path.join(OUT, `${FILE}.srt`), toSrt(voiced.cues));
  const page = await openPage(browser, dataFile);
  fs.writeFileSync(path.join(OUT, `${FILE}.png`), await frameAt(page, 38.2, "png"));
  console.info(`${path.relative(ROOT, out)}  ${(fs.statSync(out).size / 1048576).toFixed(1)} MB`);
}

async function main() {
  fs.mkdirSync(WORK, { recursive: true });
  const ffmpeg = await findFfmpeg();
  if (process.argv.includes("--publish")) {
    publishWeb(ffmpeg);
    return;
  }
  if (!CHROME) throw new Error("No Chrome or Chromium found (set CHROME).");
  const { data, narration } = await gatherData();
  const frames = (arg("frame") || "").split(",").filter(Boolean).map(Number);
  const from = Math.round(Number(arg("from") || 0) * FPS);
  const to = Math.round(Number(arg("to") || DURATION) * FPS);
  const preview = frames.length > 0 || from > 0 || to < DURATION * FPS;
  const voice = preview ? null : pickVoice(arg("voice"));
  data.credits.line = [IMAGERY_CREDIT, GLOBE_CREDIT, voice ? `Voice: ${voiceCredit(voice)}` : null, "Music synthesised for this film"].filter(Boolean).join(" · ");
  const dataFile = path.join(WORK, "data.js");
  fs.writeFileSync(dataFile, `window.FILM = ${JSON.stringify(data)};\n`);
  const browser = await chromium.launch({ executablePath: CHROME });

  try {
    if (frames.length) {
      const page = await openPage(browser, dataFile);
      for (const t of frames) { // eslint-disable-line no-restricted-syntax
        // eslint-disable-next-line no-await-in-loop
        fs.writeFileSync(path.join(OUT, `frame-${t}.png`), await frameAt(page, t, "png"));
      }
      console.info(`Wrote ${frames.length} frame(s) to ${path.relative(ROOT, OUT)}/`);
      return;
    }

    const video = path.join(WORK, "video.mp4");
    if (process.argv.includes("--remix")) {
      // The narration or the score changed, the picture did not.
      if (!fs.existsSync(video)) throw new Error("--remix needs a rendered picture: run npm run videos:film first");
      await finish(ffmpeg, browser, { data, narration, voice, video, dataFile });
      return;
    }
    const workers = Math.max(1, Math.min(Number(arg("workers")) || Math.max(1, os.cpus().length - 1), 8));
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
    run(ffmpeg, ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", video]);

    if (preview) {
      const out = path.join(OUT, `preview-${from / FPS}-${to / FPS}.mp4`);
      fs.copyFileSync(video, out);
      console.info(`Preview: ${path.relative(ROOT, out)}`);
      return;
    }
    await finish(ffmpeg, browser, { data, narration, voice, video, dataFile });
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
