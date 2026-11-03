-- 0039: Training reads a Strava bulk export, not Strava's API.
--
-- Depends on 0038. Strava's API now needs a paid subscription, so /training is
-- filled by `npm run strava:import` from the archive Strava emails on request
-- ("Download or Delete Your Account" → "Request your archive"):
-- activities.csv, each activity's original .fit/.gpx/.tcx, shoes.csv and
-- bikes.csv (scripts/strava-import.mjs, src/lib/stravaExport.js).
--
-- 1. `extra` on both activity tables. activities.csv has ~90 columns; the ones
--    with a home on strava_activities go there, and every other non-empty one
--    (weather, grade-adjusted distance, steps, training load, …) is kept in
--    `extra`, keyed by its CSV header, so no exported field is lost. Columns
--    about the athlete rather than the activity (athlete weight) go to the
--    owner-only private table's `extra` instead.
--
-- 2. strava_auth and strava_athlete are dropped. They held the API's rotating
--    OAuth tokens and the API-only athlete totals and zones; the export has
--    neither, and nothing reads them any more. Both were empty unless the API
--    import was ever run.
--
-- 3. Gear mileage is no longer Strava's figure (the export does not carry it):
--    the import sums each shoe's and bike's activities.
--
-- Unchanged: the export may not say which activities are private, so the
-- public-read policy from 0038 still applies to the `private` / `visibility`
-- columns when the CSV has them, and `visible` (hide at /admin/training)
-- covers the rest. Columns the export cannot fill — kudos, comment and
-- achievement counts, segment efforts, workout_type — stay null.

alter table public.strava_activities
  add column if not exists extra jsonb;

alter table public.strava_activity_private
  add column if not exists extra jsonb;

comment on column public.strava_activities.extra is
  'Every other non-empty activities.csv column from the Strava export, keyed by its header.';
comment on column public.strava_activity_private.extra is
  'Personal activities.csv columns (athlete weight). Owner-only.';
comment on column public.strava_gear.distance is
  'Metres, summed from the imported activities that used this gear.';

drop table if exists public.strava_auth;
drop table if exists public.strava_athlete;

notify pgrst, 'reload schema';
