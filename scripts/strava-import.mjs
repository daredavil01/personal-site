#!/usr/bin/env node
/**
 * Strava bulk export → Supabase /training tables. No Strava API: since June
 * 2026 that needs a paid subscription. See docs/strava.md.
 *
 * 1. strava.com → Settings → My Account → "Download or Delete Your Account"
 *    → "Request your archive". Strava emails a link (it can take hours).
 *    Set Strava's display language to English first: the CSV's dates and
 *    headers follow it.
 * 2. Unzip it into knowledge_base/strava-export/ (gitignored), so that
 *    knowledge_base/strava-export/activities.csv exists.
 * 3. npm run strava:import
 *
 *   -- --dry-run         parse everything, print what would be written, write nothing
 *   -- --csv-only        skip the GPS files (fast; keeps routes/splits already stored)
 *   -- --dir=<path>      a different export folder
 *   -- --tz=<IANA zone>  the zone the activity days are counted in (default
 *                        Asia/Kolkata; the CSV's times are UTC with no zone)
 *
 * Idempotent: an upsert on Strava's activity id. Re-run it on each new export.
 * The site's own columns (visible, race link, tags) are never sent, so they
 * survive. Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.
 * With no export folder it says so and exits 0, so `npm run refresh` can run it.
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import FitParser from "fit-file-parser";
import {
  activityFromCsv, csvObjects, detailFromTrack, gearFromCsv, rankBestEfforts,
  trackFromFit, trackFromGpx, trackFromTcx,
} from "../src/lib/stravaExport.js";
import { sportFamily } from "../src/lib/training.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const dry = flag("dry-run");
const csvOnly = flag("csv-only");
const dir = path.resolve(ROOT, option("dir") || "knowledge_base/strava-export");
const timeZone = option("tz") || process.env.STRAVA_TZ || "Asia/Kolkata";
const BATCH = 200;

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  });
}

const readCsv = (name) => {
  const file = path.join(dir, name);
  return fs.existsSync(file) ? csvObjects(fs.readFileSync(file, "utf8")) : [];
};

const fitParser = new FitParser({
  force: true, speedUnit: "m/s", lengthUnit: "m", elapsedRecordField: true, mode: "list",
});

/** The activity's original file → a track, or a reason it could not be read. */
async function readTrack(relative) {
  const file = path.join(dir, relative);
  if (!fs.existsSync(file)) return { track: null, problem: "file missing" };
  try {
    let buf = fs.readFileSync(file);
    if (file.endsWith(".gz")) buf = zlib.gunzipSync(buf);
    const ext = file.replace(/\.gz$/, "").split(".").pop().toLowerCase();
    if (ext === "fit") {
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      return { track: trackFromFit(await fitParser.parseAsync(ab)) };
    }
    if (ext === "gpx") return { track: trackFromGpx(buf.toString("utf8")) };
    if (ext === "tcx") return { track: trackFromTcx(buf.toString("utf8").trim()) };
    return { track: null, problem: `unknown file type .${ext}` };
  } catch (err) {
    return { track: null, problem: err.message || String(err) };
  }
}

const EMPTY_DETAIL = {
  route_polyline: null, splits_metric: null, splits_standard: null, laps: null, best_efforts: null,
};
const EMPTY_GPS = {
  summary_polyline: null, polyline: null, start_latlng: null, end_latlng: null,
};

async function main() {
  if (!fs.existsSync(path.join(dir, "activities.csv"))) {
    console.log(`No Strava export at ${path.relative(ROOT, dir)}/activities.csv; skipped.`);
    console.log("Request your archive on strava.com and unzip it there (docs/strava.md).");
    return;
  }

  const now = new Date().toISOString();
  const shoes = gearFromCsv(readCsv("shoes.csv"), "shoe", { now });
  const bikes = gearFromCsv(readCsv("bikes.csv"), "bike", { now });
  const gearKinds = Object.fromEntries([...shoes, ...bikes].map((g) => [g.name.toLowerCase(), g.kind]));

  const csv = readCsv("activities.csv");
  const headers = Object.keys(csv[0] || {});
  const parsed = csv.map((r) => activityFromCsv(r, { timeZone, gearKinds, now })).filter(Boolean);
  console.log(`${parsed.length} activities in activities.csv (${headers.length} columns), days counted in ${timeZone}.`);
  const undated = parsed.filter((p) => !p.row.start_date).length;
  if (undated) {
    console.warn(`  ! ${undated} activities have a date this script cannot read — is Strava's language English?`);
  }
  if (!headers.some((h) => /visib|^(activity )?private$/i.test(h))) {
    console.log("  No visibility column in the export: every activity is public until hidden at /admin/training.");
  }

  const rows = [];
  const privateRows = [];
  const problems = [];
  let withTrack = 0;
  for (let i = 0; i < parsed.length; i += 1) {
    const { row, privateRow, file } = parsed[i];
    if (!csvOnly) {
      // Every row carries every detail key (one upsert shape); a manual
      // activity, or one whose file cannot be read, gets nulls.
      let detail = { ...EMPTY_DETAIL };
      let gps = { ...EMPTY_GPS };
      if (file) {
        // eslint-disable-next-line no-await-in-loop
        const { track, problem } = await readTrack(file);
        if (track && track.points.length > 1) {
          ({ detail, gps } = detailFromTrack(track, { isRun: sportFamily(row.sport_type) === "run", now }));
          withTrack += 1;
        } else {
          problems.push(`${row.id} ${file}: ${problem || "no track points"}`);
        }
      }
      Object.assign(row, detail, { detail_synced_at: now });
      Object.assign(privateRow, gps);
    }
    rows.push(row);
    privateRows.push(privateRow);
    if ((i + 1) % 100 === 0) process.stdout.write(`  read ${i + 1}/${parsed.length}\r`);
  }
  if (!csvOnly) {
    rankBestEfforts(rows);
    console.log(`GPS files read for ${withTrack} of ${parsed.length} activities.`);
  }
  problems.slice(0, 10).forEach((p) => console.warn(`  ! ${p}`));
  if (problems.length > 10) console.warn(`  ! …and ${problems.length - 10} more without a usable file`);

  // Gear mileage: the export does not carry it, so it is summed here.
  const gear = [...shoes, ...bikes].map((g) => ({
    ...g,
    distance: rows.filter((r) => r.gear_id === g.id).reduce((s, r) => s + (r.distance || 0), 0),
  }));

  const byYear = {};
  rows.forEach((r) => {
    const y = (r.date || "????").slice(0, 4);
    byYear[y] = (byYear[y] || 0) + 1;
  });
  console.log(`By year: ${Object.entries(byYear).sort().map(([y, n]) => `${y} ${n}`).join(", ")}`);
  console.log(`Gear: ${shoes.length} shoes, ${bikes.length} bikes.`);

  if (dry) {
    console.log("Dry run: nothing written.");
    return;
  }

  loadEnv();
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const upsert = async (table, list, onConflict) => {
    for (let i = 0; i < list.length; i += BATCH) {
      // eslint-disable-next-line no-await-in-loop
      const { error } = await supabase.from(table).upsert(list.slice(i, i + BATCH), { onConflict });
      if (error) throw new Error(`${table}: ${error.message}`);
    }
  };

  await upsert("strava_gear", gear, "id");
  await upsert("strava_activities", rows, "id");
  await upsert("strava_activity_private", privateRows, "activity_id");
  console.log(`Wrote ${rows.length} activities and ${gear.length} gear.`);
  console.log("Next: npm run og:fallbacks -- --only=training, then npm run ask:index.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
