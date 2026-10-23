#!/usr/bin/env node
/**
 * Step 1 of the /videos film: the footage. Everything lands in
 * knowledge_base/videos-film/ (gitignored) and is fetched once.
 *
 *   node scripts/videos-film/capture.mjs                 # whatever is missing
 *   node scripts/videos-film/capture.mjs phone admin     # some parts, again
 *
 * Parts:
 *   globe   NASA's Blue Marble, for the shot from space
 *   tiles   satellite tiles from the globe's hand-over down to Pune (geo.mjs)
 *   thumbs  each video's own YouTube thumbnail
 *   phone   the live /videos pages at 414 CSS px × 2, one state per action
 *           (typing, the Shorts switch, sorts, a video playing) with where
 *           each tap landed, so the film can draw the finger
 *   admin   /admin/videos/sync pressing Sync now, on a local build of the
 *           site whose backend is replayed: the session is faked and the
 *           endpoint returns what the first real sync found for these rows
 *           (16 new, Shorts confirmed at /shorts/<id>, playlists re-filed).
 *           Production's admin needs a sign-in no script should hold.
 *
 * Needs playwright-core (npm i --no-save playwright-core) and a Chrome or
 * Chromium (CHROME=path to pick one).
 */

import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

import {
  FIRST, LAST, GLOBE_URL, tilesFor, tileUrl,
} from "./geo.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
export const OUT = path.join(ROOT, "knowledge_base", "videos-film");
const SITE = process.env.FILM_SITE || "https://sankettambare.in";
const MAX_H = 6400;
const PORT = 4179;

const CHROME = [
  process.env.CHROME,
  "/opt/pw-browsers/chromium",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => p && fs.existsSync(p));

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const write = (file, buf) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, buf); };

// wrangler.toml [vars] carries the public Supabase URL and key.
function siteVars() {
  const toml = fs.readFileSync(path.join(ROOT, "wrangler.toml"), "utf8");
  const pick = (k) => (toml.match(new RegExp(`${k}\\s*=\\s*"([^"]+)"`)) || [])[1];
  return { url: pick("VITE_SUPABASE_URL"), key: pick("VITE_SUPABASE_PUBLISHABLE_KEY") };
}

/** Every visible video, as the public REST API returns it (with tag_names). */
export async function liveVideos() {
  const { url, key } = siteVars();
  const res = await fetch(`${url}/rest/v1/videos?select=*,tag_names&order=date.desc.nullslast`, { headers: { apikey: key } });
  if (!res.ok) throw new Error(`videos: ${res.status}`);
  return res.json();
}

async function download(url, file, { retries = 3 } = {}) {
  if (fs.existsSync(file)) return true;
  for (let i = 0; i <= retries; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(url, { headers: { "User-Agent": "sankettambare.in film capture (one-off)" } });
      if (res.ok) {
        // eslint-disable-next-line no-await-in-loop
        write(file, Buffer.from(await res.arrayBuffer()));
        return true;
      }
      if (res.status === 404) return false;
    } catch (_) {
      // retried below
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(1000 * 2 ** i);
  }
  throw new Error(`Could not download ${url}`);
}

async function pool(items, size, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      // eslint-disable-next-line no-await-in-loop
      await fn(item);
    }
  }));
}

// --- globe, tiles, thumbnails ----------------------------------------------------

async function globe() {
  await download(GLOBE_URL, path.join(OUT, "globe.jpg"));
  console.info("  globe  Blue Marble");
}

async function tiles() {
  const jobs = [];
  for (let z = FIRST; z <= LAST; z += 1) {
    tilesFor(z).forEach(([x, y]) => jobs.push([z, x, y]));
  }
  let done = 0;
  // Six at a time: polite to a public tile service, and still a few minutes.
  await pool(jobs, 6, async ([z, x, y]) => {
    await download(tileUrl(z, x, y), path.join(OUT, "tiles", String(z), `${x}-${y}.jpg`));
    done += 1;
    if (done % 200 === 0) console.info(`  tiles  ${done}/${jobs.length}`);
  });
  console.info(`  tiles  ${jobs.length} on levels ${FIRST}–${LAST}`);
}

async function thumbs() {
  const rows = await liveVideos();
  await pool(rows, 4, async (r) => {
    const file = path.join(OUT, "thumbs", `${r.youtube_id}.jpg`);
    // The largest the video has: maxres exists only for HD uploads.
    for (const size of ["maxresdefault", "sddefault", "hqdefault"]) { // eslint-disable-line no-restricted-syntax
      // eslint-disable-next-line no-await-in-loop
      if (await download(`https://i.ytimg.com/vi/${r.youtube_id}/${size}.jpg`, file, { retries: 1 })) break;
    }
  });
  console.info(`  thumbs ${rows.length}`);
}

