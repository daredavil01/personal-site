// Screenshots of /training at phone size for the film's "two ways in" scene:
// the atlas story and the classic tabs, from a local Vite server reading the
// live table. Run by render.mjs when they are missing, or with --capture.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { createRequire } from "node:module";

// Playwright is not a dependency here: a CommonJS require finds the copy on
// NODE_PATH (an ESM import would not look there).
const { chromium } = createRequire(import.meta.url)("playwright");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHROME = process.env.CHROME_PATH || (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

// The page reads the publishable key from VITE_*; wrangler.toml holds it.
function loadVars() {
  const toml = fs.readFileSync(path.join(ROOT, "wrangler.toml"), "utf8");
  ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY"].forEach((k) => {
    const m = new RegExp(`^\\s*${k}\\s*=\\s*"([^"]+)"`, "m").exec(toml);
    if (m && !process.env[k]) process.env[k] = m[1];
  });
}

const SHOTS = [
  // name, query, how far to scroll before the shot, height to keep
  { name: "atlas", query: "view=atlas" },
  { name: "classic", query: "view=classic" },
];

export async function capture(dir) {
  loadVars();
  fs.mkdirSync(dir, { recursive: true });
  const vite = await createServer({ root: ROOT, logLevel: "error", server: { port: 5191, strictPort: false } });
  await vite.listen();
  const base = vite.resolvedUrls.local[0].replace(/\/$/, "");
  const browser = await chromium.launch({ executablePath: CHROME });
  try {
    for (const s of SHOTS) {
      // eslint-disable-next-line no-await-in-loop
      const page = await browser.newPage({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, colorScheme: "dark" });
      // eslint-disable-next-line no-await-in-loop
      await page.goto(`${base}/training?${s.query}`, { waitUntil: "networkidle" });
      // Scroll the whole page once so every chapter has played its entrance.
      // eslint-disable-next-line no-await-in-loop
      await page.evaluate(async () => {
        for (let y = 0; y < Math.min(document.body.scrollHeight, 9000); y += 400) {
          window.scrollTo(0, y);
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => { setTimeout(r, 180); });
        }
        window.scrollTo(0, 0);
      });
      // eslint-disable-next-line no-await-in-loop
      await page.waitForTimeout(2500);
      // eslint-disable-next-line no-await-in-loop
      const height = await page.evaluate(() => Math.min(document.body.scrollHeight, 3600));
      // eslint-disable-next-line no-await-in-loop
      await page.screenshot({
        path: path.join(dir, `shot-${s.name}.jpg`), type: "jpeg", quality: 82, fullPage: true, clip: { x: 0, y: 0, width: 414, height },
      });
      console.log(`  shot-${s.name}.jpg (${height}px)`);
      // eslint-disable-next-line no-await-in-loop
      await page.close();
    }
  } finally {
    await browser.close();
    await vite.close();
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  capture(path.join(ROOT, "knowledge_base", "training-film", "public")).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
