-- 0035: Videos — the YouTube channel as a content type.
--
-- A row is one upload on https://www.youtube.com/@sankettambare7474, written by
-- the owner-only /api/youtube-sync endpoint (the "Sync now" button at
-- /admin/videos/sync) or added one at a time by URL. The video itself stays on
-- YouTube; /videos/:id embeds it.
--
-- Two kinds of column, and the sync only ever writes the first:
--   synced  youtube_id .. synced_at — YouTube is the source; an /admin edit to
--           one of these is overwritten on the next sync, so edit on YouTube.
--   owned   kind_override, visible, tags — the site's own; never touched by a
--           sync. kind_override wins over the detected kind (a Short that the
--           detection missed, or the reverse).
--
-- yt_tags are the video's YouTube keywords, kept for search only. They are not
-- written into the central tag tables: a channel's SEO keywords would flood the
-- site's tag vocabulary. Site tags are chosen in /admin like every other type.
--
-- `date` is the publish day in IST (a real date, named `date` so monthDigest.js
-- and the /now autofill read it like a project's); published_at keeps the instant.

create table if not exists public.videos (
  id               bigint generated always as identity primary key,
  youtube_id       text not null unique check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title            text not null,
  description      text,
  date             date,
  published_at     timestamptz,
  duration_seconds int check (duration_seconds is null or duration_seconds >= 0),
  kind             text not null default 'video' check (kind in ('short', 'video')),
  kind_override    text check (kind_override in ('short', 'video')),
  view_count       bigint,
  like_count       bigint,
  comment_count    bigint,
  thumbnail_url    text,
  playlists        text[] not null default '{}',
  yt_tags          text[] not null default '{}',
  visible          boolean not null default true,
  source           text not null default 'manual' check (source in ('sync', 'manual')),
  synced_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists videos_date_idx on public.videos (date desc nulls last);

drop trigger if exists set_updated_at on public.videos;
create trigger set_updated_at before update on public.videos
  for each row execute function public.set_updated_at();

-- Visibility is enforced here, not in React (the projects rule from 0005): a
-- hidden video never reaches an anonymous payload, its tag pages or the counts.
alter table public.videos enable row level security;

drop policy if exists "public read" on public.videos;
create policy "public read" on public.videos
  for select using (visible or public.is_owner());

drop policy if exists "owner write" on public.videos;
create policy "owner write" on public.videos for all
  to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- Playlists
-- ---------------------------------------------------------------------------
-- The sync reads every playlist's members, then replaces each video's
-- `playlists` in one statement. A bulk upsert cannot do it: a partial row trips
-- the NOT NULL on title before the conflict is even considered. A video in no
-- playlist gets '{}', so leaving a playlist on YouTube is reflected here.
-- Service-role only, like the edge's other bookkeeping RPCs (0033): Postgres
-- grants EXECUTE to PUBLIC on every new function.

create or replace function public.set_video_playlists(p_map jsonb)
returns int
language plpgsql
as $$
declare
  changed int;
begin
  with m as (
    select key as yid,
           array(select jsonb_array_elements_text(value) order by 1) as pl
      from jsonb_each(coalesce(p_map, '{}'::jsonb))
  )
  update public.videos v
     set playlists = coalesce(m.pl, '{}')
    from public.videos v2
    left join m on m.yid = v2.youtube_id
   where v.id = v2.id
     and v.playlists is distinct from coalesce(m.pl, '{}');
  get diagnostics changed = row_count;
  return changed;
end
$$;

revoke all on function public.set_video_playlists(jsonb) from public, anon, authenticated;
grant execute on function public.set_video_playlists(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------

alter table public.tag_associations
  drop constraint if exists tag_associations_entity_type_check;
alter table public.tag_associations
  add constraint tag_associations_entity_type_check check (entity_type in
    ('book', 'blog', 'instagram', 'microblog', 'sport', 'trek', 'project', 'presentation', 'video'));

create or replace function public.tag_names(public.videos)
returns text[] language sql stable as $$ select public.entity_tag_names('video', $1.id) $$;

drop trigger if exists delete_entity_tags on public.videos;
create trigger delete_entity_tags after delete on public.videos
  for each row execute function public.delete_entity_tags('video');

-- Same as 0018 plus the video arm. A hidden video is left out here as well:
-- tag_entities is SECURITY INVOKER, so RLS already filters it for the public.
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
    from public.videos v join hits h on h.et = 'video' and h.eid = v.id;
$$;

-- ---------------------------------------------------------------------------
-- site_facts(): 0019's definition plus videos in the counts and the roster
-- ---------------------------------------------------------------------------

create or replace function public.site_facts()
returns jsonb
language sql stable
as $fn$
  select jsonb_build_object(
    'generated_at', now(),
    'counts', jsonb_build_object(
      'books',      (select count(*) from public.books),
      'microblog',  (select count(*) from public.microblog),
      'blogs',      (select count(*) from public.blogs),
      'projects',   (select count(*) from public.projects),
      'sports',     (select count(*) from public.sports),
      'treks',      (select count(*) from public.treks),
      'instagram',  (select count(*) from public.instagram),
      'videos',     (select count(*) from public.videos),
      'tags',       (select count(*) from public.tags)
    ),
    'books', jsonb_build_object(
      'by_status',   (select jsonb_object_agg(k, n) from
                       (select status k, count(*) n from public.books group by 1) t),
      'by_language', (select jsonb_object_agg(k, n) from
                       (select language k, count(*) n from public.books group by 1) t),
      'by_category', (select jsonb_object_agg(k, n) from
                       (select category k, count(*) n from public.books group by 1) t),
      'year_range',  (select jsonb_build_object('min', min(year), 'max', max(year))
                        from public.books)
    ),
    'microblog', jsonb_build_object(
      'date_range', (select jsonb_build_object('min', min(date), 'max', max(date))
                       from public.microblog),
      'by_type',    (select jsonb_object_agg(k, n) from
                      (select post_type k, count(*) n from public.microblog group by 1) t),
      'by_year',    (select jsonb_object_agg(k, n) from
                      (select left(date::text, 4) k, count(*) n from public.microblog
                        where date is not null group by 1) t)
    ),
    'projects', jsonb_build_object(
      'by_status',   (select jsonb_object_agg(k, n) from
                       (select status k, count(*) n from public.projects
                        where status is not null group by 1) t),
      'by_category', (select jsonb_object_agg(k, n) from
                       (select category k, count(*) n from public.projects
                        where category is not null group by 1) t)
    ),
    'sports', jsonb_build_object(
      'by_distance', (select jsonb_object_agg(k, n) from
                       (select distance k, count(*) n from public.sports
                        where distance is not null group by 1) t)
    ),
    'videos', jsonb_build_object(
      'by_kind', (select jsonb_object_agg(k, n) from
                   (select coalesce(kind_override, kind) k, count(*) n from public.videos
                    group by 1) t)
    ),
    'resume', jsonb_build_object(
      'positions',      (select count(*) from public.resume_positions),
      'degrees',        (select count(*) from public.resume_degrees),
      'certifications', (select count(*) from public.resume_certifications),
      'skills',         (select count(*) from public.resume_skills),
      'companies',      (select jsonb_agg(company order by sort_order, id)
                           from public.resume_positions)
    ),
    'tags_by_category', (select jsonb_object_agg(k, n) from
                          (select coalesce(category, 'uncategorised') k, count(*) n
                             from public.tags group by 1) t),
    'index_by_type', (select jsonb_object_agg(k, n) from
                       (select entity_type k, count(distinct entity_id) n
                          from public.content_chunks group by 1) t),
    'now_current', (select jsonb_build_object('month', month, 'year', year)
                      from public.now_months where is_current limit 1),
    'top_tags', (select jsonb_agg(jsonb_build_object('name', name, 'total', total))
                   from (select name, total from public.tags_with_counts()
                         order by total desc limit 25) t),
    -- Every row of the small types, newest first, so the model can enumerate
    -- and link in full instead of naming the two or three that retrieval found.
    'roster', (select jsonb_object_agg(k, items) from (
        select c.entity_type as k,
               jsonb_agg(jsonb_build_object('t', c.title, 'd', c.chunk_date, 'u', c.url)
                         order by c.chunk_date desc nulls last, c.entity_id desc) as items
          from public.content_chunks c
         where c.chunk_index = 0
           and c.entity_type in ('book','trek','sport','project','presentation','instagram','video')
         group by c.entity_type) t),
    -- The big types, where a roster would not fit. Recency is not similarity,
    -- so "the latest micro post" is only answerable from here.
    'latest', (select jsonb_object_agg(k, item) from (
        select distinct on (c.entity_type)
               c.entity_type as k,
               jsonb_build_object('t', c.title, 'd', c.chunk_date, 'u', c.url) as item
          from public.content_chunks c
         where c.chunk_index = 0
           and c.chunk_date is not null
           and c.entity_type in ('microblog','blog','writing','now')
         order by c.entity_type, c.chunk_date desc) t)
  );
$fn$;

notify pgrst, 'reload schema';
