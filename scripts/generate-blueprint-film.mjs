#!/usr/bin/env node
/**
 * Renders "The Blueprint" (/blueprint) as illustrated video: one film, and one
 * short episode per sheet for posting as a series.
 *
 *   npm run blueprint:film                    # the film, six episodes, posters
 *   npm run blueprint:film -- --stills        # the posters only, for review
 *   npm run blueprint:film -- --only=loom     # one episode (matches its file name)
 *   npm run blueprint:film -- --no-audio      # silent
 *   npm run blueprint:film -- --keep          # keep the encoded segments…
 *   npm run blueprint:film -- --reuse         # …and splice / re-mix from them
 *   npm run blueprint:film -- --layout=vertical  # one shape (default: both)
 *   npm run blueprint:film -- --publish       # also refresh public/video/ for /blueprint
 *   npm run blueprint:film -- --describe      # also an audio-described cut of the film
 *   npm run blueprint:film -- --describe-only # just that, from the film already rendered
 *
 * Output goes to knowledge_base/blueprint-film/ (gitignored), every cut in two
 * shapes: square 1080x1080, the one shape every feed shows whole, and vertical
 * 1080x1920 (`-vertical`) for Reels, Shorts and Stories. H.264 + AAC at 30 fps,
 * a poster PNG per cut and shape, and an .srt of the captions per cut (the film
 * gets a .vtt too). Segments render in parallel worker processes.
 *
 * --publish re-encodes the square film for the web into public/video/ — the
 * MP4, a JPEG poster, the WebVTT captions and the chapter list the page's
 * player reads. Those four files are committed; nothing else here is.
 *
 * --describe adds an audio description to the full film: a narrator, timed to
 * the drawing, says what is on screen and what the burned-in captions say, so
 * the film can be followed without seeing it (WCAG 1.2.5). The lines live with
 * the captions in scripts/blueprint-film/film.mjs; the voice is picked by
 * scripts/blueprint-film/voice.mjs (Workers AI if CF keys are set, else Piper;
 * --voice=aura|piper to force one). The music ducks under the voice. It writes
 * the-blueprint-described[-vertical].mp4 and the narration as .srt/.vtt, and
 * with --publish the page plays the described cut.
 *
 * Every frame is an SVG built from scripts/blueprint-film/ and rasterised with
 * resvg, the renderer the share cards already use; there is no browser and no
 * screen recording. What the drawings show is read, not typed: the rooms and
 * floors from src/components/Blueprint/features.js, the circuit's log from the
 * page's own circuitSequence(), the shell rules from shellLadder.js, the cards
 * from public/og/, and the counts from the live /api/stats snapshot. So the
 * film goes stale the way the cards do — re-run it after content moves.
 *
 * Sound is the site's own: the Workshop's ambient loop (/blueprint lives in that
 * region) and the stamp / chime / whoosh sprite from public/audio/.
 *
 * Requires ffmpeg, on PATH or from ffmpeg-static (npm i --no-save ffmpeg-static),
 * the same as generate-atlas-audio.mjs.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { initWasm, Resvg } from "@resvg/resvg-wasm";

import { FONT_FACES, FONT_DIR } from "../src/lib/og/fonts.js";
import SFX_MAP from "../src/atlas/audio/sfxMap.js";
import { getStatsPayload } from "./lib/statsSource.mjs";
import { woffToSfnt } from "./blueprint-film/woff.mjs";
import { buildFilm } from "./blueprint-film/film.mjs";
import {
  pickVoice, speak, voiceCredit, wavSeconds,
} from "./blueprint-film/voice.mjs";
import { FPS, LAYOUTS, W } from "./blueprint-film/draw.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "knowledge_base", "blueprint-film");
const WORK = path.join(OUT, ".work");

const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || "").split("=")[1] || null;
const only = arg("only");
const stillsOnly = process.argv.includes("--stills");
const silent = process.argv.includes("--no-audio");
// --reuse keeps segments already encoded in a .work left by --keep, so a
// change to the sound or the splicing does not re-render every frame.
const reuse = process.argv.includes("--reuse");
// --frame=<segment>@<seconds>[@layout][,…] writes single frames, for checking a moment.
const frameArgs = (arg("frame") || "").split(",").filter(Boolean);
const layouts = (arg("layout") || "square,vertical").split(",").filter((l) => LAYOUTS[l]);
const publish = process.argv.includes("--publish");
// Internal: a worker process renders the jobs it is handed and exits.
const isWorker = process.argv.includes("--worker");
const PUBLIC_VIDEO = path.join(ROOT, "public", "video");
const describeOnly = process.argv.includes("--describe-only");
const describe = describeOnly || process.argv.includes("--describe");
const FILM = "the-blueprint";
// Narration fits its gap by speeding up, never by more than this: past it a
// line is rewritten, not squeezed.
const MAX_TEMPO = 1.35;

const AMBIENT = path.join(ROOT, "public", "audio", "loop-creator.m4a");
const SPRITE = path.join(ROOT, "public", "audio", "sfx.m4a");
const AMBIENT_GAIN = 0.55;
const SFX_GAIN = 0.7;

// --- tools ----------------------------------------------------------------------

async function findFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return "ffmpeg";
  } catch (_) {
    try {
      const mod = await import("ffmpeg-static");
      if (mod.default) return mod.default;
    } catch (__) { /* fall through */ }
  }
  throw new Error("ffmpeg not found. Install it on PATH or run: npm i --no-save ffmpeg-static");
}

