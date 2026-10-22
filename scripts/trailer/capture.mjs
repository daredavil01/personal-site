#!/usr/bin/env node
/**
 * Step 1 of the trailer: phone-sized screenshots of the live site, the
 * footage the trailer's phone frames scroll through.
 *
 *   node scripts/trailer/capture.mjs            # every shot
 *   node scripts/trailer/capture.mjs ask treks  # some shots
 *
 * Writes knowledge_base/trailer/shots/<name>.jpg (gitignored). Each is a
 * full-page capture, capped in height, at 414 CSS px × 2.
 *
 * Needs playwright-core (npm i --no-save playwright-core) and a local
 * Chrome or Edge; no browser download.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "knowledge_base", "trailer", "shots");
const SITE = process.env.TRAILER_SITE || "https://sankettambare.in";
const MAX_H = 5200;

// time: "day" pins the Atlas palette so every shot matches. Classic is the
// default shell, so the Atlas shots ask for it.
const world = (extra = {}) => ({
  version: 1, view: null, sound: false, time: "day", introSeen: true, visitedRegions: {}, stamps: {},
  actions: {}, quests: {}, eggs: {}, visitDays: [], guide: {}, ...extra,
});

export const SHOTS = [
  { name: "orbit", path: "/", state: world({ view: "atlas", introSeen: false }), wait: 6000, full: false },
  { name: "map", path: "/", state: world({ view: "atlas" }), wait: 5000, full: false },
  { name: "map-night", path: "/", state: world({ view: "atlas", time: "night" }), wait: 5000, full: false },
  { name: "ask", path: "/ask", wait: 3500, ask: true },
  { name: "logbook", path: "/logbook", wait: 6000 },
  { name: "treks", path: "/treks", wait: 4000 },
  { name: "sports", path: "/sports", wait: 4000 },
  { name: "books", path: "/books", wait: 4000 },
  { name: "projects", path: "/projects", wait: 4000 },
  { name: "stats", path: "/stats", wait: 5000 },
  { name: "micro-blog", path: "/micro-blog", wait: 5000 },
  { name: "tags", path: "/tags", wait: 4000 },
  { name: "newsletter", path: "/newsletter", wait: 4000 },
  { name: "blueprint", path: "/blueprint", wait: 5000 },
  { name: "changelog-graph", path: "/changelog/graph", wait: 5000 },
  { name: "mindmap", path: "/mindmap", wait: 4000, full: false },
  { name: "home", path: "/", wait: 6000 },
  { name: "treks-atlas", path: "/treks", state: world({ view: "atlas" }), wait: 5000, full: false },
];

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => fs.existsSync(p));

async function shoot(browser, shot) {
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    timezoneId: "Asia/Kolkata",
  });
  const state = shot.state || world();
  await ctx.addInitScript((s) => {
    localStorage.setItem("atlas.v1", JSON.stringify(s));
    localStorage.setItem("site-tour-seen", "true");
    localStorage.setItem("site-tour-prompt-dismissed", "true");
  }, state);
  const page = await ctx.newPage();
  await page.goto(SITE + shot.path, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(shot.wait);
  if (shot.ask) {
    // One real question, so the shot shows a real answer with its sources.
    const box = page.locator("textarea, input[type=text]").first();
    await box.fill("Which was the hardest fort trek, and what did he write about it?");
    await box.press("Enter");
    await page.waitForTimeout(22000);
  }
  if (shot.full !== false) {
    // Walk the page so lazy images and scroll-reveals load, then back to top.
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < Math.min(h, MAX_H); y += 600) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(250);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
  }
  const height = shot.full === false ? 896
    : Math.min(MAX_H, await page.evaluate(() => document.documentElement.scrollHeight));
  await page.screenshot({
    path: path.join(OUT, `${shot.name}.jpg`), type: "jpeg", quality: 88,
    fullPage: shot.full !== false, clip: shot.full === false ? undefined : { x: 0, y: 0, width: 414, height },
  });
  await ctx.close();
  console.info(`  ${shot.name}  ${height}px`);
}

async function main() {
  if (!CHROME) throw new Error("No Chrome or Edge found.");
  fs.mkdirSync(OUT, { recursive: true });
  const want = process.argv.slice(2);
  const shots = want.length ? SHOTS.filter((s) => want.includes(s.name)) : SHOTS;
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  for (const shot of shots) { // eslint-disable-line no-restricted-syntax
    // eslint-disable-next-line no-await-in-loop -- one page at a time keeps the site's quotas polite
    await shoot(browser, shot).catch((err) => console.warn(`  ! ${shot.name}: ${err.message}`));
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
