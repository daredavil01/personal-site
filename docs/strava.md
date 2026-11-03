# Strava → /training

Every Strava activity, read from a **Strava bulk export** into Supabase and
shown at `/training`. Hand-written; the schema is
`supabase/migrations/0038_training.sql` + `0039_training_from_export.sql`.

Why an export and not the API: since June 2026 Strava's API needs a paid
subscription (about $11.99/month) even for a personal project reading its own
data. The export is free, has every activity ever recorded, and needs no keys.
The cost is that it is not live: new activities arrive when you request a new
archive and re-run the import.

## What the export contains, and where it goes

| Export file | Stored in |
|---|---|
| `activities.csv` (~90 columns) | `strava_activities` — mapped columns, the rest in `extra` |
| `activities/<id>.fit.gz` / `.gpx` / `.tcx.gz` | route, splits, laps, best efforts (computed), raw GPS → `strava_activity_private` |
| `shoes.csv`, `bikes.csv` | `strava_gear`; mileage summed from activities |
| `media/` | **not read** — no photos, by choice |
| everything else (profile, clubs, routes, segments, comments, …) | not read |

### Columns on `strava_activities`

- **From `activities.csv`** — `id` (Strava's, so `/training/<id>` matches
  strava.com/activities/<id>), `name`, `sport_type` ("Virtual Ride" →
  `VirtualRide`, the API's spelling), `type` (as exported), `start_date` (the
  CSV's "Activity Date", UTC), `start_date_local` and `date` (that instant in
  `--tz`, default Asia/Kolkata — the CSV has no time zone), `distance` (m),
  `moving_time`, `elapsed_time` (s), `total_elevation_gain`, `elev_high`,
  `elev_low`, `average_speed`, `max_speed` (m/s), `average_heartrate`,
  `max_heartrate`, `average_cadence`, `average_watts`, `max_watts`,
  `weighted_average_watts`, `kilojoules` (Total Work / 1000), `calories`,
  `suffer_score` (Relative Effort), `perceived_exertion`, `commute`, `flagged`,
  `manual` (no file), `gear_id`, `description`.
- **`extra` (jsonb)** — every other non-empty column, keyed by its CSV header:
  weather (temperature, condition, humidity, wind, …), grade-adjusted distance,
  max/average grade, total steps, training load, intensity and so on. Shown on
  the detail page under "More from Strava".
- **Computed from the GPS file** — `route_polyline` (the route with every point
  within 400 m of the start or finish removed), `splits_metric` /
  `splits_standard` (per km / per mile: time, moving time, pace, elevation
  change, heart rate), `laps` (from FIT/TCX laps), `best_efforts` (fastest
  400 m … 50K inside each run, with `pr_rank` 1–3 as of the day it was run).
- **Not available from the export** — kudos/comment/achievement counts, segment
  efforts, `workout_type`, Strava's own totals and HR zones. Left null and
  omitted on the page.
- **The site's own** — `visible`, `sport_id` (the `/sports` race this activity
  is), tags. The import never writes these.

The CSV repeats some headers ("Distance", "Elapsed Time", "Max Heart Rate",
"Relative Effort", "Commute"): the first copy is in display units, the second
raw. The import reads the raw one.

### `strava_activity_private` (owner-only)

`summary_polyline`, `polyline`, `start_latlng`, `end_latlng`, `private_note`,
and `extra` for columns about you rather than the activity (athlete weight).
Kept apart because the original files carry raw GPS with Strava's privacy zones
**not** applied, so a route starts at the front door.

## Who sees what

The export may not say which activities are private. If `activities.csv` has a
visibility or private column the import honours it; otherwise every activity is
public until you turn off **Visible** at `/admin/training`. The import says
which case it found. RLS shows the public a row only when it is `visible`, not
`private`, and its visibility (if known) is `everyone`.

## Importing

