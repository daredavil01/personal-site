-- 0038: Training — every Strava activity as a content type (/training).
--
-- Rows arrive from Strava's API, never typed in: `npm run strava:import` (the
-- backfill and the nightly run) and the owner-only /api/strava-sync endpoint
-- (the "Sync now" button at /admin/training/sync). Both write through
-- src/lib/stravaSync.js, so the two paths store the same shape.
--
-- Four tables:
--   strava_activities         one row per activity, public columns only
--   strava_activity_private   the parts that locate a person: raw GPS, start/end
--                             points, the private note. Owner-only.
--   strava_gear               shoes and bikes, with Strava's mileage
--   strava_athlete            singleton: Strava's own totals and HR zones
--   strava_auth               singleton: the rotating OAuth tokens. No policy at
--                             all, so only the service role reaches it.
--
-- Why the split table rather than column grants: PostgREST expands `select=*`
-- into every column, so a column revoked from anon turns every public list
-- query into a permission error. A separate table keeps `*` safe.
--
-- Privacy: the owner's token returns full GPS with Strava's privacy zones NOT
-- applied. The public table keeps only `route_polyline`, the summary route with
-- its first and last stretch cut off (trimRoute in src/lib/strava.js).
--
-- Two kinds of column on strava_activities, and the sync only writes the first:
--   synced  everything from Strava (name .. detail_synced_at)
--   owned   visible, sport_id, tags — the site's own, never sent by a sync.
--
-- `id` is Strava's activity id (fits a bigint and a JS number), so a re-import
-- is an upsert and /training/<id> matches strava.com/activities/<id>.