const run = (bin, args) => execFileSync(bin, args, { stdio: ["ignore", "ignore", "pipe"] });

// CF_ACCOUNT_ID / CF_API_TOKEN for the Workers AI narrator, as the other
// Workers AI scripts read them.
function loadEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  });
}

// The Supabase url and publishable key, from wrangler.toml when the shell has
// no .env — both are public, baked into the browser bundle anyway.
function publicSupabaseEnv() {
  if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY) return;
  try {
    const toml = fs.readFileSync(path.join(ROOT, "wrangler.toml"), "utf8");
    const pick = (name) => (toml.match(new RegExp(`^${name}\\s*=\\s*"([^"]+)"`, "m")) || [])[1];
    process.env.VITE_SUPABASE_URL ||= pick("VITE_SUPABASE_URL");
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||= pick("VITE_SUPABASE_PUBLISHABLE_KEY");
  } catch (_) { /* the revision line is simply left out */ }
}

// --- the data the drawings show -------------------------------------------------

// The page's modules are browser code (JSX in .js, extensionless imports), so
// they are loaded through Vite's SSR loader rather than imported directly.
async function loadSource({ fetchMajors = true } = {}) {
  publicSupabaseEnv();
  const vite = await createServer({
    root: ROOT,
    logLevel: "error",
    appType: "custom",
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const load = (p) => vite.ssrLoadModule(p);
    const [features, ladder, circuitMod, askConfig, pageMeta, og, art, flags, tagsApi, changelog] = await Promise.all([
      load("/src/components/Blueprint/features.js"),
      load("/src/components/Blueprint/shellLadder.js"),
      load("/src/components/Blueprint/AskCircuit.js"),
      load("/src/data/askConfig.js"),
      load("/src/data/pageMeta.js"),
      load("/src/lib/og/model.js"),
      load("/src/lib/generativeArt.js"),
      load("/src/config/featureFlags.js"),
      load("/src/lib/api/tags.js"),
      load("/src/lib/api/changelog.js"),
    ]);
    let majors = null;
    if (fetchMajors) {
      try {
        majors = await changelog.getChangelogMajors();
      } catch (err) {
        console.warn(`  ! changelog unavailable (${err.message}); the revision line is left out`);
      }
    }
    return {
      features, ladder, circuitMod, askConfig, pageMeta, og, art, flags, tagsApi, majors,
    };
  } finally {
    await vite.close();
  }
}

function cardDataUri(slug) {
  const file = path.join(ROOT, "public", "og", `${slug}.png`);
  return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
}

// `snapshot` ({ payload, majors }) is what the main process fetched; workers are
// handed it so every segment of one run draws the same numbers.
async function gatherData(snapshot = null) {
  const src = await loadSource({ fetchMajors: !snapshot });
  const { payload, from } = snapshot ? { payload: snapshot.payload, from: null } : await getStatsPayload();
  if (from) console.info(`Stats from ${from}.`);
  const majors = snapshot ? snapshot.majors : src.majors;

  const ctx = {
    stats: payload.stats, micro: payload.micro, tags: payload.tags, releases: null,
  };
  const releases = majors ? majors.reduce((s, m) => s + (m.count || 0), 0) : null;
  ctx.releases = releases;

  const {
    DEFAULT_ASK_SETTINGS, DEFAULT_QUESTION_POOL, ENTITY_PLURALS, SEARCH_ONLY_TIER,
  } = src.askConfig;
  const { PAGE_META, SITE_URL, composeTitle } = src.pageMeta;
  const question = (DEFAULT_QUESTION_POOL.find((q) => q.c === "treks") || DEFAULT_QUESTION_POOL[0]).q;
  const down = [0];

  const shares = [
    { path: "/blueprint", mode: "bot" }, { path: "/books", mode: "bot" }, { path: "/treks", mode: "reader" },
  ].filter((s) => PAGE_META[s.path]).map((s) => {
    const meta = PAGE_META[s.path];
    const title = composeTitle(meta.title);
    return {
      ...s,
      title,
      description: meta.description,
      slug: meta.ogSlug,
      card: cardDataUri(meta.ogSlug),
      tags: [
        `<title>${title}</title>`,
        `<meta property="og:image" content="${SITE_URL}/og/${meta.ogSlug}.png">`,
        `<meta property="og:title" content="${title}">`,
        `<meta property="og:description" content="${meta.description}">`,
      ],
    };
  });

  const data = {
    features: src.features.FEATURES,
    layers: src.features.LAYERS,
    collections: src.features.COLLECTIONS.map((c) => ({ ...c, count: src.features.fmt(c.count(ctx)) })),
    areaOf: (f) => src.features.resolve(f.area, ctx),
    question,
    down,
    sequence: src.circuitMod.circuitSequence({ question, embedDown: false, down }),
    rungs: [
      ...DEFAULT_ASK_SETTINGS.tiers.map((t) => ({ name: t.name, model: t.model })),
      { name: SEARCH_ONLY_TIER, model: "sources, no prose" },
    ],
    shares,
    domain: SITE_URL.replace(/^https?:\/\//, ""),
    pageCards: src.og.PAGE_SLUGS.length,
    rules: src.ladder.SHELL_RULES,
    decide: src.ladder.decideShell,
    defaultView: src.flags.DEFAULT_VIEW,
    tags: payload.tags || [],
    types: src.tagsApi.ENTITY_TYPES,
    plural: (type) => ENTITY_PLURALS[type] || type,
    colorForTag: src.art.colorForTag,
    rev: majors && majors[0] ? majors[0].latest : null,
    releases,
    date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
  };
  return { data, snapshot: { payload, majors } };
}

// --- rendering ------------------------------------------------------------------

async function createRasteriser() {
  await initWasm(await fs.promises.readFile(path.join(ROOT, "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm")));
  // resvg reads plain TrueType/OpenType only; the card fonts are WOFF.
  const fontBuffers = FONT_FACES.map((f) => new Uint8Array(woffToSfnt(fs.readFileSync(path.join(ROOT, FONT_DIR, f.file)))));
  const options = {
    fitTo: { mode: "width", value: W },
    font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: "Inter" },
  };
  return (svg) => Buffer.from(new Resvg(svg, options).render().asPng());
}

const frameCount = (seconds) => Math.round(seconds * FPS);

// One segment straight into ffmpeg as a PNG stream: nothing touches disk.
function encodeSegment(ffmpeg, segment, layout, rasterise, file) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, [
      "-y", "-loglevel", "error",
      "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
      "-c:v", "libx264", "-preset", "medium", "-tune", "animation", "-crf", "18",
      "-pix_fmt", "yuv420p", "-r", String(FPS), file,
    ], { stdio: ["pipe", "ignore", "pipe"] });
    let err = "";
    proc.stderr.on("data", (c) => { err += c; });
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${err}`))));

    const frames = frameCount(segment.duration);
    let i = 0;
    const pump = () => {
      while (i < frames) {
        const png = rasterise(segment.render(i / FPS, layout));
        i += 1;
        if (!proc.stdin.write(png)) {
          proc.stdin.once("drain", pump);
          return;
        }
      }
      proc.stdin.end();
    };
    pump();
  });
}

// --- sound ----------------------------------------------------------------------

function extractSfx(ffmpeg) {
  const files = {};
  Object.entries(SFX_MAP).forEach(([name, [offset, duration]]) => {
    const file = path.join(WORK, `sfx-${name}.wav`);
    run(ffmpeg, ["-y", "-ss", String(offset), "-t", String(duration), "-i", SPRITE, "-ac", "2", "-ar", "48000", file]);
    files[name] = file;
  });
  return files;
}

function mux(ffmpeg, {
  video, events, duration, sfxFiles, out, narration = null,
}) {
  if (silent) {
    run(ffmpeg, ["-y", "-i", video, "-c", "copy", "-movflags", "+faststart", out]);
    return;
  }
  const names = [...new Set(events.map((e) => e.name))].filter((nm) => sfxFiles[nm]);
  const inputs = [
    "-i", video, "-stream_loop", "-1", "-i", AMBIENT, ...names.flatMap((nm) => ["-i", sfxFiles[nm]]),
    ...(narration ? ["-i", narration] : []),
  ];
  const graph = [
    `[1:a]aresample=48000,atrim=0:${duration.toFixed(3)},asetpts=PTS-STARTPTS,volume=${AMBIENT_GAIN},`
      + `afade=t=in:st=0:d=1.5,afade=t=out:st=${Math.max(0, duration - 2).toFixed(3)}:d=2[amb]`,
  ];
  const mixed = ["[amb]"];
  names.forEach((nm, k) => {
    const mine = events.filter((e) => e.name === nm);
    const split = mine.map((_, j) => `[${nm}${j}]`).join("");
    graph.push(`[${k + 2}:a]aresample=48000,asplit=${mine.length}${split}`);
    mine.forEach((e, j) => {
      const ms = Math.max(0, Math.round(e.at * 1000));
      graph.push(`[${nm}${j}]adelay=${ms}:all=1,volume=${SFX_GAIN}[${nm}e${j}]`);
      mixed.push(`[${nm}e${j}]`);
    });
  });
  // Stereo, and normalised to a gentle -19 LUFS: feeds play video loud, and the
  // loop alone sits far below that. loudnorm resamples to 192 kHz, hence the
  // aresample after it.
  const master = "loudnorm=I=-19:TP=-1.5:LRA=11,aresample=48000[aout]";
  if (!narration) {
    graph.push(`${mixed.join("")}amix=inputs=${mixed.length}:normalize=0:duration=first,aformat=channel_layouts=stereo,${master}`);
  } else {
    // The narrator keys a compressor on the music and effects, so the bed
    // ducks while a line is spoken and swells back in the gaps.
    graph.push(`${mixed.join("")}amix=inputs=${mixed.length}:normalize=0:duration=first,aformat=channel_layouts=stereo[bed]`);
    // TTS takes arrive near full scale and already sit well above the bed, so
    // the voice goes in at unity; loudnorm sets the overall level.
    graph.push(`[${names.length + 2}:a]aresample=48000,aformat=channel_layouts=stereo,asplit=2[voice][key]`);
    graph.push("[bed][key]sidechaincompress=threshold=0.015:ratio=9:attack=25:release=450[ducked]");
    graph.push(`[ducked][voice]amix=inputs=2:normalize=0:duration=first,${master}`);
  }
  run(ffmpeg, [
    "-y", ...inputs, "-filter_complex", graph.join(";"),
    "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
    "-t", duration.toFixed(3), "-movflags", "+faststart", out,
  ]);
}

// --- subtitles --------------------------------------------------------------------

const stamp = (sec, sep) => {
  const ms = Math.max(0, Math.round(sec * 1000));
  const hh = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const mm = String(Math.floor(ms / 60000) % 60).padStart(2, "0");
  const ss = String(Math.floor(ms / 1000) % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}${sep}${String(ms % 1000).padStart(3, "0")}`;
};

