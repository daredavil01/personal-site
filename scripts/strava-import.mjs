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
 *    knowledge_base/strava-export/activities.csv exists — or any gitignored
 *    folder, e.g. tmp/strava-export/, with --dir.
 * 3. npm run strava:import
 *
 * Files-only exports: with no activities.csv but an activities/ folder of
 * original files (<activity id>.fit.gz / .gpx / .tcx.gz), each file is the
 * record — a FIT session has the summary, a GPX its name — and the activity
 * gets Strava's own default name ("Morning Run"). A later full export with
 * the CSV renames them in place.
 *
 *   -- --dry-run         parse everything, print what would be written, write nothing
 *   -- --csv-only        skip the GPS files (fast; keeps routes/splits already stored)
 *   -- --dir=<path>      a different export folder
 *   -- --tz=<IANA zone>  the zone the activity days are counted in (default
 *                        Asia/Kolkata; the CSV's times are UTC with no zone)
 *
 * Never duplicates: an upsert on Strava's activity id, so a re-run updates
 * rows in place; and before writing, any activity that starts within 60 s of
 * one already stored (or earlier in this run) under another id, in the same
 * sport, is skipped and listed (findDuplicates). Rows that already exist are
 * written without `name`, so a generated name never replaces a real one.
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
  activityFromCsv, activityFromFit, activityFromGpx, csvObjects, detailFromTrack, findDuplicates,
  gearFromCsv, profileFromTrack, rankBestEfforts, trackFromFit, trackFromGpx, trackFromTcx,
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
      const fit = await fitParser.parseAsync(ab);
      return { track: trackFromFit(fit), fit };
    }
    if (ext === "gpx") {
      const xml = buf.toString("utf8");
      return { track: trackFromGpx(xml), xml };
    }
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

const FILE_RE = /^(\d+)\.(fit\.gz|fit|gpx|gpx\.gz|tcx|tcx\.gz)$/i;

/**
 * Files-only mode: every activities/<id>.<ext> → the same { row, privateRow,
 * file } activityFromCsv gives, read from the file itself. The file is parsed
 * once here and again for the detail below; a few hundred files take seconds.
 */
async function activitiesFromFiles(now) {
  const names = fs.readdirSync(path.join(dir, "activities")).filter((n) => FILE_RE.test(n)).sort();
  const out = [];
  const problems = [];
  for (let i = 0; i < names.length; i += 1) {
    const [, id] = FILE_RE.exec(names[i]);
    const file = `activities/${names[i]}`;
    // eslint-disable-next-line no-await-in-loop
    const { fit, xml, problem } = await readTrack(file);
    let parsed = null;
    if (fit) parsed = activityFromFit(fit, { id, timeZone, now });
    else if (xml) parsed = activityFromGpx(xml, { id, timeZone, now });
    if (parsed) out.push({ ...parsed, file });
    else problems.push(`${file}: ${problem || "no activity in the file"}`);
    if ((i + 1) % 50 === 0) process.stdout.write(`  parsed ${i + 1}/${names.length}\r`);
  }
  problems.forEach((p) => console.warn(`  ! ${p}`));
  return out;
}