create table if not exists public.strava_activities (
  id                      bigint primary key,
  name                    text not null default '',
  sport_type              text,
  type                    text,
  workout_type            int,
  start_date              timestamptz,
  start_date_local        timestamp,
  date                    date,           -- the local day, for monthDigest / /now
  timezone                text,
  distance                double precision,          -- metres
  moving_time             int,                       -- seconds
  elapsed_time            int,
  total_elevation_gain    double precision,
  elev_high               double precision,
  elev_low                double precision,
  average_speed           double precision,          -- m/s
  max_speed               double precision,
  average_heartrate       double precision,
  max_heartrate           double precision,
  has_heartrate           boolean,
  average_cadence         double precision,
  average_watts           double precision,
  max_watts               double precision,
  weighted_average_watts  double precision,
  kilojoules              double precision,
  device_watts            boolean,
  suffer_score            double precision,
  kudos_count             int,
  comment_count           int,
  achievement_count       int,
  pr_count                int,
  athlete_count           int,
  trainer                 boolean,
  commute                 boolean,
  manual                  boolean,
  private                 boolean not null default false,
  visibility              text,
  flagged                 boolean,
  hide_from_home          boolean,
  gear_id                 text,
  external_id             text,
  upload_id               bigint,
  route_polyline          text,
  -- detail (GET /activities/{id})
  description             text,
  calories                double precision,
  device_name             text,
  perceived_exertion      double precision,
  splits_metric           jsonb,
  splits_standard         jsonb,
  laps                    jsonb,
  best_efforts            jsonb,
  segment_efforts         jsonb,
  similar_activities      jsonb,
  -- site-owned
  visible                 boolean not null default true,
  sport_id                bigint references public.sports (id) on delete set null,
  -- bookkeeping
  synced_at               timestamptz,
  detail_synced_at        timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists strava_activities_start_idx on public.strava_activities (start_date desc);
create index if not exists strava_activities_date_idx on public.strava_activities (date desc);
create index if not exists strava_activities_sport_idx on public.strava_activities (sport_id)
  where sport_id is not null;
create index if not exists strava_activities_pending_idx on public.strava_activities (start_date desc)
  where detail_synced_at is null;

drop trigger if exists set_updated_at on public.strava_activities;
create trigger set_updated_at before update on public.strava_activities
  for each row execute function public.set_updated_at();

-- Public means: shown on the site, and Strava calls it public ("everyone").
-- A followers-only or only-me activity is stored but never leaves Postgres for
-- an anonymous reader — not its row, its tags, its counts or its card.
alter table public.strava_activities enable row level security;

drop policy if exists "public read" on public.strava_activities;
create policy "public read" on public.strava_activities
  for select using (
    (visible and not private and coalesce(visibility, 'everyone') = 'everyone')
    or public.is_owner());

drop policy if exists "owner write" on public.strava_activities;
create policy "owner write" on public.strava_activities for all
  to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- The parts that locate a person
-- ---------------------------------------------------------------------------

create table if not exists public.strava_activity_private (
  activity_id       bigint primary key references public.strava_activities (id) on delete cascade,
  summary_polyline  text,
  polyline          text,
  start_latlng      double precision[],
  end_latlng        double precision[],
  private_note      text,
  updated_at        timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.strava_activity_private;
create trigger set_updated_at before update on public.strava_activity_private
  for each row execute function public.set_updated_at();

alter table public.strava_activity_private enable row level security;

drop policy if exists "owner all" on public.strava_activity_private;
create policy "owner all" on public.strava_activity_private for all
  to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- Gear, athlete totals, tokens
-- ---------------------------------------------------------------------------

create table if not exists public.strava_gear (
  id           text primary key,
  kind         text check (kind in ('shoe', 'bike')),
  name         text,
  brand_name   text,
  model_name   text,
  description  text,
  distance     double precision,      -- metres, Strava's own figure
  is_primary   boolean,
  retired      boolean,
  synced_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.strava_gear;
create trigger set_updated_at before update on public.strava_gear
  for each row execute function public.set_updated_at();

alter table public.strava_gear enable row level security;
drop policy if exists "public read" on public.strava_gear;
create policy "public read" on public.strava_gear for select using (true);
drop policy if exists "owner write" on public.strava_gear;
create policy "owner write" on public.strava_gear for all
  to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Strava's totals (recent / year-to-date / all-time per sport, biggest ride and
-- climb) and the heart-rate zones. No profile, no weight: only what /training
-- shows. `stats` totals include private activities — Strava counts them — so
-- the page labels them as Strava's figures.
create table if not exists public.strava_athlete (
  id           int primary key default 1 check (id = 1),
  athlete_id   bigint,
  stats        jsonb,
  zones        jsonb,
  synced_at    timestamptz,
  updated_at   timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.strava_athlete;
create trigger set_updated_at before update on public.strava_athlete
  for each row execute function public.set_updated_at();

alter table public.strava_athlete enable row level security;
drop policy if exists "public read" on public.strava_athlete;
create policy "public read" on public.strava_athlete for select using (true);
drop policy if exists "owner write" on public.strava_athlete;
create policy "owner write" on public.strava_athlete for all
  to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Strava rotates the refresh token, so the current one lives here rather than
-- in a secret; STRAVA_REFRESH_TOKEN only seeds the first row.
-- RLS on with no policy: anon and authenticated see nothing, the owner included.
create table if not exists public.strava_auth (
  id             int primary key default 1 check (id = 1),
  athlete_id     bigint,
  access_token   text,
  refresh_token  text not null,
  expires_at     timestamptz,
  scope          text,
  updated_at     timestamptz not null default now()
);

alter table public.strava_auth enable row level security;
revoke all on public.strava_auth from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------

alter table public.tag_associations
  drop constraint if exists tag_associations_entity_type_check;
alter table public.tag_associations
  add constraint tag_associations_entity_type_check check (entity_type in
    ('book', 'blog', 'instagram', 'microblog', 'sport', 'trek', 'project', 'presentation', 'video',
     'activity'));

create or replace function public.tag_names(public.strava_activities)
returns text[] language sql stable as $$ select public.entity_tag_names('activity', $1.id) $$;

drop trigger if exists delete_entity_tags on public.strava_activities;
create trigger delete_entity_tags after delete on public.strava_activities
  for each row execute function public.delete_entity_tags('activity');

-- 0035's definition plus the activity arm. SECURITY INVOKER, so RLS keeps a
-- non-public activity off /tags for the public.
create or replace function public.tag_entities(p_name text)
returns table (entity_type text, entity_id bigint, title text, subtitle text, date text)
language sql stable as $$
  with hits as (
    select a.entity_type as et, a.entity_id as eid
    from public.tag_associations a
    join public.tags tg on tg.id = a.tag_id
    where tg.name = lower(btrim(p_name))
  )
  select 'book'::text, b.id, b.title, b.author, b.year::text
    from public.books b join hits h on h.et = 'book' and h.eid = b.id
  union all
  select 'blog'::text, bl.id, bl.blog_title, bl.blog_platform, bl.blog_date
    from public.blogs bl join hits h on h.et = 'blog' and h.eid = bl.id
  union all
  select 'instagram'::text, i.id, i.title, left(i.caption, 140), null::text
    from public.instagram i join hits h on h.et = 'instagram' and h.eid = i.id
  union all
  select 'microblog'::text, m.id, coalesce(nullif(m.title, ''), left(m.text, 140)), m.post_type, m.date::text
    from public.microblog m join hits h on h.et = 'microblog' and h.eid = m.id
  union all
  select 'sport'::text, s.id, s.title, concat_ws(' · ', s.distance, s.place), s.date
    from public.sports s join hits h on h.et = 'sport' and h.eid = s.id
  union all
  select 'trek'::text, tr.id, tr.fort_name, tr.endurance_level, tr.date
    from public.treks tr join hits h on h.et = 'trek' and h.eid = tr.id
  union all
  select 'project'::text, p.id, p.title, p.subtitle, p.date::text
    from public.projects p join hits h on h.et = 'project' and h.eid = p.id
  union all
  select 'presentation'::text, pr.id, pr.title, left(pr.description, 140), pr.date::text
    from public.presentations pr join hits h on h.et = 'presentation' and h.eid = pr.id
  union all
  select 'video'::text, v.id, v.title, coalesce(v.kind_override, v.kind), v.date::text
    from public.videos v join hits h on h.et = 'video' and h.eid = v.id
  union all
  select 'activity'::text, sa.id, sa.name,
         concat_ws(' · ', sa.sport_type, round((sa.distance / 1000.0)::numeric, 1)::text || ' km'),
         sa.date::text
    from public.strava_activities sa join hits h on h.et = 'activity' and h.eid = sa.id;
$$;

-- ---------------------------------------------------------------------------
-- Best efforts: the fastest time at each standard distance, per year
-- ---------------------------------------------------------------------------
-- best_efforts is a jsonb array per run; unrolling every run's array in the
-- browser would mean shipping all of them. SECURITY INVOKER: public rows only.

create or replace function public.activity_best_efforts()
returns table (name text, distance double precision, year int, elapsed_time int,
               activity_id bigint, date date)
language sql stable as $$
  select distinct on (e->>'name', extract(year from a.date))
         e->>'name', (e->>'distance')::double precision, extract(year from a.date)::int,
         (e->>'elapsed_time')::int, a.id, a.date
    from public.strava_activities a,
         jsonb_array_elements(coalesce(a.best_efforts, '[]'::jsonb)) e
   where a.date is not null and (e->>'elapsed_time') is not null
   order by e->>'name', extract(year from a.date), (e->>'elapsed_time')::int, a.date;
$$;

notify pgrst, 'reload schema';
