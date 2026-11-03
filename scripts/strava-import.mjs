#!/usr/bin/env node
/**
 * Strava → Supabase: every activity (summary + detail), the athlete's totals
 * and zones, and the gear. No photos, no streams. See docs/strava.md.
 *
 *   npm run strava:import                    backfill / catch up (resumable)
 *   npm run strava:import -- --since=7d      list only activities from the last 7 days
 *   npm run strava:import -- --since=2025-01-01
 *   npm run strava:import -- --details-only  skip the list, fill pending details
 *   npm run strava:import -- --no-details    list + athlete only
 *   npm run strava:import -- --no-wait       stop at the 15-minute limit instead of waiting
 *   npm run strava:import -- --dry-run       print the plan, call nothing
 *
 * Strava allows 100 reads per 15 minutes and 1,000 a day. The list costs one
 * call per 200 activities; each detail is one call. The script stops cleanly
 * at the daily cap and picks up where it left off on the next run (rows with no
 * detail yet are filled first). At the 15-minute cap it waits for the next
 * quarter hour unless --no-wait, so a first backfill of ~1,000 activities is
 * one long run (about 2.5 hours) or a few nights of the nightly workflow.
 *
 * Needs .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRAVA_CLIENT_ID,
 * STRAVA_CLIENT_SECRET, and a token from `node scripts/strava-auth.mjs`
 * (or STRAVA_REFRESH_TOKEN).
 */

import { loadEnv } from "./lib/stravaEnv.mjs";
import {
  DETAIL_BATCH, countPendingDetails, getAccessToken, latestStartEpoch, syncAthlete,
  syncDetails, syncListPage,
} from "../src/lib/stravaSync.js";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const dry = flag("dry-run");
const detailsOnly = flag("details-only");
const noDetails = flag("no-details");
const since = option("since");
const noWait = flag("no-wait");

/** Strava's 15-minute windows reset at :00, :15, :30 and :45. */
const sleepToQuarter = () => {
  const ms = 15 * 60 * 1000 - (Date.now() % (15 * 60 * 1000)) + 5000;
  console.log(`15-minute budget spent; waiting ${Math.round(ms / 60000)} min…`);
  return new Promise((r) => { setTimeout(r, ms); });
};

function sinceEpoch(value) {
  if (!value) return null;
  const days = /^(\d+)d$/.exec(value);
  if (days) return Math.floor(Date.now() / 1000) - Number(days[1]) * 86400;
  const t = Date.parse(value);
  if (!Number.isFinite(t)) {
    console.error(`--since must be Nd or a date, got ${value}`);
    process.exit(1);
  }
  return Math.floor(t / 1000);
}

const env = loadEnv();

// Unconfigured is a skip, not a failure: `npm run refresh` and the nightly
// workflow run this step whether or not Strava has been set up.
if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET) {
  console.log("Strava is not configured (STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET); skipped.");
  process.exit(0);
}

if (dry) {
  console.log("Plan (dry run, nothing called):");
  if (!detailsOnly) {
    console.log(`  list   GET /athlete/activities per_page=200${since ? ` after=${since}` : " (all pages)"}`);
    console.log("  athlete GET /athlete, /athletes/{id}/stats, /athlete/zones, /gear/{id}×n");
  }
  if (!noDetails) console.log(`  detail GET /activities/{id} for pending rows, ${DETAIL_BATCH} per batch until the budget is spent`);
  try {
    const pending = await countPendingDetails(env);
    console.log(`  rows without detail now: ${pending ?? "unknown"}`);
  } catch (err) {
    console.log(`  could not read pending count: ${err.message}`);
  }
  process.exit(0);
}

const token = await getAccessToken(env);
const describe = (l) => (l ? `budget left: ${l.left15}/15min, ${l.leftDay}/day` : "");

if (!detailsOnly) {
  // With no --since, an empty table lists everything; a filled one lists from
  // a week before its newest activity (edits to old ones are caught by a full
  // run: --since=all).
  let after = null;
  if (since && since !== "all") after = sinceEpoch(since);
  else if (!since) {
    const latest = await latestStartEpoch(env);
    after = latest ? latest - 7 * 86400 : null;
  }
  let page = 1;
  let listed = 0;
  while (page) {
    // eslint-disable-next-line no-await-in-loop
    const res = await syncListPage(env, { page, after, token });
    listed += res.count;
    console.log(`list page ${page}: ${res.count} activities. ${describe(res.limits)}`);
    page = res.next;
    if (res.limits && (res.limits.left15 <= 2 || res.limits.leftDay <= 2)) {
      console.log("Rate limit reached during the list; run again later to continue.");
      process.exit(0);
    }
  }
  console.log(`Listed ${listed} activities.`);
  const athlete = await syncAthlete(env, { token });
  console.log(`Athlete ${athlete.athleteId}: ${athlete.gear} gear, zones ${athlete.zones ? "stored" : "unavailable"}.`);
}

if (!noDetails) {
  let total = 0;
  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const res = await syncDetails(env, { token });
    total += res.fetched;
    console.log(`details: +${res.fetched} (total ${total}). ${describe(res.limits)}`);
    if (res.stopped === "rate_limit") {
      if (noWait || !res.limits || res.limits.leftDay <= 1) {
        console.log("Rate limit reached; the rest is picked up by the next run.");
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      await sleepToQuarter();
      continue; // eslint-disable-line no-continue
    }
    if (res.fetched < DETAIL_BATCH) break;
  }
  const pending = await countPendingDetails(env).catch(() => null);
  if (pending != null) console.log(`${pending} activities still without detail.`);
}