/** Every stored activity's id, start and sport — what a duplicate is checked against. */
async function storedActivities(supabase) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase
      .from("strava_activities")
      .select("id,start_date,sport_type")
      .order("id")
      .range(from, from + 999);
    if (error) throw new Error(`reading strava_activities: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

/** SUPABASE_URL, VITE_SUPABASE_URL, else wrangler.toml's [vars] (it is public). */
function supabaseUrl() {
  if (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const toml = path.join(ROOT, "wrangler.toml");
  if (!fs.existsSync(toml)) return null;
  const m = /^\s*VITE_SUPABASE_URL\s*=\s*"([^"]+)"/m.exec(fs.readFileSync(toml, "utf8"));
  return m ? m[1] : null;
}

async function main() {
  const hasCsv = fs.existsSync(path.join(dir, "activities.csv"));
  const hasFiles = fs.existsSync(path.join(dir, "activities"));
  if (!hasCsv && !hasFiles) {
    console.log(`No Strava export at ${path.relative(ROOT, dir)}/ (no activities.csv or activities/); skipped.`);
    console.log("Request your archive on strava.com and unzip it there (docs/strava.md).");
    return;
  }

  const now = new Date().toISOString();
  const shoes = gearFromCsv(readCsv("shoes.csv"), "shoe", { now });
  const bikes = gearFromCsv(readCsv("bikes.csv"), "bike", { now });
  const gearKinds = Object.fromEntries([...shoes, ...bikes].map((g) => [g.name.toLowerCase(), g.kind]));

  let parsed;
  if (hasCsv) {
    const csv = readCsv("activities.csv");
    const headers = Object.keys(csv[0] || {});
    parsed = csv.map((r) => activityFromCsv(r, { timeZone, gearKinds, now })).filter(Boolean);
    console.log(`CSV mode: ${parsed.length} activities in activities.csv (${headers.length} columns), days counted in ${timeZone}.`);
    const undated = parsed.filter((p) => !p.row.start_date).length;
    if (undated) {
      console.warn(`  ! ${undated} activities have a date this script cannot read — is Strava's language English?`);
    }
    if (!headers.some((h) => /visib|^(activity )?private$/i.test(h))) {
      console.log("  No visibility column in the export: every activity is public until hidden at /admin/training.");
    }
  } else {
    parsed = await activitiesFromFiles(now);
    console.log(`Files-only mode (no activities.csv): ${parsed.length} activities read from ${path.relative(ROOT, dir)}/activities/, days counted in ${timeZone}.`);
    console.log("  Names are Strava's defaults (\"Morning Run\"); no visibility, gear or descriptions in the files.");
    console.log("  Every activity is public until hidden at /admin/training.");
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
      let profile = null;
      if (file) {
        // eslint-disable-next-line no-await-in-loop
        const { track, problem, fit } = await readTrack(file);
        // The streams and a strength session's sets, for every activity with
        // a file — a session that goes nowhere still has a heart rate.
        profile = track && track.points.length > 1 ? profileFromTrack(track, fit) : null;
        if (track && track.points.length > 1 && (row.distance || 0) > 0) {
          ({ detail, gps } = detailFromTrack(track, { isRun: sportFamily(row.sport_type) === "run", now }));
          withTrack += 1;
        } else if (problem || (row.distance || 0) > 0) {
          // A strength or yoga session has no distance and no route: not a problem.
          problems.push(`${row.id} ${file}: ${problem || "no track points"}`);
        }
      }
      Object.assign(row, detail, { profile, detail_synced_at: now });
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

  const count = (keyOf) => Object.entries(rows.reduce((m, r) => {
    const k = keyOf(r);
    return { ...m, [k]: (m[k] || 0) + 1 };
  }, {})).sort().map(([k, n]) => `${k} ${n}`).join(", ");
  console.log(`By year: ${count((r) => (r.date || "????").slice(0, 4))}`);
  console.log(`By sport: ${count((r) => r.sport_type || "?")}`);
  console.log(`Gear: ${shoes.length} shoes, ${bikes.length} bikes.`);

  loadEnv();
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    if (dry) {
      console.log("Dry run without SUPABASE_SERVICE_ROLE_KEY: duplicates checked within this export only.");
      const dups = findDuplicates(rows, []);
      console.log(`Duplicates inside the export: ${dups.length}. Nothing written.`);
      return;
    }
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // `profile` needs 0040. Without it the rest still imports.
  const probe = await supabase.from("strava_activities").select("profile").limit(1);
  if (probe.error) {
    console.warn("  ! strava_activities.profile is missing — apply supabase/migrations/0040_training_profile.sql, then re-run to add the streams.");
    rows.forEach((r) => { delete r.profile; }); // eslint-disable-line no-param-reassign
  } else {
    console.log(`Streams for ${rows.filter((r) => r.profile).length} activities, sets for ${rows.filter((r) => r.profile?.sets).length}.`);
  }

  // Duplicate guard. Same id = the same activity, updated in place. Another
  // id starting within 60 s in the same sport = the same activity stored
  // twice: skipped, never written.
  const stored = await storedActivities(supabase);
  const storedIds = new Set(stored.map((r) => Number(r.id)));
  const dups = findDuplicates(rows, stored);
  const dupIds = new Set(dups.map((d) => Number(d.row.id)));
  dups.slice(0, 20).forEach((d) => console.warn(`  ! skipped ${d.row.id} (${d.row.date} ${d.row.sport_type}): same activity as ${d.of}`));
  const keep = rows.filter((r) => !dupIds.has(Number(r.id)));
  const keepPrivate = privateRows.filter((r) => !dupIds.has(Number(r.activity_id)));
  const fresh = keep.filter((r) => !storedIds.has(Number(r.id)));
  // An existing row keeps its name: a files-only import must not replace a
  // name a CSV import (or Strava) gave it. An absent key is left untouched.
  const update = keep.filter((r) => storedIds.has(Number(r.id))).map(({ name, ...rest }) => rest);
  console.log(`${stored.length} already stored. This run: ${fresh.length} new, ${update.length} updated in place, ${dups.length} duplicates skipped.`);

  if (dry) {
    console.log("Dry run: nothing written.");
    return;
  }

  const upsert = async (table, list, onConflict) => {
    for (let i = 0; i < list.length; i += BATCH) {
      // eslint-disable-next-line no-await-in-loop
      const { error } = await supabase.from(table).upsert(list.slice(i, i + BATCH), { onConflict });
      if (error) throw new Error(`${table}: ${error.message}`);
    }
  };

  if (gear.length) await upsert("strava_gear", gear, "id");
  if (hasCsv) {
    await upsert("strava_activities", [...fresh, ...keep.filter((r) => storedIds.has(Number(r.id)))], "id");
  } else {
    await upsert("strava_activities", fresh, "id");
    await upsert("strava_activities", update, "id");
  }
  await upsert("strava_activity_private", keepPrivate, "activity_id");
  const after = await storedActivities(supabase);
  console.log(`Wrote ${fresh.length} new and ${update.length} updated activities, ${gear.length} gear. Table now holds ${after.length}.`);
  console.log("Next: npm run og:fallbacks -- --only=training, then npm run ask:index.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
