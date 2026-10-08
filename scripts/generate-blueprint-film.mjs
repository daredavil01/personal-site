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
 *
 * Output goes to knowledge_base/blueprint-film/ (gitignored): MP4s at 1080x1080,
 * 30 fps, H.264 + AAC — square because it is the one shape every feed shows
 * whole — and a poster PNG per cut for the platforms that ask for a cover.
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
import { FPS, W } from "./blueprint-film/draw.mjs";

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
// --frame=<segment>@<seconds>[,…] writes single frames, for checking a moment.
const frameArgs = (arg("frame") || "").split(",").filter(Boolean);

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
async function loadSource() {
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
    try {
      majors = await changelog.getChangelogMajors();
    } catch (err) {
      console.warn(`  ! changelog unavailable (${err.message}); the revision line is left out`);
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

async function gatherData() {
  const src = await loadSource();
  const { payload, from } = await getStatsPayload();
  console.info(`Stats from ${from}.`);

  const ctx = {
    stats: payload.stats, micro: payload.micro, tags: payload.tags, releases: null,
  };
  const releases = src.majors ? src.majors.reduce((s, m) => s + (m.count || 0), 0) : null;
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

  return {
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
    rev: src.majors && src.majors[0] ? src.majors[0].latest : null,
    releases,
    date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
  };
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
function encodeSegment(ffmpeg, segment, rasterise, file) {
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
        const png = rasterise(segment.render(i / FPS));
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

function mux(ffmpeg, { video, events, duration, sfxFiles, out }) {
  if (silent) {
    run(ffmpeg, ["-y", "-i", video, "-c", "copy", "-movflags", "+faststart", out]);
    return;
  }
  const names = [...new Set(events.map((e) => e.name))].filter((nm) => sfxFiles[nm]);
  const inputs = ["-i", video, "-stream_loop", "-1", "-i", AMBIENT, ...names.flatMap((nm) => ["-i", sfxFiles[nm]])];
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
  graph.push(`${mixed.join("")}amix=inputs=${mixed.length}:normalize=0:duration=first,`
    + "aformat=channel_layouts=stereo,loudnorm=I=-19:TP=-1.5:LRA=11,aresample=48000[aout]");
  run(ffmpeg, [
    "-y", ...inputs, "-filter_complex", graph.join(";"),
    "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
    "-t", duration.toFixed(3), "-movflags", "+faststart", out,
  ]);
}

// --- main -----------------------------------------------------------------------

async function main() {
  const data = await gatherData();
  const { segments, cuts: allCuts } = buildFilm(data);
  const cuts = only ? allCuts.filter((c) => c.file.includes(only)) : allCuts;
  if (!cuts.length) throw new Error(`No cut matched --only=${only}`);
  const byId = Object.fromEntries(segments.map((s) => [s.id, s]));

  await fs.promises.mkdir(WORK, { recursive: true });
  const rasterise = await createRasteriser();

  if (frameArgs.length) {
    frameArgs.forEach((spec) => {
      const [id, at] = spec.split("@");
      if (!byId[id]) throw new Error(`No segment "${id}". Segments: ${Object.keys(byId).join(", ")}`);
      fs.writeFileSync(path.join(OUT, `frame-${id}-${at}.png`), rasterise(byId[id].render(Number(at))));
    });
    console.info(`Wrote ${frameArgs.length} frame${frameArgs.length === 1 ? "" : "s"}.`);
    return;
  }

  // Posters: one still per cut, from the moment that best explains it.
  cuts.forEach((cut) => {
    const seg = byId[cut.poster];
    fs.writeFileSync(path.join(OUT, `${cut.file}.png`), rasterise(seg.render(seg.poster)));
  });
  console.info(`Wrote ${cuts.length} poster${cuts.length === 1 ? "" : "s"}.`);
  if (stillsOnly) return;

  const ffmpeg = await findFfmpeg();
  const needed = [...new Set(cuts.flatMap((c) => c.segments))];
  for (const id of needed) { // eslint-disable-line no-restricted-syntax
    const seg = byId[id];
    const file = path.join(WORK, `${id}.mp4`);
    if (reuse && fs.existsSync(file)) {
      console.info(`  reused ${id}`);
      continue; // eslint-disable-line no-continue
    }
    const started = Date.now();
    // eslint-disable-next-line no-await-in-loop -- one ffmpeg at a time keeps memory flat
    await encodeSegment(ffmpeg, seg, rasterise, file);
    console.info(`  ${String(frameCount(seg.duration)).padStart(4)} frames  ${String(Date.now() - started).padStart(6)}ms  ${id}`);
  }

  const sfxFiles = silent ? {} : extractSfx(ffmpeg);
  cuts.forEach((cut) => {
    let offset = 0;
    const events = [];
    cut.segments.forEach((id) => {
      const seg = byId[id];
      (seg.sfx || []).forEach((e) => events.push({ name: e.name, at: offset + e.at }));
      offset += frameCount(seg.duration) / FPS;
    });
    const list = path.join(WORK, `${cut.file}.txt`);
    fs.writeFileSync(list, cut.segments.map((id) => `file '${path.join(WORK, `${id}.mp4`)}'`).join("\n"));
    const video = path.join(WORK, `${cut.file}.video.mp4`);
    run(ffmpeg, ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", video]);
    const out = path.join(OUT, `${cut.file}.mp4`);
    mux(ffmpeg, {
      video, events, duration: offset, sfxFiles, out,
    });
    const kb = Math.round(fs.statSync(out).size / 1024);
    console.info(`${cut.file}.mp4  ${offset.toFixed(1)}s  ${kb.toLocaleString("en-IN")} KB`);
  });

  if (!process.argv.includes("--keep")) fs.rmSync(WORK, { recursive: true, force: true });
  console.info(`\nDone: ${path.relative(ROOT, OUT)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
