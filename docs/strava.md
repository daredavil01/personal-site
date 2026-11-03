# Strava → /training

Every Strava activity, read from a **Strava bulk export** into Supabase and
shown at `/training`. Hand-written; the schema is
`supabase/migrations/0038_training.sql` + `0039_training_from_export.sql` + `0040_training_profile.sql`.

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
- **`extra._stats`** — per-second facts boiled down at import (`deepStatsOf`):
  `hrBins` (seconds per 10-bpm bin), `drift` (aerobic decoupling, runs of
  8 km+), `negSplit` (second-half minus first-half pace, s/km), `tMax`/`tMin`
  (laps), `pMax`, `vMax` (GPS, spiky), `altMax`/`altMin`, `steps` (cycles × 2
  on foot) and `streams` (which streams the file had). Read by the Facts tab
  (`src/lib/trainingFacts.js`); never printed under "More from Strava".
- **`profile` (jsonb, `0040`)** — the file's streams thinned to ~240 samples
  (by distance, or by time for a session that goes nowhere): `x`, `t`, and
  whichever of altitude `e`, heart rate `h`, speed `v`, cadence `c`, power
  `w`, step length `s`, ground contact `g`, vertical oscillation `o` the
  watch recorded — **never a position**, so it is public like the splits —
  plus a strength session's `sets` (type, start, duration, reps, exercise,
  weight). Read only by `/training/:id`. Splits also carry per-km cadence,
  power, step length, ground contact and vertical oscillation when recorded.
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

**CSV and files together.** With a CSV, each activity's FIT session still fills what the CSV lacks: device, average power and cadence where empty, and in `extra` temperature, minimum heart rate, step length, ground contact, vertical ratio, Effort Pace and a strength session's sets. A run the file marks as a trail becomes `TrailRun`. The CSV wins wherever both have a value (`mergeFitSummary`).

**A file name is not an activity id.** The number in `activities/<number>.fit.gz` usually differs from the CSV's `Activity ID` (the real one, in strava.com/activities/<id>). A files-only import has only the file name, so it stores that number as the id; a later CSV import then sees the same start time under another id and skips it as a duplicate, leaving the default name. To correct that, delete the files-only rows and import with the CSV.

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

- `/training` — **the film**: 60 seconds, vertical, narrated, beside the title in
  both layouts (`TrainingFilm.js`). Rendered with Remotion from the live table —
  see "The film" below.
- `/training` — a **Facts** tab / "By the numbers" chapter: every fact the log
  supports and every variable with its coverage (`src/lib/trainingFacts.js`).
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

## The film

`npm run training:film -- --publish` renders the page's 60-second vertical film
with [Remotion](https://www.remotion.dev) (free for individuals; a company of
more than three people needs its company licence) and writes the web copy to
`public/video/the-training-story.{mp4,jpg,vtt,json}`, which is committed.
`src/components/Training/film.test.js` fails the build if one is missing, the
MP4 passes 6 MB or the chapters stop fitting a minute.

- **Data** (`scripts/training-film/data.mjs`): the public columns only, reduced
  with the page's own modules through Vite's SSR loader — `totals`, `factsOf`,
  `inventory`, `streaks`, `storyOf`/`pickSlots`/`terrainOf` for the longest day.
  Routes are the trimmed `route_polyline`, framed on home ground like the atlas.
- **Story** (`render.mjs` `script()`): eight scenes — the pulse, every activity,
  light painting, the streak, a day replayed with the group of ten, five facts,
  the two layouts (phone screenshots from `capture.mjs`), and the address. Each
  line is spoken first (`scripts/blueprint-film/voice.mjs`: Aura with Cloudflare
  keys, else Piper with `PIPER_VOICE`), measured, and the scenes are sized
  around the lines to fill exactly 60 s. Numbers are spoken as words; the
  burned-in captions and the `.vtt` show the figures.
- **Music** (`score.mjs`): synthesised to the scene cuts, a hit on every fact;
  it ducks under the voice in the composition.
- **Picture** (`remotion/`): every motion is a function of the frame
  (`interpolate`, `spring`). Figures use the page's poses
  (`src/components/Training/poses.js`).
- Flags: `--stills` (one frame per scene), `--frame=12.5,30`, `--capture`
  (re-shoot the page). Working files go to gitignored `knowledge_base/training-film/`.
- The numbers are baked in when it renders: re-run it after an import.

## Strava's terms

Strava's terms say its data may not be used to train AI models. Retrieval for
`/ask` is not training, but it is the closest use on the site:
`ASK_SKIP_TRAINING=1 npm run ask:index` removes every training chunk. Pages
carry "Powered by Strava" and a "View on Strava" link.
