#!/usr/bin/env node
/**
 * One-time importer: src/cms-content/**.md (canonical markdown) → Supabase.
 *
 * Reads the same markdown the old `cms:sync` reads and inserts it into the
 * Postgres tables created by supabase/migrations/0001_initial_schema.sql.
 * Uses the SERVICE ROLE key (bypasses RLS) — run locally only, never ship it.
 *
 * Usage:
 *   1. Fill .env with SUPABASE_URL (or VITE_SUPABASE_URL) and
 *      SUPABASE_SERVICE_ROLE_KEY.
 *   2. npm run data:import
 *
 * Re-runnable: each table is cleared then re-inserted. IDs are reassigned by
 * Postgres in markdown order, so display ordering is preserved.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// --- minimal .env loader (so the script works without --env-file) ----------
function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
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

const SECTION_KEYS = [
  "blogs", "running", "books", "events", "projects",
  "stats", "website", "certificates", "misc",
];

// --- helpers ---------------------------------------------------------------
function readDir(rel) {
  const dir = path.join(ROOT, rel);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      return match ? YAML.parse(match[1]) : null;
    })
    .filter(Boolean);
}

const byId = (a, b) => (a.id ?? 0) - (b.id ?? 0);
const str = (v) => (v == null ? null : String(v));

async function replaceTable(table, rows) {
  const del = await supabase.from(table).delete().gte("id", 0);
  if (del.error) throw new Error(`${table} clear: ${del.error.message}`);
  if (rows.length === 0) {
    console.log(`  • ${table}: nothing to import`);
    return;
  }
  const { error } = await supabase.from(table).insert(rows);
  if (error) throw new Error(`${table} insert: ${error.message}`);
  console.log(`  ✓ ${table}: ${rows.length} rows`);
}

// --- per-entity transforms -------------------------------------------------
async function importAll() {
  await replaceTable(
    "books",
    readDir("src/cms-content/books").sort(byId).map((b) => ({
      title: b.title,
      author: b.author,
      category: b.category,
      language: b.language,
      description: b.description,
      year: Number(b.year),
      tags: b.tags ?? [],
      translator: b.translator || null,
      blog_link: b.blog_link || null,
      blog_platform: b.blog_platform || null,
    })),
  );

  await replaceTable(
    "sports",
    readDir("src/cms-content/sports").sort(byId).map((s) => ({
      title: s.title,
      date: s.date,
      description: s.description,
      place: s.place,
      distance: s.distance,
      time: s.time,
      time_certificate_link: s.timeCertificateLink || null,
      bib_number: str(s.bibNumber),
      slide_images: s.slideImages ?? [],
    })),
  );

  await replaceTable(
    "treks",
    readDir("src/cms-content/treks").sort(byId).map((t) => ({
      fort_name: t.fort_name,
      trek_time: t.trek_time,
      endurance_level: t.endurance_level,
      date: t.date,
      blog_link: t.blog_link || null,
      slide_images: t.slideImages ?? [],
    })),
  );

  await replaceTable(
    "projects",
    readDir("src/cms-content/projects").map((p, i) => ({
      title: p.title,
      subtitle: p.subtitle || null,
      link: p.link,
      image: p.image,
      date: str(p.date),
      description: p.desc,
      sort_order: i,
    })),
  );

  await replaceTable(
    "blogs",
    readDir("src/cms-content/100days").sort(byId).map((b) => ({
      blog_title: b.blog_title,
      blog_description: b.blog_description,
      challenge_id: b.challenge_id || "100_days_to_offload",
      blog_tags: b.blog_tags ?? [],
      blog_date: str(b.blog_date),
      blog_link: b.blog_link,
      blog_platform: b.blog_platform,
      language: b.language,
    })),
  );

  await replaceTable(
    "instagram",
    readDir("src/cms-content/instagram").sort(byId).map((p) => ({
      title: p.title,
      caption: p.caption,
      tags: p.tags ?? [],
      slide_images: p.slideImages ?? [],
    })),
  );

  await replaceTable(
    "resume_positions",
    readDir("src/cms-content/resume/positions").map((p, i) => ({
      company: p.company,
      position: p.position,
      link: p.link,
      daterange: p.daterange,
      points: p.points ?? [],
      sort_order: i,
    })),
  );

  await replaceTable(
    "resume_degrees",
    readDir("src/cms-content/resume/degrees").map((d, i) => ({
      school: d.school,
      degree: d.degree,
      link: d.link,
      year: Number(d.year),
      sort_order: i,
    })),
  );

  await replaceTable(
    "resume_certifications",
    readDir("src/cms-content/resume/certifications").map((c, i) => ({
      name: c.name,
      link: c.link,
      source: c.source,
      issued_date: c.issuedDate,
      sort_order: i,
    })),
  );

  await replaceTable(
    "resume_skills",
    readDir("src/cms-content/resume/skills").map((s, i) => ({
      title: s.title,
      competency: Number(s.competency),
      category: s.category ?? [],
      sort_order: i,
    })),
  );

  // Now page — months
  await replaceTable(
    "now_months",
    readDir("src/cms-content/now/months").map((m) => {
      const sections = {};
      SECTION_KEYS.forEach((k) => {
        if (m[k] !== undefined) sections[k] = m[k];
      });
      return {
        month: m.month,
        year: Number(m.year),
        is_current: !!m.isCurrent,
        sections,
      };
    }),
  );

  // Now page — meta (single row)
  const metaPath = path.join(ROOT, "src/cms-content/now/meta.md");
  if (fs.existsSync(metaPath)) {
    const match = fs
      .readFileSync(metaPath, "utf8")
      .match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const meta = match ? YAML.parse(match[1]) : {};
    const { error } = await supabase.from("now_meta").upsert({
      id: 1,
      intro_story: meta.introStory ?? "",
      category_labels: meta.categoryLabels ?? [],
      nownownow_url: meta.nownownowUrl ?? "",
      inspired_by: meta.inspiredBy ?? null,
      daily_rituals: meta.dailyRituals ?? [],
    });
    if (error) throw new Error(`now_meta: ${error.message}`);
    console.log("  ✓ now_meta: 1 row");
  }
}

console.log("\nImporting markdown → Supabase\n");
importAll()
  .then(() => console.log("\nDone.\n"))
  .catch((err) => {
    console.error(`\nImport failed: ${err.message}\n`);
    process.exit(1);
  });
