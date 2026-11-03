# Strava → /training

Every Strava activity, imported through Strava's API v3 into Supabase and shown
at `/training`. Hand-written; the schema is `supabase/migrations/0038_training.sql`.

## What is pulled, and what is not

| Strava endpoint | Calls | Stored in |
|---|---|---|
| `GET /athlete/activities?per_page=200` | 1 per 200 activities | `strava_activities` (summary columns), `strava_activity_private` (GPS) |
| `GET /activities/{id}` | 1 per activity | `strava_activities` (detail columns), `strava_activity_private` (full polyline, private note) |
| `GET /athlete` | 1 per sync | athlete id, the list of shoes and bikes |
| `GET /athletes/{id}/stats` | 1 per sync | `strava_athlete.stats` — Strava's own recent / YTD / all-time totals |
| `GET /athlete/zones` | 1 per sync | `strava_athlete.zones` — heart-rate (and power) zones |
| `GET /gear/{id}` | 1 per shoe or bike | `strava_gear` — name, brand, model, mileage, retired |

**Not pulled, by choice:** photos (`/activities/{id}/photos`), per-second
streams (`/activities/{id}/streams` — GPS, HR, cadence, power time series),
the lists of who gave kudos and the comment text (other people's data; their
counts are kept), segments' own leaderboards, routes, clubs and the athlete's
profile (weight, photo, city). Streams are the one large thing left out on
purpose: ~10,000 points an hour per activity, and nothing on the page needs them.

### Columns on `strava_activities`

- **Identity and time** — `id` (Strava's id, so `/training/<id>` matches
  strava.com/activities/<id>), `name`, `sport_type` (Run, TrailRun, Ride,
  GravelRide, Walk, Hike, Swim, …), the legacy `type`, `workout_type` (runs:
  0 default, 1 race, 2 long run, 3 workout; rides: 10 default, 11 race,
  12 workout), `start_date` (UTC), `start_date_local` (wall clock, no zone),
  `date` (the local day), `timezone`, `external_id`, `upload_id`, `device_name`.
- **Effort** — `distance` (m), `moving_time` / `elapsed_time` (s),
  `total_elevation_gain`, `elev_high`, `elev_low`, `average_speed` /
  `max_speed` (m/s), `average_heartrate` / `max_heartrate`, `has_heartrate`,
  `average_cadence` (per leg for runs — the page doubles it to steps a minute),
  `average_watts` / `max_watts` / `weighted_average_watts`, `kilojoules`,
  `device_watts`, `calories`, `suffer_score` (Relative Effort),
  `perceived_exertion`.
- **Social counts** — `kudos_count`, `comment_count`, `achievement_count`,
  `pr_count`, `athlete_count`.
- **Flags** — `trainer`, `commute`, `manual`, `private`, `visibility`
  (`everyone` / `followers_only` / `only_me`), `flagged`, `hide_from_home`.
- **Gear and route** — `gear_id`, `route_polyline` (the summary route with
  every point within 400 m of the start or finish removed).
- **Detail (jsonb)** — `splits_metric` / `splits_standard` (per km / per mile),
  `laps`, `best_efforts` (400 m … 50K, fastest stretch inside the activity, with
  `pr_rank`), `segment_efforts` (slimmed: no segment coordinates),
  `similar_activities`.
- **The site's own** — `visible`, `sport_id` (the `/sports` race this activity
  is), tags. No sync ever writes these.

### `strava_activity_private` (owner-only)

`summary_polyline`, `polyline` (full resolution), `start_latlng`, `end_latlng`,
`private_note`. Kept apart because the owner's token returns GPS with Strava's
privacy zones **not** applied, so the raw route starts at the front door.

## Who sees what

- **Public:** activities that are `visible`, not `private`, and `visibility =
  'everyone'` on Strava. RLS enforces it, so a private activity never reaches
  an anonymous payload, a tag page, `/stats`, the share card or `/ask`.
- **Owner:** everything, through `/admin/training`.
- **Nobody but the service role:** `strava_auth` (the tokens).

## Setting it up

1. Apply `0038_training.sql`.
2. In <https://www.strava.com/settings/api> set *Authorization Callback Domain*
   to `localhost`. Put `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` in `.env`.
3. `npm run strava:auth` — open the printed link, press Authorize, paste the URL
   you land on. This stores the first token pair in `strava_auth`
   (scopes `read,activity:read_all,profile:read_all`).
4. `npm run strava:import` — the backfill. Strava allows 100 reads per 15
   minutes and 1,000 a day; the script waits out each quarter hour on its own
   (`--no-wait` to stop instead) and resumes where it stopped, so ~1,000
   activities take about 2.5 hours, once.
5. For the button: `wrangler pages secret put STRAVA_CLIENT_ID` and
   `STRAVA_CLIENT_SECRET`. For the nightly job: the same two as GitHub secrets.

## Keeping it current

- **Nightly** — `.github/workflows/ask-refresh.yml` runs
  `npm run strava:import -- --no-wait` before `ask:index`: the activities of the
  last week before the newest stored one, plus any details still pending.
- **By hand** — `/admin/training/sync` → **Sync now** (tick *Re-list every
  activity* to catch renames of old ones), or `npm run refresh -- strava`.
- An activity from the last three days has its detail re-read (at most every six
  hours), so a title or description edited after the upload arrives.
- Deleting an activity on Strava does not delete it here; hide it at
  `/admin/training`.

## Where it shows up

- `/training` — log, year calendar, stats & best efforts, gear, routes.
- `/training/:id` — numbers, splits, laps, best efforts, segments, route.
- `/sports/:id` — the linked activity's numbers and splits (link races at
  `/admin/training/sync` → *Races to link*).
- `/now` and newsletter issues — the "Strava" stat group is computed from the
  month's activities unless one was typed in by hand.
- `/stats` and the `/training` share card — `activityCount`, `activityKm`,
  `activityHours`, `activityDays`, `trainingDays` from `computeSiteStats`.
- `/tags/:name` — activities can be tagged in `/admin/training`.
- `/ask` — one chunk per month (`scripts/ask-sources/training.mjs`).

## Strava's terms

Strava's API agreement (revised November 2024) says data may be shown only to
the athlete it belongs to and may not be used to train AI models. A public page
of your own activities is a grey area, and retrieval for `/ask` is not model
training but is the closest use to it. Two switches exist without deleting
anything: `visible` per activity (or drop the public select policy to hide the
whole table), and `ASK_SKIP_TRAINING=1` for `npm run ask:index`, which removes
every training chunk on the next run. Pages carry "Powered by Strava" and a
"View on Strava" link, as the brand guidelines ask.
