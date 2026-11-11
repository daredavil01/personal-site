// The footage for the /books film: screenshots and screen recordings of the
// live Reading Room at phone size, from a local Vite server reading the live
// table. Run by render.mjs when the footage is missing, or with --capture.
//
// Recordings are Playwright screencasts (WebM), re-encoded to short H.264
// clips Remotion can seek frame-accurately. Everything lands in the film's
// gitignored working folder (knowledge_base/books-film/public/).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createServer } from "vite";
import { createRequire } from "node:module";

// Playwright is not a dependency here: a CommonJS require finds the copy on
// NODE_PATH (an ESM import would not look there).
const { chromium } = createRequire(import.meta.url)("playwright");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHROME = process.env.CHROME_PATH || (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const W = 414;
const H = 896;

// The page reads the publishable key from VITE_*; wrangler.toml holds it.
function loadVars() {
  const toml = fs.readFileSync(path.join(ROOT, "wrangler.toml"), "utf8");
  ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY"].forEach((k) => {
    const m = new RegExp(`^\\s*${k}\\s*=\\s*"([^"]+)"`, "m").exec(toml);
    if (m && !process.env[k]) process.env[k] = m[1];
  });
}

const atlasState = {
  version: 1, view: null, sound: false, time: "day", introSeen: true, visitedRegions: {}, stamps: {},
  actions: {}, quests: {}, eggs: {}, visitDays: [], guide: {},
};

// Covers come from other hosts; behind a proxy the browser has to use it too.
const proxy = () => {
  const server = process.env.HTTPS_PROXY || process.env.https_proxy;
  return server ? { server, bypass: "localhost,127.0.0.1" } : undefined;
};

async function context(browser, { video = null, theme = "light" } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
    timezoneId: "Asia/Kolkata",
    locale: "en-IN",
    ignoreHTTPSErrors: Boolean(proxy()),
    ...(video ? { recordVideo: { dir: video, size: { width: W, height: H } } } : {}),
  });
  await ctx.addInitScript(([s, th]) => {
    localStorage.setItem("atlas.v1", JSON.stringify(s));
    localStorage.setItem("site-tour-seen", "true");
    localStorage.setItem("site-tour-prompt-dismissed", "true");
    localStorage.setItem("theme", th);
  }, [atlasState, theme]);
  return ctx;
}

// The floating round buttons (ask, theme, atlas) and any welcome toast sit
// over the page; the film is about the page under them.
const tidy = async (page) => {
  await page.addStyleTag({ content: ".fixed[class*='bottom-'] { display: none !important; } ::-webkit-scrollbar { display: none; }" });
  await page.evaluate(() => {
    document.querySelectorAll("body *").forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.position === "fixed" && /stamped|Got it|passport|cookie/i.test(el.textContent || "")) el.remove();
    });
  });
};

/** Wait until every cover on screen has loaded (or failed). */
const coversIn = (page) => page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});

/** Scroll smoothly, like a thumb, to put `y` at the top of the viewport. */
async function glide(page, to, ms = 900) {
  await page.evaluate(async ([y, d]) => {
    const from = window.scrollY;
    const t0 = performance.now();
    await new Promise((done) => {
      const step = (now) => {
        const k = Math.min(1, (now - t0) / d);
        const e = k < 0.5 ? 4 * k * k * k : 1 - ((-2 * k + 2) ** 3) / 2;
        window.scrollTo(0, from + (y - from) * e);
        if (k < 1) requestAnimationFrame(step); else done();
      };
      requestAnimationFrame(step);
    });
  }, [to, ms]);
}

// Where an element sits right now, in page coordinates — read at the moment
// of scrolling, because the hero grows as its fonts and cover arrive.
const topOf = (page, selector) => page.evaluate((s) => {
  const el = document.querySelector(s);
  return el ? el.getBoundingClientRect().top + window.scrollY : 0;
}, selector);

/** Glide so `selector` sits `offset` px below the top of the screen. */
const glideTo = async (page, selector, offset = 12, ms = 700) => glide(page, (await topOf(page, selector)) - offset, ms);

/** Click without Playwright scrolling the target into view first. */
const tap = (page, selector, text) => page.evaluate(([s, t]) => {
  const el = [...document.querySelectorAll(s)].find((e) => e.textContent.includes(t));
  el?.click();
}, [selector, text]);