// The cut's captions on its own timeline: each segment's cues, shifted by
// where the segment starts.
function cutCues(cut, byId, offsets) {
  return cut.segments.flatMap((id) => (byId[id].cues || []).map((c) => ({
    start: offsets[id] + c.at, end: offsets[id] + c.until, text: c.text,
  }))).filter((c) => c.end > c.start + 0.2);
}

const toSrt = (cues) => `${cues.map((c, i) => `${i + 1}\n${stamp(c.start, ",")} --> ${stamp(c.end, ",")}\n${c.text}\n`).join("\n")}`;
const toVtt = (cues) => `WEBVTT\n\n${cues.map((c) => `${stamp(c.start, ".")} --> ${stamp(c.end, ".")}\n${c.text}\n`).join("\n")}`;

// Where each segment of a cut starts, in seconds, on whole frames.
function offsetsOf(cut, byId) {
  let t = 0;
  return Object.fromEntries(cut.segments.map((id) => {
    const at = t;
    t += frameCount(byId[id].duration) / FPS;
    return [id, at];
  }).concat([["__end", t]]));
}

// --- workers ---------------------------------------------------------------------

const segFile = (id, layout) => path.join(WORK, `${id}.${layout}.mp4`);

async function renderJobs(jobs, byId, ffmpeg, rasterise) {
  for (const job of jobs) { // eslint-disable-line no-restricted-syntax
    const [id, layout] = job.split("@");
    const started = Date.now();
    // eslint-disable-next-line no-await-in-loop -- one ffmpeg per worker keeps memory flat
    await encodeSegment(ffmpeg, byId[id], layout, rasterise, segFile(id, layout));
    console.info(`  ${String(frameCount(byId[id].duration)).padStart(4)} frames  ${String(Date.now() - started).padStart(6)}ms  ${id} (${layout})`);
  }
}

