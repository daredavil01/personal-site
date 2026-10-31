-- 0037: site_facts() — hidden rows out of the numbers, and what each project was.
--
-- Depends on 0035 (the current site_facts) and 0005 (projects.visible).
--
-- 1. Visible rows only. site_facts() is SECURITY INVOKER, so /ask (anon) never
--    saw the hidden project, but the judge and `npm run docs:build` call it with
--    the service role, which bypasses RLS: they counted 24 projects while the
--    roster (built from content_chunks, which never index a hidden project)
--    listed 23. Counts and breakdowns now say what the public can see,
--    whoever asks.
--
-- 2. A project's roster entry gains `x` = org · category · status. The roster
--    held only title, date and url, so "which projects were built for NGOs?"
--    could not be answered from the complete list — the model saw "YUNG
--    Foundation Website" and nothing saying who it was for. functions/api/ask.js
--    writes `x` on the roster line.

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
      'projects',   (select count(*) from public.projects where visible),
      'sports',     (select count(*) from public.sports),
      'treks',      (select count(*) from public.treks),
      'instagram',  (select count(*) from public.instagram),
      'videos',     (select count(*) from public.videos where visible),
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
                        where visible and status is not null group by 1) t),
      'by_category', (select jsonb_object_agg(k, n) from
                       (select category k, count(*) n from public.projects
                        where visible and category is not null group by 1) t)
    ),
    'sports', jsonb_build_object(
      'by_distance', (select jsonb_object_agg(k, n) from
                       (select distance k, count(*) n from public.sports
                        where distance is not null group by 1) t)
    ),
    'videos', jsonb_build_object(
      'by_kind', (select jsonb_object_agg(k, n) from
                   (select coalesce(kind_override, kind) k, count(*) n from public.videos
                    where visible group by 1) t)
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
                         || jsonb_strip_nulls(jsonb_build_object(
                              'x', nullif(concat_ws(' · ', p.org, p.category, p.status), '')))
                         order by c.chunk_date desc nulls last, c.entity_id desc) as items
          from public.content_chunks c
          left join public.projects p
            on c.entity_type = 'project' and p.id = c.entity_id
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