async function open(page, base, query = "") {
  await page.goto(`${base}/books${query}`, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
  await page.waitForSelector(".bk-spine, .bk-shelf", { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await tidy(page);
  await coversIn(page);
  await page.waitForTimeout(1500);
}

// --- the clips ----------------------------------------------------------------
// Between them they show every view on the page: both shells, light and dark,
// all six arrangements, spines and covers, filters dimming the shelf, the
// open book, and all five lenses.

const CLIPS = {
  // The atlas shell: the Book Forest header, then down to the shelf.
  async atlas(page, base) {
    await open(page, base, "?view=atlas");
    page.mark("start");
    await page.waitForTimeout(900);
    await glideTo(page, ".bk-hero", 60, 1800);
    await page.waitForTimeout(700);
    await glideTo(page, ".bk-shelf", 160, 2200);
    await page.waitForTimeout(900);
    page.mark("end");
  },

  // The shelf re-arranging itself six ways: every spine travels to its place.
  async arrange(page, base) {
    await open(page, base, "?view=classic");
    await glideTo(page, ".bk-case", 8, 1);
    await page.waitForTimeout(900);
    page.mark("start");
    for (const label of ["Subject", "Language", "Written in", "Thickness", "A–Z", "Year read"]) {
      // eslint-disable-next-line no-await-in-loop
      await tap(page, ".bk-arrange button", label);
      page.tapped();
      // eslint-disable-next-line no-await-in-loop
      await page.waitForTimeout(1700);
    }
    page.mark("end");
  },

  // A hand along the shelf: each spine tips out to show its cover.
  async reach(page, base) {
    await open(page, base, "?view=classic");
    await glideTo(page, ".bk-shelf", 90, 1);
    await page.waitForTimeout(800);
    const spines = await page.locator(".bk-spine").evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, vis: r.top > 40 && r.bottom < innerHeight - 40 };
    }).filter((s) => s.vis));
    page.mark("start");
    for (const s of spines.slice(0, 18)) {
      // eslint-disable-next-line no-await-in-loop
      await page.mouse.move(s.x, s.y, { steps: 6 });
      // eslint-disable-next-line no-await-in-loop
      await page.waitForTimeout(260);
    }
    page.mark("end");
  },

  // Filters dim, never remove: Marathi, then one subject, then clear.
  async filter(page, base) {
    await open(page, base, "?view=classic");
    await glideTo(page, ".bk-controls", 8, 1);
    await page.waitForTimeout(800);
    page.mark("start");
    await tap(page, ".bk-chip", "Marathi");
    page.tapped();
    await page.waitForTimeout(1500);
    await glideTo(page, ".bk-shelf", 300, 900);
    await page.waitForTimeout(1300);
    await glideTo(page, ".bk-controls", 8, 600);
    await tap(page, ".bk-chip", "Marathi");
    await tap(page, ".bk-chip", "History");
    page.tapped();
    await page.waitForTimeout(700);
    await glideTo(page, ".bk-shelf", 300, 900);
    await page.waitForTimeout(1500);
    page.mark("end");
  },

  // "Pull one for me": a spine tips out, the book lays itself open, ← → walk on.
  async pull(page, base) {
    await open(page, base, "?view=classic");
    page.mark("start");
    await page.waitForTimeout(700);
    await tap(page, "button", "Pull one for me");
    page.tapped();
    await page.waitForTimeout(3600);
    await page.keyboard.press("ArrowRight");
    page.tapped();
    await page.waitForTimeout(1800);
    await page.keyboard.press("ArrowRight");
    page.tapped();
    await page.waitForTimeout(1800);
    page.mark("end");
  },

  // Face-out: the same shelf as a wall of covers.
  async covers(page, base) {
    await open(page, base, "?view=classic");
    await glideTo(page, ".bk-case", 8, 1);
    await page.waitForTimeout(700);
    page.mark("start");
    await tap(page, ".bk-arrange button", "Covers");
    page.tapped();
    await coversIn(page);
    await page.waitForTimeout(1300);
    await glide(page, (await topOf(page, ".bk-case")) + 900, 3800);
    await page.waitForTimeout(500);
    page.mark("end");
  },

  // The other four lenses: Borrower's slip, Numbers, Marginalia, Catalogue.
  async lenses(page, base) {
    await open(page, base, "?view=classic");
    await glideTo(page, ".bk-tabs", 8, 1);
    await page.waitForTimeout(700);
    page.mark("start");
    for (const [label, drift] of [["Borrower", 700], ["Numbers", 1300], ["Marginalia", 700], ["Catalogue", 600]]) {
      // eslint-disable-next-line no-await-in-loop
      await glideTo(page, ".bk-tabs", 8, 450);
      // eslint-disable-next-line no-await-in-loop
      await tap(page, ".bk-tab", label);
      page.tapped();
      // eslint-disable-next-line no-await-in-loop
      await page.waitForTimeout(900);
      // eslint-disable-next-line no-await-in-loop
      await glide(page, (await topOf(page, ".bk-tabs")) + drift, 2000);
      // eslint-disable-next-line no-await-in-loop
      await page.waitForTimeout(450);
    }
    page.mark("end");
  },

  // After dark: the same shelf in the dark theme.
  async night(page, base) {
    await open(page, base, "?view=classic");
    await glideTo(page, ".bk-shelf", 120, 1);
    await page.waitForTimeout(600);
    page.mark("start");
    await glide(page, (await topOf(page, ".bk-shelf")) + 300, 3200);
    await page.waitForTimeout(400);
    page.mark("end");
  },
};