// Spreads the jobs over worker processes, heaviest first onto the least-loaded
// worker. A vertical frame has 78% more pixels to rasterise and compress.
function runWorkers(jobs, byId, dataFile) {
  const count = Math.max(1, Math.min(Number(arg("workers")) || os.cpus().length - 1, 4, jobs.length));
  const weight = (job) => {
    const [id, layout] = job.split("@");
    return frameCount(byId[id].duration) * (layout === "vertical" ? 1.6 : 1);
  };
  const bins = Array.from({ length: count }, () => ({ load: 0, jobs: [] }));
  jobs.slice().sort((a, b) => weight(b) - weight(a)).forEach((job) => {
    const bin = bins.reduce((least, b) => (b.load < least.load ? b : least), bins[0]);
    bin.jobs.push(job);
    bin.load += weight(job);
  });
  console.info(`Rendering ${jobs.length} segments on ${count} workers.`);
  const script = fileURLToPath(import.meta.url);
  return Promise.all(bins.filter((b) => b.jobs.length).map((b) => new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [script, "--worker", `--jobs=${b.jobs.join(",")}`, `--data=${dataFile}`], {
      stdio: ["ignore", "inherit", "pipe"],
    });
    let err = "";
    proc.stderr.on("data", (c) => {
      const line = String(c);
      // Node's notice that src/ is ESM without "type": "module" — noise here.
      if (!/MODULE_TYPELESS|Reparsing as ES module|"type": "module"|trace-warnings/.test(line)) err += line;
    });
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`worker exited ${code}: ${err}`))));
  })));
}

