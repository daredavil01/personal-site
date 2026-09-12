-- Second Brain — the search index and runtime config behind /ask.
--
-- Three things live here:
--   1. content_chunks  — one searchable, embedded row per piece of site content,
--                        polymorphic over the existing tables exactly like
--                        tag_associations (0003). Written only by
--                        `npm run ask:index`.
--   2. hybrid_search() — keyword (tsvector) + semantic (pgvector) fused with
--                        Reciprocal Rank Fusion. Degrades to keyword-only when
--                        the caller passes a null embedding, so the /ask worker
--                        has one code path whether or not it could embed.
--   3. ask_settings / ask_usage / ask_quota() — every limit, model tier and
--                        prompt the worker reads, editable from /admin without a
--                        redeploy, plus the fail-closed daily counters.
--
-- Conventions follow 0001: snake_case, bigint identity PKs, updated_at trigger,
-- RLS public-select + owner-write.

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- 1. The index
-- ---------------------------------------------------------------------------

create table if not exists public.content_chunks (
  id bigint generated always as identity primary key,
  entity_type text not null check (entity_type in (
    'book', 'blog', 'instagram', 'microblog', 'sport', 'trek', 'project',
    'now', 'page'
  )),
  entity_id bigint not null,
  chunk_index int not null default 0,
  title text not null default '',
  url text not null default '',
  body text not null default '',
  chunk_date date,
  tags text[] not null default '{}',
  -- 1024 dims = @cf/baai/bge-m3. Multilingual on purpose: titles and tags are
  -- part Marathi, which an English-only model silently mangles.
  embedding vector(1024),
  -- 'simple', not 'english' — same reason as the microblog index in 0002:
  -- stemming Devanagari is worse than not stemming at all.
  fts tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, ''))
  ) stored,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id, chunk_index)
);

create index if not exists content_chunks_fts_idx
  on public.content_chunks using gin (fts);
-- Inner product, so the indexer must write normalised vectors (bge-m3 does).
create index if not exists content_chunks_embedding_idx
  on public.content_chunks using hnsw (embedding vector_ip_ops);
create index if not exists content_chunks_type_idx
  on public.content_chunks (entity_type);
create index if not exists content_chunks_date_idx
  on public.content_chunks (chunk_date desc nulls last);

drop trigger if exists content_chunks_set_updated_at on public.content_chunks;
create trigger content_chunks_set_updated_at
  before update on public.content_chunks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Retrieval
-- ---------------------------------------------------------------------------

-- Reciprocal Rank Fusion over the two rankings, per Supabase's hybrid-search
-- guide. `query_embedding` is nullable: when it is null the semantic CTE
-- matches nothing and the result is a pure keyword search, which is the
-- degraded path the worker falls back to when the embedding call fails.
create or replace function public.hybrid_search(
  query_text text,
  query_embedding vector(1024) default null,
  match_count int default 8,
  p_types text[] default null,
  full_text_weight float default 1,
  semantic_weight float default 1,
  rrf_k int default 50
)
returns setof public.content_chunks
language sql stable
as $fn$
  with capped as (
    select least(greatest(match_count, 1), 30) as n
  ),
  fts_ranked as (
    select
      c.id,
      row_number() over (
        order by ts_rank_cd(c.fts, websearch_to_tsquery('simple', query_text)) desc
      ) as rank_ix
    from public.content_chunks c
    where coalesce(btrim(query_text), '') <> ''
      and c.fts @@ websearch_to_tsquery('simple', query_text)
      and (p_types is null or c.entity_type = any (p_types))
    limit (select n * 3 from capped)
  ),
  semantic_ranked as (
    select
      c.id,
      row_number() over (order by c.embedding <#> query_embedding) as rank_ix
    from public.content_chunks c
    where query_embedding is not null
      and c.embedding is not null
      and (p_types is null or c.entity_type = any (p_types))
    limit (select n * 3 from capped)
  )
  select c.*
  from fts_ranked f
  full outer join semantic_ranked s on f.id = s.id
  join public.content_chunks c on c.id = coalesce(f.id, s.id)
  order by
    coalesce(1.0 / (rrf_k + f.rank_ix), 0.0) * full_text_weight
    + coalesce(1.0 / (rrf_k + s.rank_ix), 0.0) * semantic_weight desc
  limit (select n from capped);
$fn$;

-- The "facts card": everything a counting question needs, in one round trip.
-- SECURITY INVOKER, so projects RLS (0005) keeps hidden projects out of the
-- public counts for free.
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
                      (select post_type k, count(*) n from public.microblog group by 1) t)
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
    'now_current', (select jsonb_build_object('month', month, 'year', year)
                      from public.now_months where is_current limit 1),
    'top_tags', (select jsonb_agg(jsonb_build_object('name', name, 'total', total))
                   from (select name, total from public.tags_with_counts()
                         order by total desc limit 25) t)
  );
