#!/usr/bin/env node
/**
 * Generate scripts/books-metadata-fill.json — one entry per book that is still
 * missing bibliographic metadata, listing only the fields that are actually
 * blank so there is nothing to read past.
 *
 * Usage: npm run books:template
 *
 * Safe to re-run: it rewrites the file from the current state of the database,
 * so anything you have already applied drops out of the next template.
 * Re-running DOES discard values you typed but have not applied yet — apply
 * first (npm run books:apply), then regenerate.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "scripts", "books-metadata-fill.json");

// The fields worth asking a human for, and the placeholder each gets.
const WANTED = {
  cover_url: "",
  isbn: "",
  page_count: null,
  publisher: "",
  first_published: null,
};

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Fill .env.");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const { data: books, error } = await supabase
  .from("books")
  .select("id, title, author, language, year, cover_url, isbn, page_count, publisher, first_published")
  .order("id");
if (error) { console.error(error); process.exit(1); }

const out = {};
let count = 0;

for (const b of books) {
  const missing = Object.keys(WANTED).filter((k) => !b[k]);
  if (!missing.length) continue;
  count += 1;
  out[b.id] = {
    // Underscore keys are context for you; the apply script ignores them.
    _title: (b.title ?? "").trim(),
    _author: (b.author ?? "").replace(/\s+/g, " ").trim(),
    _language: b.language,
    _read: b.year,
    ...Object.fromEntries(missing.map((k) => [k, WANTED[k]])),
  };
}

fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log(`${count} book(s) still missing something → ${path.relative(ROOT, OUT)}`);
console.log("Fill the blanks, then: npm run books:apply -- --dry-run");