// --- audio description -------------------------------------------------------------

// Speaks every line of a cut's narration and lays them on one track. A line
// gets the time until the next one starts; if it runs longer it is sped up to
// fit (up to MAX_TEMPO), and a line that still does not fit is reported, so
// the script is fixed rather than the voice garbled.
async function narrationTrack(ffmpeg, voice, cut, byId, offsets) {
  const lines = cut.segments
    .flatMap((id) => (byId[id].narration || []).map((l) => ({ start: offsets[id] + l.at, text: l.text })))
    .sort((a, b) => a.start - b.start);
  const dir = path.join(WORK, "voice");
  for (const line of lines) { // eslint-disable-line no-restricted-syntax
    // eslint-disable-next-line no-await-in-loop -- one take at a time keeps the API polite
    line.file = await speak(voice, line.text, { ffmpeg, dir });
    line.spoken = wavSeconds(line.file);
  }
  let squeezed = 0;
  lines.forEach((line, i) => {
    const next = lines[i + 1] ? lines[i + 1].start : offsets.__end;
    const room = next - line.start - 0.15;
    line.tempo = Math.min(MAX_TEMPO, Math.max(1, line.spoken / room));
    line.end = line.start + line.spoken / line.tempo;
    if (line.tempo > 1) squeezed += 1;
    if (line.spoken / line.tempo > room + 0.05) {
      console.warn(`  ! narration overruns by ${(line.spoken / line.tempo - room).toFixed(1)}s at ${line.start.toFixed(1)}s: "${line.text}"`);
    }
  });
  const graph = lines.map((l, i) => `[${i}:a]atempo=${l.tempo.toFixed(3)},adelay=${Math.round(l.start * 1000)}:all=1[n${i}]`);
  graph.push(`${lines.map((_, i) => `[n${i}]`).join("")}amix=inputs=${lines.length}:normalize=0,apad,atrim=0:${offsets.__end.toFixed(3)}[out]`);
  const file = path.join(WORK, `${cut.file}-narration.wav`);
  run(ffmpeg, ["-y", ...lines.flatMap((l) => ["-i", l.file]), "-filter_complex", graph.join(";"), "-map", "[out]", "-ar", "48000", file]);
  const words = lines.reduce((n, l) => n + l.text.split(/\s+/).length, 0);
  console.info(`Narration: ${lines.length} lines, ${words} words, ${squeezed} sped up to fit — ${voiceCredit(voice)}.`);
  return { file, cues: lines.map((l) => ({ start: l.start, end: l.end, text: l.text })) };
}

