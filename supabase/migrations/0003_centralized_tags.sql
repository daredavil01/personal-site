-- Personal site — centralized tags
-- Apply via the Supabase SQL editor (paste & run) or `supabase db push`.
-- Depends on 0001 (public.set_updated_at, public.is_owner) and 0002 (microblog).
--
-- One `tags` table holds every tag's metadata (display name, color, category);
-- one polymorphic `tag_associations` table links tags to rows in any content
-- table. Together they replace the per-table text[] tag columns, which stay in
-- place until scripts/migrate-tags-to-central.mjs has copied them over and
-- 0004_drop_legacy_tag_columns.sql removes them. This file is additive: the
-- live site keeps working while it is applied.
--
-- Reads:  select `*, tag_names` — tag_names(<table>) is a PostgREST computed
--         field returning the row's tag names in the order they were entered.
-- Writes: rpc('set_entity_tags', { p_type, p_id, p_names }) replaces a row's
--         whole tag set in one transaction.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.tags (
  id           bigint generated always as identity primary key,
  -- Canonical form: lowercase, trimmed. Every write path normalizes to it, so
  -- "Marathon" and "marathon " can never become two tags.
  name         text not null unique check (name = lower(btrim(name)) and name <> ''),
  display_name text,
  color        text check (color ~ '^#[0-9a-f]{6}$'),
  description  text,
  category     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- entity_id can't carry a foreign key (it points at a different table per
-- entity_type), so the delete_entity_tags trigger below does the cascading.
create table if not exists public.tag_associations (
  entity_type text   not null check (entity_type in
                ('book', 'blog', 'instagram', 'microblog', 'sport', 'trek', 'project')),
  entity_id   bigint not null,
  tag_id      bigint not null references public.tags (id) on delete cascade,
  position    int    not null default 0,   -- order the tags were entered in
  created_at  timestamptz not null default now(),
  primary key (entity_type, entity_id, tag_id)
);

