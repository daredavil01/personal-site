// The /books film's numbers, read live from the public `books` table and
// reduced with the page's own model (src/lib/bookShelf.js) through Vite's SSR
// loader — so a spine in the film has the width, height and cloth it has on
// the page, and every number is the one the hero prints.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function env(name) {
  if (process.env[name]) return process.env[name];
  const toml = fs.readFileSync(path.join(ROOT, "wrangler.toml"), "utf8");
  const m = new RegExp(`^\\s*${name}\\s*=\\s*"([^"]+)"`, "m").exec(toml);
  return m ? m[1] : null;
}

async function rest(query) {
  const url = env("VITE_SUPABASE_URL");
  const key = env("VITE_SUPABASE_PUBLISHABLE_KEY");
  const res = await fetch(`${url}/rest/v1/${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

async function shelfModule() {
  const vite = await createServer({
    root: ROOT,
    logLevel: "error",
    appType: "custom",
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    return await vite.ssrLoadModule("/src/lib/bookShelf.js");
  } finally {
    await vite.close();
  }
}

export async function loadFilmData() {
  const rows = await rest("books?select=id,title,author,category,language,year,date_finished,page_count,first_published,blog_link,quote,translator&order=id");
  const shelf = await shelfModule();
  const facts = shelf.libraryFacts(rows);
  // The shelf in reading order, newest first — the page's default.
  const ordered = shelf.arrangeShelf(rows, "year").flatMap((bay) => bay.books);
  const spine = (b) => {
    const s = shelf.spineOf(b);
    return {
      id: b.id,
      title: b.title.trim(),
      author: (b.author || "").trim(),
      category: b.category,
      pages: b.page_count || null,
      w: s.w,
      h: s.h,
      cloth: s.cloth,
      style: s.style,
      shade: s.shade,
      marathi: s.marathi,
      reviewed: s.reviewed,
      quoted: s.quoted,
    };
  };
  const books = ordered.map(spine);
  // The book the anatomy scene holds up: the newest English one that carries
  // every mark a spine can wear (a review and a kept line), else the newest.
  const hero = books.find((b) => b.reviewed && b.quoted && !b.marathi && b.w >= 36)
    || books.find((b) => b.reviewed && b.quoted) || books[0];
  const subjects = [...new Set(rows.map((b) => b.category).filter(Boolean))]
    .map((name) => ({ name, cloth: shelf.clothFor(name), count: rows.filter((b) => b.category === name).length }))
    .sort((a, b) => b.count - a.count);
  return {
    books,
    hero,
    subjects,
    arrangements: shelf.ARRANGEMENTS.map((a) => a.label),
    facts: {
      total: facts.total,
      pages: facts.pages,
      stackCm: facts.stackCm,
      stack: shelf.formatStack(facts.stackCm),
      marathi: facts.marathi,
      english: facts.english,
      reviewed: facts.reviewed,
      quoted: facts.quoted,
      firstYear: facts.firstYear,
      lastYear: facts.lastYear,
    },
  };
}
