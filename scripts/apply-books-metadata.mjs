#!/usr/bin/env node
/**
 * Apply hand-filled book metadata from scripts/books-metadata-fill.json.
 *
 * The API-driven backfill (backfill-books-metadata.mjs) cannot reach most
 * Marathi titles — no book API indexes them — so this is the manual path for
 * whatever is left.
 *
 * Usage:
 *   1. npm run books:template            # regenerate the JSON from what is
 *                                        # still missing in the database
 *   2. Fill in the blanks in scripts/books-metadata-fill.json.
 *   3. npm run books:apply -- --dry-run  # see exactly what would change
 *      npm run books:apply               # write it
 *
 * Rules:
 *   - Keys starting with "_" are context for you and are ignored.
 *   - Blank strings and nulls are skipped, so a half-filled file is fine and
 *     can be run repeatedly as you fill more in.
 *   - Values you provide WIN over what is already in the database — this is
 *     you correcting the robot, so it overwrites (unlike the API backfill,
 *     which only ever fills gaps).
 *   - cover_url may be any public image URL. It is downloaded and re-uploaded
 *     into the `media` bucket rather than hotlinked, the same as the API path.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILL_FILE = path.join(ROOT, "scripts", "books-metadata-fill.json");
const BUCKET = "media";
const FOLDER = "books";
const DRY_RUN = process.argv.includes("--dry-run");
const MAX_COVER_BYTES = 300 * 1024;
const MIN_COVER_BYTES = 8 * 1024;

// Only these columns may be set from the file. Anything else is a typo, and a
// typo should be loud rather than silently ignored.
const ALLOWED = new Set([
  "cover_url",
  "isbn",
  "page_count",
  "publisher",
  "first_published",
  "quote",
  "note",
  "format",
  "rating",
  "date_finished",
  "date_precision",
  "translator",
  "language",
  "category",
  "status",
]);
const NUMERIC = new Set(["page_count", "first_published", "rating"]);

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]])
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Fill .env.");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const filled = (v) => v !== null && v !== undefined && String(v).trim() !== "";

async function uploadCover(id, url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`cover fetch ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < MIN_COVER_BYTES)
    throw new Error(`cover only ${bytes.length}B — looks like a placeholder`);
  if (bytes.length > MAX_COVER_BYTES)
    throw new Error(
      `cover ${Math.round(bytes.length / 1024)}KB exceeds the 300KB cap — resize it first`,
    );

  const contentType =
    res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const ext = contentType.includes("png") ? "png" : "jpg";
  const objectPath = `${FOLDER}/${id}.${ext}`;
  if (DRY_RUN)
    return `${objectPath} (${Math.round(bytes.length / 1024)}KB, not uploaded)`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, bytes, { contentType, upsert: true });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

async function main() {
  if (!fs.existsSync(FILL_FILE)) {
    console.error(
      `No ${path.relative(ROOT, FILL_FILE)}. Run: npm run books:template`,
    );
    process.exit(1);
  }
  const fill = JSON.parse(fs.readFileSync(FILL_FILE, "utf8"));
  console.log(
    DRY_RUN ? "DRY RUN — nothing will be written.\n" : "Writing to Supabase.\n",
  );

  let changed = 0;
  let empty = 0;

  for (const [id, entry] of Object.entries(fill)) {
    const patch = {};
    for (const [key, value] of Object.entries(entry)) {
      if (key.startsWith("_")) continue;
      if (!ALLOWED.has(key)) {
        console.log(`[${id}] unknown field "${key}" — ignored`);
        continue;
      }
      if (!filled(value)) continue;
      patch[key] = NUMERIC.has(key) ? Number(value) : String(value).trim();
    }

    if (!Object.keys(patch).length) {
      empty += 1;
      continue;
    }

    console.log(`[${id}] ${entry._title ?? ""}`);

    if (patch.cover_url) {
      try {
        patch.cover_url = await uploadCover(id, patch.cover_url);
        console.log(`      cover → ${patch.cover_url}`);
      } catch (e) {
        console.log(`      ✗ cover skipped: ${e.message}`);
        delete patch.cover_url;
      }
    }
    if (!Object.keys(patch).length) continue;

    if (DRY_RUN) {
      console.log("      would write:", JSON.stringify(patch));
    } else {
      const { error } = await supabase
        .from("books")
        .update(patch)
        .eq("id", Number(id));
      if (error) {
        console.error(`      ✗ ${error.message}`);
        continue;
      }
      console.log(`      ✓ ${Object.keys(patch).join(", ")}`);
    }
    changed += 1;
  }

  console.log(`\n${changed} book(s) updated, ${empty} left blank.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
