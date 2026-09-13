-- 0018: Presentations — HTML slide decks embedded by URL.
--
-- A deck is hosted elsewhere (GitHub Pages today) and rendered on /presentations
-- in an <iframe>, so a row is just metadata + the deck's https URL. Adding a
-- deck is an /admin edit, never a deploy. The host must allow framing (no
-- X-Frame-Options / frame-ancestors); the viewer always offers "Open original".
--
-- Tags use the central tables (0003): extend the entity_type CHECK, add the
-- tag_names computed field, the delete trigger, and a tag_entities() arm.

create table if not exists public.presentations (
  id          bigint generated always as identity primary key,
  title       text not null,
  description text,
  url         text not null unique check (url ~ '^https://'),
  date        date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.presentations;
create trigger set_updated_at before update on public.presentations
  for each row execute function public.set_updated_at();

alter table public.presentations enable row level security;

drop policy if exists "public read" on public.presentations;
create policy "public read" on public.presentations for select using (true);

drop policy if exists "owner write" on public.presentations;
create policy "owner write" on public.presentations for all
  to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------

alter table public.tag_associations
  drop constraint if exists tag_associations_entity_type_check;
alter table public.tag_associations
  add constraint tag_associations_entity_type_check check (entity_type in
    ('book', 'blog', 'instagram', 'microblog', 'sport', 'trek', 'project', 'presentation'));

create or replace function public.tag_names(public.presentations)
returns text[] language sql stable as $$ select public.entity_tag_names('presentation', $1.id) $$;

drop trigger if exists delete_entity_tags on public.presentations;
create trigger delete_entity_tags after delete on public.presentations
  for each row execute function public.delete_entity_tags('presentation');

-- Same as 0005 plus the presentation arm.
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
    from public.presentations pr join hits h on h.et = 'presentation' and h.eid = pr.id;
$$;

-- ---------------------------------------------------------------------------
-- Seed: the first decks. Dates and tags are filled in from /admin.
-- ---------------------------------------------------------------------------

insert into public.presentations (title, description, url) values
  ('The Wanderer''s Digital Escape',
   'A deck on digital wellbeing: stepping back from the feed and taking attention back.',
   'https://daredavil01.github.io/daredavil01/digital-wellbeing/index.html'),
  ('What the Archive Knows',
   'Audit of the Ask the Archive second brain on sankettambare.in: data-source coverage, what full blog text costs, incremental ingestion, richer answers and reader feedback as evals.',
   'https://daredavil01.github.io/daredavil01/docs/what-the-archive-knows.html'),
  ('RunFolio — Every Finish, Framed',
   'A six-panel introduction to RunFolio: a race portfolio for runners, built on Astro, Cloudflare Workers and Supabase.',
   'https://daredavil01.github.io/daredavil01/docs/runfolio-overview.html'),
  ('A Developer, Measured',
   'A field-almanac infographic of Sanket Tambare as a developer: nine years of roles, a rated stack, the things that shipped, and the miles, books and words that share the same hours.',
   'https://daredavil01.github.io/daredavil01/developer-infographic/index.html'),
  ('The Wanderer''s Atlas — Feature Dossier',
   'The feature dossier for the Wanderer''s Atlas redesign of this personal website.',
   'https://daredavil01.github.io/daredavil01/docs/personal-website-redesign.html'),
  ('Yung Foundation website',
   'A single-page overview of the Yung Foundation website: every page, what staff can edit, and the architecture underneath.',
   'https://daredavil01.github.io/daredavil01/docs/yung-foundation-site-overview.html'),
  ('E20 ka Chakravyuha',
   'A 12-slide deck on E20 ka Chakravyuha: India''s 20% ethanol blending milestone, the 2026 sugar price surge, and how the data story behind it was built.',
   'https://daredavil01.github.io/daredavil01/presentations/e20-ka-chakravyuha.html')
on conflict (url) do nothing;
