-- 0040: the activity's streams, thinned, for the day story on /training/:id.
--
-- Depends on 0038/0039. A watch records every second — heart rate, speed,
-- altitude, cadence, power, step length, ground contact, vertical
-- oscillation. The splits keep per-kilometre averages; `profile` keeps their
-- shape: about 240 samples bucketed by distance (or by time for a session
-- that goes nowhere, such as strength), as parallel arrays
--   { by: "distance"|"time", x, t, e?, h?, v?, c?, w?, s?, g?, o?, sets? }
-- (x = metres or seconds, t = seconds from the start, e = altitude m,
-- h = bpm, v = m/s, c = cadence, w = watts, s = step length mm, g = ground
-- contact ms, o = vertical oscillation mm), plus a strength session's sets
-- [{ type, start, duration, reps, category, weight }].
--
-- It never holds a position, so it is public like the splits: the raw GPS
-- stays in strava_activity_private. Written by `npm run strava:import`
-- (profileFromTrack in src/lib/stravaExport.js); the list page never selects
-- it, only /training/:id (select *).

alter table public.strava_activities
  add column if not exists profile jsonb;

comment on column public.strava_activities.profile is
  'Thinned streams from the activity file (no position) and strength sets; see 0040.';

notify pgrst, 'reload schema';