// The described cut, from the rendered film's picture plus the narration.
async function describeFilm(ffmpeg, { cut, byId, sfxFiles }) {
  const voice = pickVoice(arg("voice"));
  const offsets = offsetsOf(cut, byId);
  const narration = await narrationTrack(ffmpeg, voice, cut, byId, offsets);
  const events = cut.segments.flatMap((id) => (byId[id].sfx || []).map((e) => ({ name: e.name, at: offsets[id] + e.at })));
  layouts.forEach((layout) => {
    const suffix = layout === "square" ? "" : `-${layout}`;
    const video = path.join(OUT, `${cut.file}${suffix}.mp4`);
    if (!fs.existsSync(video)) throw new Error(`${path.relative(ROOT, video)} is missing: render the film first`);
    const out = path.join(OUT, `${cut.file}-described${suffix}.mp4`);
    mux(ffmpeg, {
      video, events, duration: offsets.__end, sfxFiles, out, narration: narration.file,
    });
    console.info(`${path.basename(out)}  ${offsets.__end.toFixed(1)}s  ${Math.round(fs.statSync(out).size / 1024).toLocaleString("en-IN")} KB`);
  });
  fs.writeFileSync(path.join(OUT, `${cut.file}-described.srt`), toSrt(narration.cues));
  fs.writeFileSync(path.join(OUT, `${cut.file}-described.vtt`), toVtt(narration.cues));
  return { cues: narration.cues, credit: voiceCredit(voice) };
}