1. On strava.com set the display language to **English** (the CSV's dates and
   headers follow it), then Settings → My Account → **Download or Delete Your
   Account** → **Request your archive**. Strava emails a link, sometimes hours
   later.
2. Unzip it into `knowledge_base/strava-export/` (gitignored), so that
   `knowledge_base/strava-export/activities.csv` exists.
3. `npm run strava:import -- --dry-run` — parses everything and prints counts
   per year, how many GPS files were read and any it could not read.
4. `npm run strava:import` — writes. Needs `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` in `.env`. About a minute per thousand
   activities, nearly all of it FIT decoding.
5. `npm run og:fallbacks -- --only=training` (the card's numbers) and
   `npm run ask:index` (the monthly `/ask` chunks); commit the card.

**Files-only exports.** An archive (or a folder copied out of one) with
`activities/` but no `activities.csv` still imports: each
`<activity id>.fit.gz` / `.gpx` / `.tcx.gz` is the record. A FIT session
carries the summary (sport, start, distance, moving and elapsed time, heart
rate, cadence, power, calories, climb, device, plus temperature, step length
and the rest in `extra`); a GPX carries its Strava name and type, and its
numbers are computed from the track. With no names in a FIT file, an activity
gets Strava's own default ("Morning Run", "Evening Weight Training"), and a
later import with the CSV renames it in place. There is no visibility or gear
in the files. Keep the unzipped files in a gitignored folder, e.g.
`tmp/strava-export/`, and pass `--dir=tmp/strava-export`.

**Never a duplicate row.** Rows upsert on Strava's id, so a re-run updates in
place. Before writing, the script reads every stored id and start time; an
activity that starts within 60 s of a stored one (or one earlier in the same
run) under a *different* id, in the same sport, is skipped and listed
(`findDuplicates` in `src/lib/stravaExport.js`). A files-only run never sends
`name` for a row that already exists, so it cannot overwrite a real name.

Options: `--csv-only` skips the GPS files (keeps routes and splits already
stored), `--dir=<path>` reads another folder, `--tz=<IANA zone>` (or
`STRAVA_TZ`) changes the zone days are counted in.

**Updating:** request a fresh archive and run it again. It upserts on the
activity id, so nothing duplicates and your visibility, race links and tags are
kept. An activity deleted on Strava is not deleted here; hide it at
`/admin/training`. `npm run refresh` includes the step and skips it when there
is no export folder.

## Where it shows up

- `/training` — in the atlas, an animated story (route replay, a spiral of
  days, a race against past years' best efforts, weekly tides, a start-time
  dial, the shoe rack, records, milestones, a departures board, the full log);
  in classic, Overview / Log / Calendar / Stats & PRs / Routes tabs. Until the
  first import (or with `?demo=1`) both show a labelled sample log from
  `src/lib/trainingDemo.js`.
- `/training/:id` — numbers; "the day, kilometre by kilometre" (the terrain as a
  line with figures at the start, fastest km, longest stop, biggest climb, heart
  peak and finish, a heart-rate ribbon and a replay — `src/lib/dayStory.js`), or a
  session card when there are no splits; then splits, laps, best efforts, route and
  "More from Strava".
- `/sports/:id` — the linked activity's numbers and splits. Link races at
  `/admin/training/races`, which suggests same-day, same-distance matches.
- `/now` and newsletter issues — the "Strava" stat group is computed from the
  month's activities unless one was typed in by hand.
- `/stats` and the `/training` share card — `activityCount`, `activityKm`,
  `activityHours`, `activityDays`, `trainingDays` from `computeSiteStats`.
- `/tags/:name` — activities can be tagged at `/admin/training`.
- `/ask` — one chunk per month (`scripts/ask-sources/training.mjs`).

## Strava's terms

Strava's terms say its data may not be used to train AI models. Retrieval for
`/ask` is not training, but it is the closest use on the site:
`ASK_SKIP_TRAINING=1 npm run ask:index` removes every training chunk. Pages
carry "Powered by Strava" and a "View on Strava" link.
