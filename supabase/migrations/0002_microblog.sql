-- Personal site — micro-blog schema (Tumblr/Instagram short-post archive)
-- Apply via the Supabase SQL editor (paste & run) or `supabase db push`.
-- Depends on 0001_initial_schema.sql for public.set_updated_at() and
-- public.is_owner().
--
-- Conventions mirror 0001: snake_case columns, bigint identity PK,
-- created_at / updated_at (updated_at via trigger), text[] for tags,
-- RLS public SELECT + owner-only writes.
--
-- Server-side full-text search: a generated `search_tsv` tsvector (config
-- 'simple' — no stemming, so mixed English + Marathi/Hindi/Devanagari text
-- tokenises predictably) indexed with GIN.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.microblog (
  id         bigint generated always as identity primary key,
  source     text not null default 'tumblr',   -- 'tumblr' | 'instagram' | 'manual'
  source_id  text,                              -- original platform post id (dedup key)
  post_type  text not null default 'text',      -- 'text' | 'quote' | 'photo'
  date       date not null,                     -- post date (clean ISO from source)
  title      text not null default '',
  text       text not null default '',
  tags       text[] not null default '{}',
  url        text,                              -- original/external link (optional)
  image_url  text,                              -- optional single image (blank for now)
  search_tsv tsvector generated always as (
               to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(text, ''))
             ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Makes the importer idempotent. Manual rows use source_id = null; Postgres
  -- treats nulls as distinct, so multiple manual posts never collide.
  unique (source, source_id)
);

create index if not exists microblog_search_idx on public.microblog using gin (search_tsv);
create index if not exists microblog_tags_idx   on public.microblog using gin (tags);
create index if not exists microblog_date_idx   on public.microblog (date desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger + RLS (same shape as 0001)
-- ---------------------------------------------------------------------------

drop trigger if exists set_updated_at on public.microblog;
create trigger set_updated_at before update on public.microblog
  for each row execute function public.set_updated_at();

alter table public.microblog enable row level security;

drop policy if exists "public read" on public.microblog;
create policy "public read" on public.microblog for select using (true);

drop policy if exists "owner write" on public.microblog;
create policy "owner write" on public.microblog for all
  to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- Tag facets for the public filter UI: distinct tags with post counts.
-- Callable by the anon role via supabase.rpc('microblog_tag_facets').
-- ---------------------------------------------------------------------------

create or replace function public.microblog_tag_facets()
returns table (tag text, count bigint)
language sql stable as $$
  select unnest(tags) as tag, count(*) as count
  from public.microblog
  group by 1
  order by 2 desc, 1 asc;
$$;
