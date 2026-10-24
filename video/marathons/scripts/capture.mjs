#!/usr/bin/env node
/**
 * Footage for the marathons film: desktop screenshots of the live /sports page
 * in every state the film shows, the element boxes the film's camera and
 * cursor aim at, one photo per race, and the race data itself.
 *
 *   node scripts/capture.mjs
 *
 * Writes public/shots/*.jpg, public/photos/*.jpg and src/footage.json.
 * Uses the site's playwright-core and a local Chrome or Edge.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "public", "shots");
const PHOTOS = path.join(ROOT, "public", "photos");
const SITE = process.env.FILM_SITE || "https://sankettambare.in";
const SUPABASE = "https://xjqbvvurlmbslikiukdm.supabase.co";
const KEY = "sb_publishable_8FUmeJKKuTHvy3JFNPLfnQ_9TY6P2GG";
const W = 1440;
const H = 810;
const DPR = 2;
const MAX_H = 5600;

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => fs.existsSync(p));

const toUrl = (u) => (u.startsWith("http") ? u : `${SUPABASE}/storage/v1/object/public/media${u}`);

async function races() {
  const res = await fetch(`${SUPABASE}/rest/v1/sports?select=id,title,date,place,distance,time,slide_images`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  const rows = await res.json();
  return rows
    .map((r) => ({
      id: r.id, title: r.title, date: r.date, place: r.place.trim(), distance: r.distance, time: r.time,
      images: (r.slide_images || []).map((i) => i.url).filter(Boolean).map(toUrl),
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

async function photos(list) {
  for (const r of list) { // eslint-disable-line no-restricted-syntax
    if (!r.images.length) continue; // eslint-disable-line no-continue
    const file = `${r.id}.jpg`;
    // eslint-disable-next-line no-await-in-loop
    const res = await fetch(r.images[0]);
    // eslint-disable-next-line no-await-in-loop
    if (res.ok) fs.writeFileSync(path.join(PHOTOS, file), Buffer.from(await res.arrayBuffer()));
    r.photo = res.ok ? `photos/${file}` : null;
  }
}

// Boxes in CSS px, page coordinates.
const boxes = (page, selector, withText = true) => page.$$eval(selector, (els, t) => els.map((el) => {
  const r = el.getBoundingClientRect();
  return { x: r.x + window.scrollX, y: r.y + window.scrollY, w: r.width, h: r.height, text: t ? el.innerText.slice(0, 80) : undefined };
}), withText);

async function walk(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < Math.min(h, MAX_H); y += 500) { // eslint-disable-line no-await-in-loop
    await page.evaluate((v) => window.scrollTo(0, v), y); // eslint-disable-line no-await-in-loop
    await page.waitForTimeout(200); // eslint-disable-line no-await-in-loop
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
  return Math.min(MAX_H, h);
}

async function full(page, name) {
  const height = await walk(page);
  await page.screenshot({ path: path.join(SHOTS, `${name}.jpg`), type: "jpeg", quality: 90, fullPage: true, clip: { x: 0, y: 0, width: W, height } });
  console.info(`  ${name}  ${height}px`);
  return height;
}

async function view(page, name) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.jpg`), type: "jpeg", quality: 90 });
  console.info(`  ${name}`);
}

async function main() {
  if (!CHROME) throw new Error("No Chrome or Edge found.");
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.mkdirSync(PHOTOS, { recursive: true });
  const list = await races();
  await photos(list);

  const browser = await chromium.launch({ executablePath: CHROME });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, colorScheme: "light", timezoneId: "Asia/Kolkata" });
  await ctx.addInitScript(() => {
    localStorage.setItem("site-tour-seen", "true");
    localStorage.setItem("site-tour-prompt-dismissed", "true");
  });
  const page = await ctx.newPage();
  const go = async (q) => {
    await page.goto(`${SITE}/sports${q}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(3000);
  };
  const out = { site: SITE, width: W, dpr: DPR, viewportH: H, races: list, shots: {} };

  // Statistics (the page's default view).
  await go("");
  await view(page, "hero");
  out.shots.stats = {
    height: await full(page, "stats"),
    tabs: await boxes(page, "button.rounded-lg.font-label"),
    big: await boxes(page, ".font-headline.text-5xl"),
    cards: await page.$$eval("h3", (els) => els.map((h) => {
      const r = h.closest(".rounded-xl").getBoundingClientRect();
      return { x: r.x + window.scrollX, y: r.y + window.scrollY, w: r.width, h: r.height, text: h.innerText };
    })),
    sub: await boxes(page, ".grid.grid-cols-2.md\\:grid-cols-4 > div"),
  };

  // Interactive: distance groups, then one race opened with its slider.
  await go("?view=interactive");
  out.shots.interactive = {
    height: await full(page, "interactive"),
    groups: await boxes(page, "h3"),
    cards: await boxes(page, "div.group.cursor-pointer"),
  };
  const card = page.locator("div.group.cursor-pointer").first();
  await card.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -120));
  await page.waitForTimeout(600);
  const scrollY = await page.evaluate(() => window.scrollY);
  await view(page, "modal-before");
  const cardBox = await card.boundingBox();
  await card.click();
  await page.waitForTimeout(2500);
  // Hold the slider still: react-slideshow autoplays.
  await view(page, "modal-1");
  const next = page.locator(".react-slideshow-container .nav").last();
  const nextBox = await next.boundingBox().catch(() => null);
  for (let i = 2; i <= 3; i += 1) { // eslint-disable-line no-await-in-loop
    await next.click().catch(() => {}); // eslint-disable-line no-await-in-loop
    await page.waitForTimeout(1500); // eslint-disable-line no-await-in-loop
    await view(page, `modal-${i}`); // eslint-disable-line no-await-in-loop
  }
  out.shots.modal = { scrollY, card: cardBox, next: nextBox, title: await page.locator("h2").first().innerText() };

  // Default view, then each filter state.
  const states = [
    ["default", "?view=default"],
    ["filter-21", "?view=default&distance=21"],
    ["filter-21-hyd", "?view=default&distance=21&place=Hyderabad"],
    ["filter-21-hyd-2025", "?view=default&distance=21&place=Hyderabad&year=2025"],
    ["filter-50", "?view=default&distance=50"],
  ];
  out.shots.default = {};
  for (const [name, q] of states) { // eslint-disable-line no-restricted-syntax
    await go(q); // eslint-disable-line no-await-in-loop
    out.shots.default[name] = {
      height: await full(page, name), // eslint-disable-line no-await-in-loop
      selects: await boxes(page, "select"), // eslint-disable-line no-await-in-loop
      options: await page.$$eval("select", (els) => els.map((s) => [...s.options].map((o) => o.text))), // eslint-disable-line no-await-in-loop
      rows: await boxes(page, "[class*='cursor-pointer']"), // eslint-disable-line no-await-in-loop
    };
  }

  await browser.close();
  fs.writeFileSync(path.join(ROOT, "src", "footage.json"), JSON.stringify(out, null, 1));
  console.info("  footage.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