// --- the live pages, on a phone ---------------------------------------------------

const atlasState = {
  version: 1, view: null, sound: false, time: "day", introSeen: true, visitedRegions: {}, stamps: {},
  actions: {}, quests: {}, eggs: {}, visitDays: [], guide: {},
};

async function phoneContext(browser, { theme = "light" } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    timezoneId: "Asia/Kolkata", locale: "en-IN",
  });
  await ctx.addInitScript(([s, th]) => {
    localStorage.setItem("atlas.v1", JSON.stringify(s));
    localStorage.setItem("site-tour-seen", "true");
    localStorage.setItem("site-tour-prompt-dismissed", "true");
    localStorage.setItem("theme", th);
  }, [atlasState, theme]);
  return ctx;
}

// Walk the page so lazy thumbnails load, then back to the top.
async function settle(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < Math.min(h, MAX_H); y += 500) {
    // eslint-disable-next-line no-await-in-loop
    await page.evaluate((v) => window.scrollTo(0, v), y);
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(220);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
}

// Centre of an element in page coordinates (CSS px), for the film's finger.
async function centre(locator) {
  const box = await locator.boundingBox();
  const y = await locator.page().evaluate(() => window.scrollY);
  return box ? { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2 + y) } : null;
}

const SHOTS = {};

// The floating round buttons (ask, theme, atlas) sit over the cards in a
// full-page capture; the film is about the page under them. display, not
// visibility: the buttons carry Tailwind's `visible`, which beats an
// inherited `hidden`.
const hideFloaters = (page) => page.addStyleTag({ content: ".fixed[class*='bottom-'] { display: none !important; }" });

async function snap(page, name, { full = true, from = 0, height = null, extra = {} } = {}) {
  if (!name.startsWith("admin")) await hideFloaters(page);
  const pageH = await page.evaluate(() => document.documentElement.scrollHeight);
  const h = full ? Math.min(MAX_H - from, height || pageH - from) : 896;
  const opts = { path: path.join(OUT, "shots", `${name}.jpg`), type: "jpeg", quality: 88 };
  if (full) Object.assign(opts, { fullPage: true, clip: { x: 0, y: from, width: 414, height: h } });
  fs.mkdirSync(path.join(OUT, "shots"), { recursive: true });
  await page.screenshot(opts);
  SHOTS[name] = { from, height: h, ...extra };
  console.info(`  ${name.padEnd(16)} ${h}px`);
}