// --- publishing for /blueprint ------------------------------------------------------

// The page's copy: a lighter encode (it streams to phones), a JPEG poster, the
// captions as WebVTT, and the chapter starts the player's buttons seek to.
function publishFilm(ffmpeg, {
  cut, byId, offsets, cues, rev, described = null,
}) {
  fs.mkdirSync(PUBLIC_VIDEO, { recursive: true });
  // The page plays the described cut when there is one: it is the version
  // everyone can follow, and its captions are then what the narrator says.
  const src = path.join(OUT, `${cut.file}${described ? "-described" : ""}.mp4`);
  run(ffmpeg, [
    "-y", "-i", src, "-c:v", "libx264", "-preset", "slow", "-tune", "animation", "-crf", "26",
    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
    path.join(PUBLIC_VIDEO, `${cut.file}.mp4`),
  ]);
  run(ffmpeg, ["-y", "-i", path.join(OUT, `${cut.file}.png`), "-q:v", "4", path.join(PUBLIC_VIDEO, `${cut.file}.jpg`)]);
  fs.writeFileSync(path.join(PUBLIC_VIDEO, `${cut.file}.vtt`), toVtt(cues));
  const chapters = cut.segments
    .filter((id) => byId[id].chapter)
    .map((id) => ({ ...byId[id].chapter, start: Number(offsets[id].toFixed(2)) }));
  fs.writeFileSync(path.join(PUBLIC_VIDEO, `${cut.file}.json`), `${JSON.stringify({
    title: cut.title,
    duration: Number(offsets.__end.toFixed(2)),
    rev,
    rendered: new Date().toISOString().slice(0, 10),
    ...(described ? { narration: described.credit } : {}),
    chapters,
  }, null, 2)}\n`);
  const kb = Math.round(fs.statSync(path.join(PUBLIC_VIDEO, `${cut.file}.mp4`)).size / 1024);
  console.info(`Published ${path.relative(ROOT, PUBLIC_VIDEO)}/${cut.file}.{mp4,jpg,vtt,json}  (${kb.toLocaleString("en-IN")} KB video)`);
}

// --- main -----------------------------------------------------------------------

