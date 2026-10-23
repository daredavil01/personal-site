#!/usr/bin/env node
// Weekly text backup of the Supabase content store into a private R2 bucket.
//
//   npm run backup                 dump every table below, gzip, upload
//   npm run backup -- --dry-run    print row counts only, upload nothing
//
// One file per run: text/<YYYY-MM-DD>.json.gz holding
// { taken_at, tables: { <name>: rows[] } }. Text only — no Storage images, and
// no content_chunks (embeddings, rebuilt by `npm run ask:index`), ask_usage /
// ask_eval_usage (counters) or repo_commits (rebuilt from git by repo:sync).
//
// Uploaded with wrangler (already a devDependency), so no S3 client is needed.
// Needs SUPABASE_SERVICE_ROLE_KEY plus CF_ACCOUNT_ID / CF_API_TOKEN (the token
// with R2 write), and R2_BACKUP_BUCKET (default "personal-website-backups").
// Restore steps: docs/backups.md.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { makeClient } from "./build-docs.mjs";

const DRY_RUN = process.argv.includes("--dry-run");
const PAGE = 1000;
const BUCKET = process.env.R2_BACKUP_BUCKET || "personal-website-backups";

// Table → the columns that order it stably for paging (its primary key).
const TABLES = {
  books: ["id"],
  sports: ["id"],
  treks: ["id"],
  projects: ["id"],
  blogs: ["id"],
  instagram: ["id"],
  microblog: ["id"],
  presentations: ["id"],
  videos: ["id"],
  now_meta: ["id"],
  now_months: ["id"],
  resume_positions: ["id"],
  resume_degrees: ["id"],
  resume_certifications: ["id"],
  resume_skills: ["id"],
  tags: ["id"],
  tag_associations: ["entity_type", "entity_id", "tag_id"],
  ask_settings: ["id"],
  newsletter_feedback: ["id"],
  ask_conversations: ["id"],
  ask_messages: ["id"],
  ask_shares: ["id"],
  changelog: ["id"],
  changelog_majors: ["major"],
  social_kits: ["id"],
};

// PostgREST caps an unbounded select at 1000 rows, so every table is paged.
async function fetchAll(supabase, table, keys) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase.from(table).select("*");
    keys.forEach((k) => { query = query.order(k, { ascending: true }); });
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

function upload(file, key) {
  const env = {
    ...process.env,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN,
  };
  const res = spawnSync(
    "npx",
    ["wrangler", "r2", "object", "put", `${BUCKET}/${key}`, "--file", file,
      "--content-type", "application/gzip", "--remote"],
    { stdio: "inherit", env, shell: process.platform === "win32" },
  );
  if (res.status !== 0) throw new Error(`wrangler exited with ${res.status}`);
}

async function main() {
  const supabase = makeClient();
  const tables = {};
  // Any table that fails fails the run: a partial backup must not pass for a whole one.
  for (const [table, keys] of Object.entries(TABLES)) {
    // eslint-disable-next-line no-await-in-loop
    tables[table] = await fetchAll(supabase, table, keys);
    console.log(`${table.padEnd(24)} ${tables[table].length}`);
  }

  const takenAt = new Date().toISOString();
  const gz = zlib.gzipSync(JSON.stringify({ taken_at: takenAt, tables }));
  const key = `text/${takenAt.slice(0, 10)}.json.gz`;
  console.log(`\n${key}: ${(gz.length / 1024).toFixed(0)} KB gzipped`);
  if (DRY_RUN) return;

  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "backup-")), "backup.json.gz");
  fs.writeFileSync(file, gz);
  upload(file, key);
  console.log(`Uploaded to r2://${BUCKET}/${key}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
