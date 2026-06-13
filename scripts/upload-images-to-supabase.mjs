#!/usr/bin/env node
/**
 * One-time bulk upload: public/images/** → Supabase Storage (media bucket).
 *
 * Preserves the same subfolder structure inside the bucket so existing URLs
 * can be updated from `/images/sports/foo.jpg` to the Supabase public URL.
 *
 * Usage:
 *   1. Fill .env with SUPABASE_URL (or VITE_SUPABASE_URL) and
 *      SUPABASE_SERVICE_ROLE_KEY.
 *   2. npm run images:upload
 *
 * Re-runnable: uses upsert: true so already-uploaded files are overwritten.
 * Skips: favicon/, *.ico, *.xml, *.json, *.svg (not content images).
 *
 * After upload, each file's public URL is:
 *   https://<project>.supabase.co/storage/v1/object/public/media/images/<subfolder>/<file>
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMAGES_DIR = path.join(ROOT, "public", "images");
const BUCKET = "media";

// Folders to skip entirely
const SKIP_DIRS = new Set(["favicon"]);
// Extensions to upload (lowercase check)
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

// --- minimal .env loader ----------------------------------------------------
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
  console.error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Fill .env (see .env.example).",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// --- collect all image files -------------------------------------------------
function collectFiles(dir, base = "") {
  const results = [];
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const relPath = base ? `${base}/${entry}` : entry;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) results.push(...collectFiles(fullPath, relPath));
    } else {
      const ext = path.extname(entry).toLowerCase();
      if (IMAGE_EXTS.has(ext)) results.push({ fullPath, relPath });
    }
  }
  return results;
}

// --- upload ------------------------------------------------------------------
async function uploadAll() {
  const files = collectFiles(IMAGES_DIR);
  console.log(`\nUploading ${files.length} images → Supabase Storage (${BUCKET} bucket)\n`);

  let ok = 0;
  let fail = 0;

  for (const { fullPath, relPath } of files) {
    const bucketPath = `images/${relPath.replace(/\\/g, "/")}`;
    const ext = path.extname(relPath).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    const buffer = fs.readFileSync(fullPath);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(bucketPath, buffer, { contentType, upsert: true });

    if (error) {
      console.error(`  ✗ ${bucketPath}  —  ${error.message}`);
      fail++;
    } else {
      console.log(`  ✓ ${bucketPath}`);
      ok++;
    }
  }

  const base = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/images/`;
  console.log(`\n${"─".repeat(60)}`);
  console.log(`Done.  ${ok} uploaded  |  ${fail} failed`);
  if (ok > 0) {
    console.log(`\nPublic URL pattern:\n  ${base}<subfolder>/<filename>`);
    console.log(`\nExample:\n  ${base}sports/tum_2025_1.jpeg`);
  }
  if (fail > 0) process.exit(1);
}

uploadAll().catch((err) => {
  console.error(`\nFatal: ${err.message}\n`);
  process.exit(1);
});