async function phone(browser) {
  // The list, the Shorts switch, search, sorts and filters.
  let ctx = await phoneContext(browser);
  let page = await ctx.newPage();
  await page.goto(`${SITE}/videos`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("a[href^='/videos/']", { timeout: 30000 });
  await settle(page);
  const search = page.locator("#video-search");
  const toolbar = await centre(search);
  const top = Math.max(0, toolbar.y - 140);
  const types = page.locator("[role=group][aria-label=Show] button");
  const taps = {
    search: toolbar,
    all: await centre(types.nth(0)),
    videos: await centre(types.nth(1)),
    shorts: await centre(types.nth(2)),
    year: await centre(page.locator("select[aria-label='Filter by year']")),
    playlist: await centre(page.locator("select[aria-label='Filter by playlist']")),
    sort: await centre(page.locator("select[aria-label='Sort by']")),
  };
  await snap(page, "videos", { extra: { toolbar: top } });

  await types.nth(2).click();
  await page.waitForTimeout(900);
  await settle(page);
  await snap(page, "shorts", { from: top, extra: { tap: taps.shorts } });
  await types.nth(0).click();
  await page.waitForTimeout(500);

  await search.click();
  const word = "blog";
  for (let i = 1; i <= word.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await search.fill(word.slice(0, i));
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(600);
    // eslint-disable-next-line no-await-in-loop
    await snap(page, `search-${i}`, { from: top, height: 1500, extra: { tap: taps.search, text: word.slice(0, i) } });
  }
  await page.goto(`${SITE}/videos?sort=views`, { waitUntil: "networkidle" });
  await settle(page);
  await snap(page, "sort-views", { from: top, height: 2200, extra: { tap: taps.sort } });
  await page.goto(`${SITE}/videos?year=2020`, { waitUntil: "networkidle" });
  await settle(page);
  await snap(page, "year-2020", { from: top, height: 1800, extra: { tap: taps.year } });
  const lists = await page.locator("select[aria-label='Filter by playlist'] option").allTextContents();
  await ctx.close();

  // A Short, before and after play; a long video with its related strip.
  ctx = await phoneContext(browser);
  page = await ctx.newPage();
  const rows = await liveVideos();
  const short = rows.slice().sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).find((r) => (r.kind_override || r.kind) === "short");
  const long = rows.find((r) => (r.kind_override || r.kind) === "video" && r.description);
  await page.goto(`${SITE}/videos/${short.id}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  const play = page.locator("button[aria-label^='Play']");
  const playAt = await centre(play);
  // Only the page before play: YouTube refuses to play for a headless
  // browser in a data centre, so the film draws the playing state itself.
  const frame = await play.boundingBox();
  await snap(page, "short", {
    full: false,
    extra: {
      tap: playAt, id: short.id, box: { x: frame.x, y: frame.y, w: frame.width, h: frame.height },
    },
  });
  await page.goto(`${SITE}/videos/${long.id}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3000);
  await settle(page);
  await page.waitForTimeout(2500);
  await snap(page, "video", { height: 4200, extra: { id: long.id } });
  await ctx.close();

  // The same list after dark.
  ctx = await phoneContext(browser, { theme: "dark" });
  page = await ctx.newPage();
  await page.goto(`${SITE}/videos`, { waitUntil: "networkidle", timeout: 60000 });
  await settle(page);
  await snap(page, "videos-dark", { height: 2600 });
  await ctx.close();

  // The homepage, for the browser that opens over Pune.
  ctx = await phoneContext(browser);
  page = await ctx.newPage();
  await page.goto(`${SITE}/`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(7000);
  await snap(page, "home", { full: false });
  await ctx.close();

  // Keep the admin entries; the phone's are all rewritten.
  const meta = path.join(OUT, "shots.json");
  const prev = fs.existsSync(meta) ? JSON.parse(fs.readFileSync(meta, "utf8")) : {};
  const admins = Object.fromEntries(Object.entries(prev).filter(([k]) => k.startsWith("admin")));
  fs.writeFileSync(meta, JSON.stringify({
    ...admins, ...SHOTS, $phone: { taps, playlists: lists.slice(1) },
  }, null, 2));
}

// --- the admin, against a replayed backend ---------------------------------------

function buildSite() {
  const dir = path.join(OUT, ".site");
  const { url, key } = siteVars();
  console.info("  building the site for the admin shots…");
  execFileSync("npx", ["vite", "build", "--outDir", dir, "--emptyOutDir"], {
    cwd: ROOT,
    stdio: ["ignore", "ignore", "inherit"],
    env: { ...process.env, VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key },
  });
  return dir;
}

async function serve(dir) {
  // vite itself, not through npx, so killing it ends the server.
  const vite = path.join(ROOT, "node_modules", "vite", "bin", "vite.js");
  const proc = spawn(process.execPath, [vite, "preview", "--outDir", dir, "--port", String(PORT), "--strictPort"], {
    cwd: ROOT, stdio: "ignore",
  });
  for (let i = 0; i < 60; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      if ((await fetch(`http://localhost:${PORT}/`)).ok) return proc;
    } catch (_) {
      // not up yet
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(500);
  }
  proc.kill();
  throw new Error("vite preview did not start");
}

// A gate the script opens by hand, so each in-between state can be shot.
const gate = () => {
  let open;
  const p = new Promise((r) => { open = r; });
  return { p, open };
};

async function admin(browser) {
  const rows = await liveVideos();
  const { url } = siteVars();
  const ref = new URL(url).hostname.split(".")[0];
  const proc = await serve(buildSite());
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const user = {
    id: "00000000-0000-0000-0000-000000000001", aud: "authenticated", role: "authenticated", email: "owner@sankettambare.in", app_metadata: {}, user_metadata: {},
  };
  const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, role: "authenticated", aud: "authenticated", exp })}.film`;
  const session = {
    access_token: jwt, token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: "film", user,
  };
  const kind = (r) => r.kind_override || r.kind;
  const short = (r) => (r.duration_seconds || 0) <= 180;
  const playlists = [...new Set(rows.flatMap((r) => r.playlists || []))];
  let stored = [];
  const uploads = gate();
  const lists = gate();

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5, timezoneId: "Asia/Kolkata", locale: "en-IN",
    });
    await ctx.addInitScript(([k, s]) => { localStorage.setItem(k, JSON.stringify(s)); localStorage.setItem("theme", "light"); }, [`sb-${ref}-auth-token`, session]);
    const page = await ctx.newPage();
    await page.route("**/auth/v1/**", (r) => r.fulfill({ json: user }));
    await page.route("**/rest/v1/**", (r) => {
      const u = r.request().url();
      if (u.includes("/rest/v1/videos")) return r.fulfill({ json: stored });
      if (u.includes("/rpc/is_owner")) return r.fulfill({ json: true });
      return r.fulfill({ json: [] });
    });
    await page.route("**/api/youtube-sync", async (r) => {
      const { step } = JSON.parse(r.request().postData() || "{}");
      if (step === "uploads") {
        await uploads.p;
        const probed = rows.filter(short);
        return r.fulfill({
          json: {
            channel: { id: "channel", title: "Sanket Tambare", videoCount: rows.length },
            playlist: "uploads",
            next: null,
            total: rows.length,
            seen: rows.map((v) => v.youtube_id),
            added: rows.length,
            updated: 0,
            skipped: 0,
            probes: {
              short: probed.filter((v) => kind(v) === "short").length,
              video: probed.filter((v) => kind(v) === "video").length,
              unknown: 0,
            },
          },
        });
      }
      await lists.p;
      stored = rows;
      return r.fulfill({
        json: { playlists, updated: rows.filter((v) => (v.playlists || []).length).length, truncated: false },
      });
    });

    await page.goto(`http://localhost:${PORT}/admin/videos/sync`, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Sync now", { timeout: 20000 });
    await page.waitForTimeout(800);
    const button = page.locator("button:has-text('Sync now')");
    const box = await button.boundingBox();
    const tap = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    const shot = async (name, extra = {}) => {
      await page.screenshot({ path: path.join(OUT, "shots", `${name}.jpg`), type: "jpeg", quality: 90 });
      SHOTS[name] = { from: 0, height: 800, width: 1280, ...extra };
      console.info(`  ${name}`);
    };
    await shot("admin-0", { tap });
    await button.click();
    await page.waitForTimeout(700);
    await shot("admin-1");
    uploads.open();
    await page.waitForSelector("text=Reading playlists", { timeout: 10000 });
    await page.waitForTimeout(400);
    await shot("admin-2");
    lists.open();
    await page.waitForSelector("text=new", { timeout: 10000 });
    await page.waitForTimeout(900);
    await shot("admin-3");
    await page.goto(`http://localhost:${PORT}/admin/videos`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await shot("admin-list");
    await ctx.close();
  } finally {
    proc.kill();
  }
  const meta = path.join(OUT, "shots.json");
  const prev = fs.existsSync(meta) ? JSON.parse(fs.readFileSync(meta, "utf8")) : {};
  fs.writeFileSync(meta, JSON.stringify({ ...prev, ...SHOTS }, null, 2));
}