async function main() {
  loadEnv();
  const dataFile = arg("data");
  const { data, snapshot } = await gatherData(dataFile ? JSON.parse(fs.readFileSync(dataFile, "utf8")) : null);
  const { segments, cuts: allCuts } = buildFilm(data);
  const byId = Object.fromEntries(segments.map((s) => [s.id, s]));
  const rasterise = await createRasteriser();

  if (isWorker) {
    await renderJobs((arg("jobs") || "").split(",").filter(Boolean), byId, await findFfmpeg(), rasterise);
    return;
  }

  const cuts = only ? allCuts.filter((c) => c.file.includes(only)) : allCuts;
  if (!cuts.length) throw new Error(`No cut matched --only=${only}`);
  if (publish && !cuts.some((c) => c.file === "the-blueprint")) throw new Error("--publish needs the full film; drop --only");
  if (publish && !layouts.includes("square")) throw new Error("--publish needs the square layout");
  if (describe && !cuts.some((c) => c.file === FILM)) throw new Error("--describe narrates the full film; drop --only");
  await fs.promises.mkdir(WORK, { recursive: true });
  const done = () => {
    if (!process.argv.includes("--keep")) fs.rmSync(WORK, { recursive: true, force: true });
    console.info(`\nDone: ${path.relative(ROOT, OUT)}/`);
  };

  // Narrate the film already rendered: no frames are drawn.
  if (describeOnly) {
    const ffmpeg = await findFfmpeg();
    const film = cuts.find((c) => c.file === FILM);
    const described = await describeFilm(ffmpeg, { cut: film, byId, sfxFiles: silent ? {} : extractSfx(ffmpeg) });
    if (publish) {
      publishFilm(ffmpeg, {
        cut: film, byId, offsets: offsetsOf(film, byId), cues: described.cues, rev: data.rev, described,
      });
    }
    done();
    return;
  }

  if (frameArgs.length) {
    frameArgs.forEach((spec) => {
      const [id, at, layout = layouts[0]] = spec.split("@");
      if (!byId[id]) throw new Error(`No segment "${id}". Segments: ${Object.keys(byId).join(", ")}`);
      fs.writeFileSync(path.join(OUT, `frame-${id}-${at}-${layout}.png`), rasterise(byId[id].render(Number(at), layout)));
    });
    console.info(`Wrote ${frameArgs.length} frame${frameArgs.length === 1 ? "" : "s"}.`);
    return;
  }

  const suffix = (layout) => (layout === "square" ? "" : `-${layout}`);

  // Posters: one still per cut and shape, from the moment that best explains it.
  layouts.forEach((layout) => cuts.forEach((cut) => {
    const seg = byId[cut.poster];
    fs.writeFileSync(path.join(OUT, `${cut.file}${suffix(layout)}.png`), rasterise(seg.render(seg.poster, layout)));
  }));
  // Captions: the same words in both shapes, so one file per cut.
  cuts.forEach((cut) => {
    const cues = cutCues(cut, byId, offsetsOf(cut, byId));
    fs.writeFileSync(path.join(OUT, `${cut.file}.srt`), toSrt(cues));
    if (cut.file === "the-blueprint") fs.writeFileSync(path.join(OUT, `${cut.file}.vtt`), toVtt(cues));
  });
  console.info(`Wrote ${cuts.length * layouts.length} posters and ${cuts.length} subtitle files.`);
  if (stillsOnly) return;

  const ffmpeg = await findFfmpeg();
  const needed = [...new Set(cuts.flatMap((c) => c.segments))];
  const jobs = layouts.flatMap((layout) => needed.map((id) => `${id}@${layout}`))
    .filter((job) => !(reuse && fs.existsSync(segFile(...job.split("@")))));
  if (jobs.length) {
    const snapshotFile = path.join(WORK, "snapshot.json");
    fs.writeFileSync(snapshotFile, JSON.stringify(snapshot));
    await runWorkers(jobs, byId, snapshotFile);
  }

  const sfxFiles = silent ? {} : extractSfx(ffmpeg);
  layouts.forEach((layout) => cuts.forEach((cut) => {
    const offsets = offsetsOf(cut, byId);
    const events = cut.segments.flatMap((id) => (byId[id].sfx || []).map((e) => ({ name: e.name, at: offsets[id] + e.at })));
    const name = `${cut.file}${suffix(layout)}`;
    const list = path.join(WORK, `${name}.txt`);
    fs.writeFileSync(list, cut.segments.map((id) => `file '${segFile(id, layout)}'`).join("\n"));
    const video = path.join(WORK, `${name}.video.mp4`);
    run(ffmpeg, ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", video]);
    const out = path.join(OUT, `${name}.mp4`);
    mux(ffmpeg, {
      video, events, duration: offsets.__end, sfxFiles, out,
    });
    const kb = Math.round(fs.statSync(out).size / 1024);
    console.info(`${name}.mp4  ${offsets.__end.toFixed(1)}s  ${kb.toLocaleString("en-IN")} KB`);
  }));

  const film = cuts.find((c) => c.file === FILM);
  const described = describe ? await describeFilm(ffmpeg, { cut: film, byId, sfxFiles }) : null;

  if (publish) {
    const offsets = offsetsOf(film, byId);
    publishFilm(ffmpeg, {
      cut: film, byId, offsets, cues: described ? described.cues : cutCues(film, byId, offsets), rev: data.rev, described,
    });
  }

  done();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