$fn$;

-- ---------------------------------------------------------------------------
-- 3. Runtime config + quota
-- ---------------------------------------------------------------------------

-- Singleton config row, same id=1 trick as now_meta (0001). Nothing secret
-- lives here — API keys are Cloudflare Pages secrets — so public read is fine
-- and lets the worker fetch it with the anon key.
create table if not exists public.ask_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default true,
  daily_global_cap int not null default 300,
  daily_ip_cap int not null default 15,
  max_message_chars int not null default 500,
  max_history_turns int not null default 8,
  match_count int not null default 8,
  full_text_weight double precision not null default 1,
  semantic_weight double precision not null default 1,
  -- Ordered ladder: [{name, provider, model, enabled, timeout_ms}]
  tiers jsonb not null default '[]'::jsonb,
  system_persona text not null default '',
  refusal_note text not null default '',
  disabled_note text not null default '',
  quota_note text not null default '',
  suggested_questions text[] not null default '{}',
  -- Mirrors docs/chatbot-context.md; refreshed by `npm run docs:build`.
  context_doc text not null default '',
  context_doc_updated_at timestamptz,
  turnstile_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists ask_settings_set_updated_at on public.ask_settings;
create trigger ask_settings_set_updated_at
  before update on public.ask_settings
  for each row execute function public.set_updated_at();

-- One row per (day, ip_hash). The global counter is the reserved '' hash.
create table if not exists public.ask_usage (
  day date not null default current_date,
  ip_hash text not null,
  count int not null default 0,
  tier_mix jsonb not null default '{}'::jsonb,
  primary key (day, ip_hash)
);

create index if not exists ask_usage_day_idx on public.ask_usage (day desc);

-- Atomic check-and-increment. SECURITY DEFINER because anon cannot touch
-- ask_usage directly — this RPC is the only door. Caps are read from
-- ask_settings, so changing a limit in /admin takes effect without a deploy.
create or replace function public.ask_quota(p_ip_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  s public.ask_settings%rowtype;
  global_count int;
  ip_count int;
begin
  select * into s from public.ask_settings where id = 1;
  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'unconfigured');
  end if;
  if not s.enabled then
    return jsonb_build_object('allowed', false, 'reason', 'disabled');
  end if;

  insert into public.ask_usage (day, ip_hash, count)
    values (current_date, '', 1)
    on conflict (day, ip_hash) do update set count = public.ask_usage.count + 1
    returning count into global_count;

  insert into public.ask_usage (day, ip_hash, count)
    values (current_date, coalesce(nullif(p_ip_hash, ''), 'unknown'), 1)
    on conflict (day, ip_hash) do update set count = public.ask_usage.count + 1
    returning count into ip_count;

  if global_count > s.daily_global_cap then
    return jsonb_build_object('allowed', false, 'reason', 'global_cap',
                              'remaining_global', 0);
  end if;
  if ip_count > s.daily_ip_cap then
    return jsonb_build_object('allowed', false, 'reason', 'ip_cap',
                              'remaining_ip', 0);
  end if;

  return jsonb_build_object(
    'allowed', true,
    'remaining_ip', s.daily_ip_cap - ip_count,
    'remaining_global', s.daily_global_cap - global_count
  );
