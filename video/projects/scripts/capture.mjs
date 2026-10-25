#!/usr/bin/env node
/**
 * Footage for the projects film: every visible project row, one cover image
 * per project for the opening collage, and phone-sized screen recordings of
 * the spotlit sites, the /projects page and /ask answering a question.
 *
 *   node scripts/capture.mjs            # everything
 *   node scripts/capture.mjs vtbm ask   # some clips, again
 *
 * A recording is a run of viewport screenshots at 414 CSS px, scaled so each
 * frame is exactly 1080×1920, taken while the script scrolls the page on an
 * eased curve. It is sharper than a video capture and plays back at FPS_REC.
 *
 * Writes public/covers/, public/rec/<clip>/NNN.jpg and src/footage.json.
 * Needs a local Chrome or Edge.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUB = path.join(ROOT, "public");
const FOOTAGE = path.join(ROOT, "src", "footage.json");
const SITE = process.env.FILM_SITE || "https://sankettambare.in";
const SUPABASE = "https://xjqbvvurlmbslikiukdm.supabase.co";
const KEY = "sb_publishable_8FUmeJKKuTHvy3JFNPLfnQ_9TY6P2GG";
const VW = 414;
const VH = 736;
const DPR = 1080 / VW; // 414×736 CSS px → 1080×1920 frames
export const FPS_REC = 15;
export const ASK_QUESTION = "What has Sanket built for NGOs?";

const CHROME = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => p && fs.existsSync(p));

// Clip → site, length in seconds and how far it scrolls (viewport heights).
const CLIPS = {
  vtbm: { id: 23, url: "https://vtbm.in/", secs: 5, scroll: 2.2 },
  yung: { id: 6, url: "http://yungfoundationsatpuda.org/", secs: 2.5, scroll: 1.2 },
  antyodaya: { id: 11, url: "https://antyodaya-website.sanket-tambare01.workers.dev/", secs: 2.5, scroll: 1.2 },
  nisarg: { id: 9, url: "https://nisarg-shala-school-management-system.pages.dev/", secs: 2, scroll: 0.6 },
  feed: { id: 21, url: "https://after-the-feed.sankettambare.in/", secs: 3, scroll: 1.6 },
  days: { id: 22, url: "https://45-days.sankettambare.in/", secs: 2.5, scroll: 1.2 },
  dividend: { id: 18, url: "https://youth.sankettambare.in/", secs: 4.5, scroll: 2.2 },
  escape: { id: 15, url: "https://daredavil01.github.io/daredavil01/digital-wellbeing/index.html", secs: 4.5, scroll: 1.5 },
  runfolio: { id: 7, url: "https://runfolio.in/", secs: 4.5, scroll: 2.2 },
  site: { id: 2, url: `${SITE}/`, secs: 4.5, scroll: 2.5 },
  projects: { url: `${SITE}/projects`, secs: 4, scroll: 2.4 },
};

const toUrl = (u) => (!u ? null : u.startsWith("http") ? u : `${SUPABASE}/storage/v1/object/public/media${u}`);

async function projects() {
  const res = await fetch(
    `${SUPABASE}/rest/v1/projects?select=id,title,subtitle,date,category,status,org,featured,link,image,slide_images,tech_stack,tag_names&order=date.desc.nullslast`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } },
  );
  if (!res.ok) throw new Error(`projects: ${res.status}`);
  return (await res.json()).map((r) => ({
    id: r.id,
    title: r.title,
    subtitle: r.subtitle,
    date: r.date,
    category: r.category,
    status: r.status,
    org: r.org,
    featured: !!r.featured,
    link: r.link,
    tech: r.tech_stack || [],
    tags: r.tag_names || [],
    coverUrl: toUrl(r.image) || toUrl((r.slide_images || []).map((i) => i.url).find(Boolean)),
  }));
}

async function covers(list) {
  const dir = path.join(PUB, "covers");
  fs.mkdirSync(dir, { recursive: true });
  for (const p of list) { // eslint-disable-line no-restricted-syntax
    p.cover = null;
    if (!p.coverUrl) continue; // eslint-disable-line no-continue
    const res = await fetch(p.coverUrl).catch(() => null); // eslint-disable-line no-await-in-loop
    if (!res?.ok) continue; // eslint-disable-line no-continue
    const ext = (res.headers.get("content-type") || "").includes("png") ? "png" : (res.headers.get("content-type") || "").includes("webp") ? "webp" : "jpg";
    fs.writeFileSync(path.join(dir, `${p.id}.${ext}`), Buffer.from(await res.arrayBuffer())); // eslint-disable-line no-await-in-loop
    p.cover = `covers/${p.id}.${ext}`;
  }
}

const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

async function record(ctx, name, clip) {
  const dir = path.join(PUB, "rec", name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const page = await ctx.newPage();
  await page.goto(clip.url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  const span = Math.min(max, clip.scroll * VH);
  const frames = Math.round(clip.secs * FPS_REC);
  for (let i = 0; i < frames; i += 1) { // eslint-disable-line no-await-in-loop
    // Hold the first fifth still so the hero reads, then scroll.
    const k = Math.max(0, (i / (frames - 1) - 0.2) / 0.8);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), Math.round(span * easeInOut(k))); // eslint-disable-line no-await-in-loop
    await page.waitForTimeout(60); // eslint-disable-line no-await-in-loop
    await page.screenshot({ path: path.join(dir, `${String(i).padStart(3, "0")}.jpg`), type: "jpeg", quality: 82 }); // eslint-disable-line no-await-in-loop
  }
  await page.close();
  console.info(`  ${name}  ${frames} frames`);
  return { frames, id: clip.id ?? null, url: clip.url };
}

// /ask, typed and answered for real. Frames land every ~120 ms of wall time;
// their timestamps go in footage.json so the film can replay at true pace.
async function ask(ctx) {
  const dir = path.join(PUB, "rec", "ask");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const page = await ctx.newPage();
  await page.goto(`${SITE}/ask`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const box = page.locator("textarea").first();
  const times = [];
  const t0 = Date.now();
  const shot = async () => {
    await page.screenshot({ path: path.join(dir, `${String(times.length).padStart(3, "0")}.jpg`), type: "jpeg", quality: 82 });
    times.push((Date.now() - t0) / 1000);
  };
  await shot();
  for (const ch of ASK_QUESTION) { // eslint-disable-line no-restricted-syntax
    await box.type(ch); // eslint-disable-line no-await-in-loop
    await shot(); // eslint-disable-line no-await-in-loop
  }
  const typed = times.length;
  await box.press("Enter");
  while (Date.now() - t0 < 26000) await shot(); // eslint-disable-line no-await-in-loop
  await page.close();
  // The answer has settled at the last frame whose file size still moved.
  let settled = 0;
  let prev = 0;
  times.forEach((_, i) => {
    const size = fs.statSync(path.join(dir, `${String(i).padStart(3, "0")}.jpg`)).size;
    if (Math.abs(size - prev) > 200) settled = i;
    prev = size;
  });
  console.info(`  ask  ${times.length} frames, settled at ${settled}`);
  return { frames: times.length, typed, settled, times, question: ASK_QUESTION };
}

async function main() {
  if (!CHROME) throw new Error("No Chrome or Edge found.");
  const only = process.argv.slice(2);
  const want = (k) => !only.length || only.includes(k);
  const out = fs.existsSync(FOOTAGE) ? JSON.parse(fs.readFileSync(FOOTAGE, "utf8")) : { clips: {} };
  out.site = SITE;
  out.fpsRec = FPS_REC;
  out.captured = new Date().toISOString().slice(0, 10);

  if (want("data")) {
    out.projects = await projects();
    await covers(out.projects);
    console.info(`  ${out.projects.length} projects`);
  }

  const browser = await chromium.launch({ executablePath: CHROME });
  const ctx = await browser.newContext({
    viewport: { width: VW, height: VH },
    deviceScaleFactor: DPR,
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
    timezoneId: "Asia/Kolkata",
  });
  await ctx.addInitScript(() => {
    localStorage.setItem("site-tour-seen", "true");
    localStorage.setItem("site-tour-prompt-dismissed", "true");
  });
  for (const [name, clip] of Object.entries(CLIPS)) { // eslint-disable-line no-restricted-syntax
    if (want(name)) out.clips[name] = await record(ctx, name, clip); // eslint-disable-line no-await-in-loop
  }
  if (want("ask")) out.ask = await ask(ctx);
  await browser.close();

  fs.writeFileSync(FOOTAGE, JSON.stringify(out, null, 1));
  console.info("  footage.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