// --- the stills ---------------------------------------------------------------

async function stills(browser, base, dir) {
  const ctx = await context(browser);
  const page = await ctx.newPage();
  const shot = (name) => page.screenshot({ path: path.join(dir, `shot-${name}.jpg`), type: "jpeg", quality: 84 });
  for (const mode of ["atlas", "classic"]) {
    // eslint-disable-next-line no-await-in-loop
    await open(page, base, `?view=${mode}`);
    // eslint-disable-next-line no-await-in-loop
    await shot(`hero-${mode}`);
  }
  // The open book, the way /books/:id draws it.
  const id = await page.evaluate(() => document.querySelector("[data-flip^='b']")?.dataset.flip.slice(1));
  await page.goto(`${base}/books/${id}?view=classic`, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
  await tidy(page);
  await coversIn(page);
  await page.waitForTimeout(1500);
  await shot("book");
  await ctx.close();
  console.log("  stills: hero-atlas, hero-classic, book");
}

async function record(browser, base, dir, name) {
  const tmp = path.join(dir, `rec-${name}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  const ctx = await context(browser, { video: tmp, theme: name === "night" ? "dark" : "light" });
  const page = await ctx.newPage();
  const t0 = Date.now();
  const marks = {};
  const taps = [];
  page.mark = (k) => { marks[k] = (Date.now() - t0) / 1000; };
  page.tapped = () => taps.push((Date.now() - t0) / 1000);
  await CLIPS[name](page, base);
  await page.waitForTimeout(300);
  const video = page.video();
  await ctx.close();
  const webm = await video.path();
  // The recording starts with the page load; keep from the "start" mark,
  // less a beat, to the end mark. Recording latency is ~0.2 s.
  const ss = Math.max(0, marks.start - 0.15);
  const len = marks.end - marks.start + 0.3;
  const out = path.join(dir, `clip-${name}.mp4`);
  execFileSync("ffmpeg", ["-y", "-ss", ss.toFixed(2), "-i", webm, "-t", len.toFixed(2), "-an", "-vf", "fps=30,scale=828:1792:flags=lanczos",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-g", "15", "-movflags", "+faststart", out], { stdio: "ignore" });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`  clip-${name}.mp4 (${len.toFixed(1)} s, ${taps.length} taps)`);
  const r2 = (v) => Math.round(v * 100) / 100;
  return { seconds: r2(len), taps: taps.map((t) => r2(t - ss)) };
}

export async function capture(dir, only = null) {
  loadVars();
  fs.mkdirSync(dir, { recursive: true });
  const vite = await createServer({ root: ROOT, logLevel: "error", server: { port: 5193, strictPort: false } });
  await vite.listen();
  const base = vite.resolvedUrls.local[0].replace(/\/$/, "");
  const browser = await chromium.launch({ executablePath: CHROME, proxy: proxy() });
  const manifestFile = path.join(dir, "clips.json");
  const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, "utf8")) : {};
  try {
    // Warm the dev server so the first recording is not of Vite compiling.
    const warm = await (await context(browser)).newPage();
    await open(warm, base, "?view=classic");
    await warm.context().close();
    if (!only || only.includes("stills")) await stills(browser, base, dir);
    for (const name of Object.keys(CLIPS)) {
      if (only && !only.includes(name)) continue; // eslint-disable-line no-continue
      // eslint-disable-next-line no-await-in-loop
      manifest[name] = await record(browser, base, dir, name);
    }
  } finally {
    await browser.close();
    await vite.close();
  }
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1].split(",") || null;
  capture(path.join(ROOT, "knowledge_base", "books-film", "public"), only).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