end;
$fn$;

-- Records which tier actually answered, so an all-fallback week is visible in
-- /admin without digging through Cloudflare logs. Best-effort: never blocks.
create or replace function public.ask_record_tier(p_tier text)
returns void
language sql
security definer
set search_path = public
as $fn$
  update public.ask_usage
     set tier_mix = jsonb_set(
       tier_mix, array[p_tier],
       to_jsonb(coalesce((tier_mix ->> p_tier)::int, 0) + 1), true)
   where day = current_date and ip_hash = '';
$fn$;

-- ---------------------------------------------------------------------------
-- 4. Schema introspection for `npm run docs:build`
-- ---------------------------------------------------------------------------

-- PostgREST exposes only the `public` schema, so the docs generator cannot read
-- information_schema directly. These two return the column list and the CHECK
-- constraints of the public tables, which is everything docs/data-model.md
-- needs to stay in step with the migrations automatically.
create or replace function public.schema_columns()
returns table (
  table_name text, column_name text, data_type text,
  is_nullable boolean, column_default text, ordinal_position int
)
language sql stable
as $fn$
  select c.relname::text, a.attname::text,
         format_type(a.atttypid, a.atttypmod)::text,
         not a.attnotnull,
         pg_get_expr(d.adbin, d.adrelid)::text,
         a.attnum::int
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
   where n.nspname = 'public'
     and c.relkind = 'r'
     and a.attnum > 0
     and not a.attisdropped
   order by c.relname, a.attnum;
$fn$;

create or replace function public.schema_checks()
returns table (table_name text, constraint_name text, definition text)
language sql stable
as $fn$
  select c.relname::text, con.conname::text, pg_get_constraintdef(con.oid)::text
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and con.contype = 'c'
   order by c.relname, con.conname;
$fn$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['content_chunks', 'ask_settings'] loop
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

-- ask_usage is not public: anon reaches it only through ask_quota()
-- (SECURITY DEFINER). The owner reads it for the /admin usage panel.
alter table public.ask_usage enable row level security;
drop policy if exists "owner read" on public.ask_usage;
create policy "owner read" on public.ask_usage
  for select to authenticated using (public.is_owner());
drop policy if exists "owner write" on public.ask_usage;
create policy "owner write" on public.ask_usage
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- Seed the singleton config
-- ---------------------------------------------------------------------------

insert into public.ask_settings (id, tiers, system_persona, refusal_note,
                                 disabled_note, quota_note, suggested_questions)
values (
  1,
  '[
    {"name": "gemini-flash-lite", "provider": "gemini",
     "model": "gemini-flash-lite-latest", "enabled": true, "timeout_ms": 6000},
    {"name": "cf-gpt-oss-20b", "provider": "workers-ai",
     "model": "@cf/openai/gpt-oss-20b", "enabled": true, "timeout_ms": 8000},
    {"name": "cf-llama-3.2-3b", "provider": "workers-ai",
     "model": "@cf/meta/llama-3.2-3b-instruct", "enabled": true, "timeout_ms": 8000}
  ]'::jsonb,
  'You are the second brain of Sanket Tambare''s personal site. Answer questions about his books, running, treks, projects, writing and micro-blog archive using ONLY the retrieved content and the facts block given to you. Be concise and warm. Speak about the archive in the third person ("the archive has...", "he wrote...") — never impersonate Sanket. Always ground claims in the retrieved items. If the retrieved content does not answer the question, say so plainly and suggest what the site does cover.',
  'I could not find that in the archive.',
  'The second brain is switched off right now.',
  'The second brain has answered its quota of questions for today — it wakes up again at midnight UTC.',
  array[
    'What kind of books does he read?',
    'Which forts has he trekked?',
    'What is he working on right now?',
    'How many marathons has he run?'
  ]
)
on conflict (id) do nothing;