// --- main --------------------------------------------------------------------------

const PARTS = {
  globe: { done: () => fs.existsSync(path.join(OUT, "globe.jpg")), run: globe },
  tiles: { done: () => fs.existsSync(path.join(OUT, "tiles", String(LAST))), run: tiles },
  thumbs: { done: () => fs.existsSync(path.join(OUT, "thumbs")), run: thumbs },
  phone: { done: () => fs.existsSync(path.join(OUT, "shots", "home.jpg")), run: phone, browser: true },
  admin: { done: () => fs.existsSync(path.join(OUT, "shots", "admin-list.jpg")), run: admin, browser: true },
};

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const want = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const names = want.length ? want : Object.keys(PARTS).filter((k) => !PARTS[k].done());
  if (!names.length) {
    console.info("Footage is complete. Name a part to capture it again.");
    return;
  }
  let browser = null;
  for (const name of names) { // eslint-disable-line no-restricted-syntax
    const part = PARTS[name];
    if (!part) throw new Error(`Unknown part "${name}". Parts: ${Object.keys(PARTS).join(", ")}`);
    if (part.browser && !browser) {
      if (!CHROME) throw new Error("No Chrome or Chromium found (set CHROME).");
      // eslint-disable-next-line no-await-in-loop
      browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
    }
    console.info(name);
    // eslint-disable-next-line no-await-in-loop
    await part.run(browser);
  }
  if (browser) await browser.close();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