-- The primary key covers lookups by entity; this covers lookups by tag.
create index if not exists tag_associations_tag_idx on public.tag_associations (tag_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger + RLS (same shape as 0001)
-- ---------------------------------------------------------------------------

drop trigger if exists set_updated_at on public.tags;
create trigger set_updated_at before update on public.tags
  for each row execute function public.set_updated_at();

do $$
declare
  t text;
begin
  foreach t in array array['tags', 'tag_associations'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "public read" on public.%I;', t);
    execute format(
      'create policy "public read" on public.%I for select using (true);', t);
    execute format('drop policy if exists "owner write" on public.%I;', t);
    execute format(
      'create policy "owner write" on public.%I for all
         to authenticated
         using (public.is_owner()) with check (public.is_owner());', t);
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- Orphan cleanup: deleting a content row deletes its associations.
-- ---------------------------------------------------------------------------

create or replace function public.delete_entity_tags()
returns trigger language plpgsql as $$
begin
  delete from public.tag_associations
   where entity_type = tg_argv[0] and entity_id = old.id;
  return old;
end;
$$;

do $$
declare
  pair text[];
begin
  foreach pair slice 1 in array array[
    ['books', 'book'], ['blogs', 'blog'], ['instagram', 'instagram'],
    ['microblog', 'microblog'], ['sports', 'sport'], ['treks', 'trek'],
    ['projects', 'project']
  ] loop
    execute format('drop trigger if exists delete_entity_tags on public.%I;', pair[1]);
    execute format(
      'create trigger delete_entity_tags after delete on public.%I
         for each row execute function public.delete_entity_tags(%L);', pair[1], pair[2]);
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- Read path: tag_names computed field, one overload per content table.
-- ---------------------------------------------------------------------------

create or replace function public.entity_tag_names(p_type text, p_id bigint)
returns text[] language sql stable as $$
  select coalesce(array_agg(t.name order by a.position, t.name), '{}')
  from public.tag_associations a
  join public.tags t on t.id = a.tag_id
  where a.entity_type = p_type and a.entity_id = p_id;
$$;

create or replace function public.tag_names(public.books)
returns text[] language sql stable as $$ select public.entity_tag_names('book', $1.id) $$;
create or replace function public.tag_names(public.blogs)
returns text[] language sql stable as $$ select public.entity_tag_names('blog', $1.id) $$;
create or replace function public.tag_names(public.instagram)
returns text[] language sql stable as $$ select public.entity_tag_names('instagram', $1.id) $$;
create or replace function public.tag_names(public.microblog)
returns text[] language sql stable as $$ select public.entity_tag_names('microblog', $1.id) $$;
create or replace function public.tag_names(public.sports)
returns text[] language sql stable as $$ select public.entity_tag_names('sport', $1.id) $$;
create or replace function public.tag_names(public.treks)
returns text[] language sql stable as $$ select public.entity_tag_names('trek', $1.id) $$;
create or replace function public.tag_names(public.projects)
returns text[] language sql stable as $$ select public.entity_tag_names('project', $1.id) $$;

-- ---------------------------------------------------------------------------
-- Write path. SECURITY INVOKER (the default), so RLS still limits it to the
-- owner; the service-role key used by the scripts bypasses RLS as usual.
-- Returns the normalized names so callers needn't re-read the row.
-- ---------------------------------------------------------------------------

create or replace function public.set_entity_tags(p_type text, p_id bigint, p_names text[])
returns text[] language plpgsql as $$
declare
  v_names text[];
begin
  -- lowercase + trim + drop blanks + dedupe, keeping first-entered order
  select coalesce(array_agg(n order by first_pos), '{}') into v_names
  from (
    select lower(btrim(raw)) as n, min(ord) as first_pos
    from unnest(coalesce(p_names, '{}')) with ordinality as u(raw, ord)
    where btrim(raw) <> ''
    group by 1
  ) s;

  insert into public.tags (name)
  select unnest(v_names)
  on conflict (name) do nothing;

  delete from public.tag_associations
   where entity_type = p_type and entity_id = p_id;

  insert into public.tag_associations (entity_type, entity_id, tag_id, position)
  select p_type, p_id, t.id, u.ord
  from unnest(v_names) with ordinality as u(n, ord)
  join public.tags t on t.name = u.n;

  return v_names;
end;
$$;

-- Merge one tag into another: re-point every association, then drop the old
-- tag. Renaming needs no function — associations reference the id, so a plain
-- update of tags.name is enough.
create or replace function public.merge_tags(p_from bigint, p_into bigint)
returns void language plpgsql as $$
begin
  if p_from = p_into then
    raise exception 'Cannot merge a tag into itself';
  end if;
  insert into public.tag_associations (entity_type, entity_id, tag_id, position)
  select a.entity_type, a.entity_id, p_into, a.position
  from public.tag_associations a
  where a.tag_id = p_from
  on conflict do nothing;
  delete from public.tags where id = p_from;
end;
$$;

-- ---------------------------------------------------------------------------
-- Queries for the tag hub, the admin, and the micro-blog.
-- Counts are computed live — a few hundred associations, no denormalized
-- usage_count to drift.
-- ---------------------------------------------------------------------------

create or replace function public.tags_with_counts()
returns table (
  id bigint, name text, display_name text, color text, description text,
  category text, counts jsonb, total int
)
language sql stable as $$
  select t.id, t.name, t.display_name, t.color, t.description, t.category,
         coalesce(c.counts, '{}'::jsonb), coalesce(c.total, 0)
  from public.tags t
  left join (
    select x.tag_id, jsonb_object_agg(x.entity_type, x.n) as counts, sum(x.n)::int as total
    from (
      select a.tag_id, a.entity_type, count(*)::int as n
      from public.tag_associations a
      group by 1, 2
    ) x
    group by x.tag_id
  ) c on c.tag_id = t.id
  order by 8 desc, 2 asc;
$$;

-- Everything carrying one tag, across every content table. `title` and
-- `subtitle` are whatever best names each kind of row.
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
  select 'project'::text, p.id, p.title, p.subtitle, p.date
    from public.projects p join hits h on h.et = 'project' and h.eid = p.id;
$$;

-- Tag counts per "YYYY-MM" month, for the micro-blog river strip.
create or replace function public.microblog_month_tags()
returns table (month text, tag text, count bigint)
language sql stable as $$
  select to_char(m.date, 'YYYY-MM'), t.name, count(*)
  from public.tag_associations a
  join public.tags t on t.id = a.tag_id
  join public.microblog m on m.id = a.entity_id
  where a.entity_type = 'microblog'
  group by 1, 2
  order by 1, 3 desc, 2;
$$;

-- Replaces the 0002 version (which unnested microblog.tags). Same signature
-- and return shape, so getMicroblogTagFacets() is unchanged.
create or replace function public.microblog_tag_facets()
returns table (tag text, count bigint)
language sql stable as $$
  select t.name as tag, count(*) as count
  from public.tag_associations a
  join public.tags t on t.id = a.tag_id
  where a.entity_type = 'microblog'
  group by 1
  order by 2 desc, 1 asc;
$$;

-- Make PostgREST pick up the new tables, functions and computed fields now.
notify pgrst, 'reload schema';
