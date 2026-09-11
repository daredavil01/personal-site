-- Projects: drop hand-maintained ordering, normalize dates to real dates,
-- make the cover image optional, and add the metadata the redesigned
-- /projects page needs (category, status, role/org, stack, screenshots,
-- links, featured, visibility, highlights, case-study fields).
--
-- Apply via the Supabase SQL editor (paste & run) or `supabase db push`.
-- Depends on 0001 (public.is_owner, the projects table) and 0003 (central tags).

-- ---------------------------------------------------------------------------
-- 1. Cover image is now optional
-- ---------------------------------------------------------------------------
alter table public.projects alter column image drop not null;

-- ---------------------------------------------------------------------------
-- 2. Ordering is by date from here on
-- ---------------------------------------------------------------------------
alter table public.projects drop column if exists sort_order;

-- ---------------------------------------------------------------------------
-- 3. Normalize the free-text dates, then make the column a real date
-- ---------------------------------------------------------------------------
alter table public.projects alter column date drop not null;

update public.projects as p set date = v.date
from (values
  ('Expense Management Web-App using firebase',        '2020-10-20'),
  ('Personal Website',                                 '2020-10-20'),
  ('Social-Ape',                                       '2020-11-20'),
  ('RunLog',                                           '2026-03-01'),
  ('RunSmart',                                         '2026-03-01'),
  ('Young Foundation Nisarg School Management Portal', '2026-07-01'),  -- was "July 2026"
  ('YUNG Foundation Website',                          '2026-08-01'),  -- was "August 2026"
  ('RunFolio',                                         '2026-08-01'),
  ('Visiting Card',                                    '2026-08-01'),
  ('E20 ka Chakravyuha',                               '2026-08-01'),
  ('Antyodaya Foundation Website',                     '2026-08-01'),
  ('CMS Site Planner',                                 '2026-08-01'),
  ('Personal Websites & Projects Directory',           '2026-08-01')
) as v(title, date)
where p.title = v.title;

-- Safety net: anything unmatched above that still isn't ISO is cleared rather
-- than blocking the type conversion. Re-enter it via /admin.
update public.projects set date = null
where date is not null and date !~ '^\d{4}-\d{2}-\d{2}$';

alter table public.projects alter column date type date using date::date;

-- ---------------------------------------------------------------------------
-- 4. New columns
-- ---------------------------------------------------------------------------
alter table public.projects
  add column if not exists slide_images jsonb   not null default '[]',   -- [{url, caption}]
  add column if not exists links        jsonb   not null default '[]',   -- [{label, url}]
  add column if not exists tech_stack   text[]  not null default '{}',
  add column if not exists highlights   text[]  not null default '{}',
  add column if not exists category     text,
  add column if not exists status       text,
  add column if not exists role         text,
  add column if not exists org          text,
  add column if not exists featured     boolean not null default false,
  add column if not exists visible      boolean not null default true,
  add column if not exists problem      text,
  add column if not exists solution     text,
  add column if not exists outcome      text;

alter table public.projects drop constraint if exists projects_category_check;
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects
  add constraint projects_category_check check (category is null or category in
    ('Web App', 'Website', 'Data Story', 'Tool', 'Design', 'Other')),
  add constraint projects_status_check check (status is null or status in
    ('Live', 'In Progress', 'Archived', 'Concept'));

create index if not exists projects_tech_stack_idx on public.projects using gin (tech_stack);

-- ---------------------------------------------------------------------------
-- 5. First-pass category/org, inferred from the current titles and subtitles.
--    REVIEW THESE IN /admin — they are a starting point, not ground truth.
-- ---------------------------------------------------------------------------
update public.projects set category = 'Web App'    where title in
  ('Expense Management Web-App using firebase', 'Social-Ape', 'RunLog', 'RunSmart',
   'RunFolio', 'Young Foundation Nisarg School Management Portal');
update public.projects set category = 'Website'    where title in
  ('Personal Website', 'YUNG Foundation Website', 'Antyodaya Foundation Website',
   'Personal Websites & Projects Directory');
update public.projects set category = 'Data Story' where title = 'E20 ka Chakravyuha';
update public.projects set category = 'Tool'       where title = 'CMS Site Planner';
update public.projects set category = 'Design'     where title = 'Visiting Card';

update public.projects set org = 'YUNG Foundation' where title in
  ('YUNG Foundation Website', 'Young Foundation Nisarg School Management Portal');
update public.projects set org = 'Antyodaya Foundation' where title = 'Antyodaya Foundation Website';

-- ---------------------------------------------------------------------------
-- 6. Hidden projects must not reach anonymous visitors at all, so this is
--    enforced in RLS rather than by filtering in React. 0001 gave every content
--    table `for select using (true)`; projects gets a narrower one. is_owner()
--    reads auth.jwt()->>'email', which is '' for anon, so anon sees only
--    visible rows while /admin (authenticated owner) still sees everything.
-- ---------------------------------------------------------------------------
drop policy if exists "public read" on public.projects;
create policy "public read" on public.projects
  for select using (visible or public.is_owner());

-- ---------------------------------------------------------------------------
-- 7. tag_entities() declares `date text` and the projects arm passed p.date
--    through raw, which only type-checked while projects.date was text. Now
--    that it is a real date, cast it — the same way the microblog arm already
--    does. The function stays `security invoker`, so RLS applies to the caller
--    and hidden projects correctly drop out of /tags/:name.
-- ---------------------------------------------------------------------------
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
    from public.projects p join hits h on h.et = 'project' and h.eid = p.id;
$$;

notify pgrst, 'reload schema';
