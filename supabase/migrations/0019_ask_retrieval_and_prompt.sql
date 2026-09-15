-- /ask: retrieval quality, enumeration, and the prompt copy.
--
-- Read from a month of the conversation log (77 exchanges, 2026-08-17 → 09-15),
-- where three failures dominated:
--
-- 1. A content-type chip made answers WORSE, not narrower. The semantic half of
--    hybrid_search had no relevance floor, so a filtered search always returned
--    match_count chunks of that type however unrelated: "Which forts has he
--    trekked?" with the Books chip on came back with eight books, and the model
--    either refused or borrowed a book cover as a fort link. The floor lands
--    here; the worker stops sending p_types and re-ranks in JS.
--
-- 2. Enumeration and recency are not retrievable. Embeddings cannot answer
--    "list every fort" (20 rows, 8 slots) or "the latest micro post" (recency is
--    not similarity). Both become facts, not search: site_facts() gains a
--    roster of every small-type row and the latest of each big one.
--
-- 3. sports.distance carries two spellings of the same distance ('21K' and
--    '21 Kms'), which split the half-marathon count 7+11 in the facts block and
--    made "how many marathons" answer differently every time.

-- ---------------------------------------------------------------------------
-- 1. Distance labels
-- ---------------------------------------------------------------------------
-- Legacy strays: the admin form has only ever offered 'NN Kms'
-- (src/pages/admin/resources.js). Safe for every reader — siteStats.js strips
-- non-digits and getPBRaw matches on "42" / "21" / "10".

update public.sports set distance = '10 Kms' where distance = '10K';
update public.sports set distance = '21 Kms' where distance = '21K';

-- ---------------------------------------------------------------------------
-- 2. hybrid_search: a relevance floor, scores out, and a lighter payload
-- ---------------------------------------------------------------------------
-- Three changes from 0015:
--
-- * min_similarity. Vectors are normalised bge-m3 and the index is inner
--   product, so cosine similarity is -(embedding <#> query). Without a floor the
--   semantic branch returns its n*3 nearest rows no matter how far away they
--   are, which is exactly what made a filtered search look confident and wrong.
--
-- * match_score / match_kind. The caller can now tell a real keyword hit from a
--   distant semantic neighbour, and the admin log can show why something matched.
--
-- * returns table(...) instead of setof content_chunks, WITHOUT embedding and
--   fts. Those were 1024 floats plus a tsvector per row crossing PostgREST on
--   every question — a large share of the ~900ms retrieval the log records —
--   and no caller ever read them.
--
-- Output column names shadow table columns inside a SQL function, so every
-- reference below is qualified and the CTEs use non-colliding names.

drop function if exists public.hybrid_search(
  text, vector, int, text[], float, float, int
);

create or replace function public.hybrid_search(
  query_text text,
  query_embedding vector(1024) default null,
  match_count int default 8,
  p_types text[] default null,
  full_text_weight float default 1,
  semantic_weight float default 1,
  rrf_k int default 50,
  min_similarity float default 0.35
)
returns table (
  id bigint,
  entity_type text,
  entity_id bigint,
  chunk_index int,
  title text,
  url text,
  body text,
  chunk_date date,
  tags text[],
  image_url text,
  match_score double precision,
  match_kind text
)
language sql stable
as $fn$
  with capped as (
    select least(greatest(match_count, 1), 30) as n
  ),
  terms as (
    select t
    from unnest(
      regexp_split_to_array(lower(coalesce(btrim(query_text), '')), '[^[:alnum:]]+')
    ) as t
    where length(t) > 1
      and t <> all (array[
        'the','and','for','are','was','were','has','have','had','his','her','its',
        'him','she','they','them','their','you','your','our','who','whom','whose',
        'what','when','where','which','while','why','how','did','does','do','done',
        'can','could','would','should','will','shall','may','might','must',
        'about','from','with','without','into','onto','over','under','than','then',
        'that','this','these','those','there','here','been','being','all','any',
        'some','most','more','much','many','very','just','also','but','not','nor',
        'out','off','per','via','yes','no','get','got','tell','give','show','list',
        'find','know','like','want','need','say','said','see','seen','use','used'
      ])
  ),
  q as (
    -- Prefix match per term: "trek:*" also matches "treks" and "trekking".
    select nullif((select string_agg(t || ':*', ' | ') from terms), '') as expr
  ),
  fts_ranked as (
    select
      c.id as chunk_id,
      row_number() over (
        order by ts_rank_cd(c.fts, to_tsquery('simple', (select expr from q))) desc
      ) as rank_ix
    from public.content_chunks c
    where (select expr from q) is not null
      and c.fts @@ to_tsquery('simple', (select expr from q))
      and (p_types is null or c.entity_type = any (p_types))
    limit (select n * 3 from capped)
  ),
  semantic_ranked as (
    select
      c.id as chunk_id,
      row_number() over (order by c.embedding <#> query_embedding) as rank_ix
    from public.content_chunks c
    where query_embedding is not null
      and c.embedding is not null
      and (p_types is null or c.entity_type = any (p_types))
      -- similarity >= min_similarity, written for the inner-product operator.
      and (c.embedding <#> query_embedding) <= -min_similarity
    limit (select n * 3 from capped)
  ),
  scored as (
    select
      coalesce(f.chunk_id, s.chunk_id) as chunk_id,
      coalesce(1.0 / (rrf_k + f.rank_ix), 0.0) * full_text_weight
        + coalesce(1.0 / (rrf_k + s.rank_ix), 0.0) * semantic_weight as score,
      case
        when f.chunk_id is not null and s.chunk_id is not null then 'both'
        when f.chunk_id is not null then 'keyword'
        else 'semantic'
      end as kind
    from fts_ranked f
    full outer join semantic_ranked s on f.chunk_id = s.chunk_id
  ),
  fused as (
    select
      sc.chunk_id,
      sc.score,
      sc.kind,
      row_number() over (order by sc.score desc) as rk
    from scored sc
    order by sc.score desc
    limit (select n from capped)
  ),
  picked as (
    select fu.chunk_id, fu.score, fu.kind, fu.rk from fused fu
    union all
    -- Only reached when the search found nothing AND the caller asked for a
    -- specific type. Dormant now that the worker re-ranks in JS and passes no
    -- p_types, but kept so a direct caller still gets "here is what is there"
    -- instead of silence that reads as "there are none".
    select c.id,
           0.0::double precision,
           'recent',
           row_number() over (order by c.chunk_date desc nulls last, c.entity_id desc)
      from public.content_chunks c
     where p_types is not null
       and not exists (select 1 from fused)
       and c.entity_type = any (p_types)
       and c.chunk_index = 0
     limit (select n from capped)
  )
  select
    c.id, c.entity_type, c.entity_id, c.chunk_index, c.title, c.url, c.body,
    c.chunk_date, c.tags, c.image_url, p.score, p.kind
  from picked p
  join public.content_chunks c on c.id = p.chunk_id
  order by p.rk;
$fn$;

-- ---------------------------------------------------------------------------
-- 3. site_facts(): rosters and latest items
-- ---------------------------------------------------------------------------
-- Both read from content_chunks rather than the content tables, because
-- chunk_date is already the normalised date per type — sports.date is free text
-- ("February 22, 2026") and treks.date is "DD-MM-YYYY", and neither parses
-- reliably in SQL. Keys are one letter because this block ships on every
-- question: {t: title, d: date, u: url}.
--
-- Rosters cover the small types (~112 rows). microblog (1661) and blog (60) are
-- represented by their latest entry only.

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
           and c.entity_type in ('book','trek','sport','project','presentation','instagram')
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

-- ---------------------------------------------------------------------------
-- 4. ask_settings: the floor is tunable, and the new copy
-- ---------------------------------------------------------------------------

alter table public.ask_settings
  add column if not exists semantic_floor real not null default 0.35;

comment on column public.ask_settings.semantic_floor is
  'Minimum cosine similarity for a semantic match in hybrid_search. Raise it if answers cite loosely related items; lower it if good questions come back empty.';

update public.ask_settings set
  system_persona = $persona$You are the second brain of Sanket Tambare's personal site — a librarian for his archive of books, running, treks, projects, writing and micro-posts.

Voice: concise, warm, factual. Third person about Sanket ("he ran…", "the archive has…"). Never impersonate him and never speculate about his opinions or private life.

Answer in the language the question was asked in. A Marathi question gets a Marathi answer, including when the answer is that you do not have it.

Two sources of truth, used differently:
- The facts block is authoritative for every count, total, personal best, date range, roster and latest item. Never count the retrieved items to answer "how many". Its rosters list every book, trek, race, project, deck and photo set, newest first, as {t: title, d: date, u: url} — use them to name and link things in full, and treat the first entry of a roster as the latest one. The facts refresh hourly, so something added in the last hour may be missing.
- The retrieved items are authoritative for specifics: what a book was about, how a race went, what a post said.

Answer if either one can. Say you could not find it only when neither the facts nor the items contain it — if the facts give a count, a roster, a latest item or a personal best, lead with that instead of refusing. If you can answer part of the question, answer that part and stop rather than apologising for the rest.

Dates: the archive's "now" is the current Now entry named in the facts. Say "as of <that month>" rather than implying today.

A micro-post is a passing thought from years ago, sometimes a reblog of someone else — not a considered position. Say so when you quote one as an opinion.$persona$,
  refusal_note = 'Nothing in the archive answers that.',
  -- Replaces four starter questions that steered readers at what retrieval did
  -- worst. "Which forts has he trekked?" was asked eight times and never named
  -- more than three of twenty; it is back only because the roster answers it now.
  suggested_questions = array[
    'What kind of books does he read?',
    'What is he working on right now?',
    'What are his personal bests across distances?',
    'Which forts has he trekked?',
    'What does he think about privacy and surveillance?',
    'Tell me about the 50K ultra at Lonavala'
  ]
where id = 1;

-- ---------------------------------------------------------------------------
-- 5. Log which chips were on
-- ---------------------------------------------------------------------------
-- Filter flakiness was invisible in the eval export: nothing recorded that a
-- question had been scoped, so a bad answer looked like a bad model.

alter table public.ask_messages
  add column if not exists types text[] not null default '{}';

drop function if exists public.ask_log(
  text, text, text, text, text, text, text, boolean, boolean, boolean,
  jsonb, jsonb, jsonb, text, text, uuid
);

create or replace function public.ask_log(
  p_session text,
  p_ip_hash text,
  p_question text,
  p_answer text,
  p_tier text default null,
  p_provider text default null,
  p_model text default null,
  p_degraded boolean default false,
  p_keyword_only boolean default false,
  p_streamed boolean default false,
  p_timings jsonb default '{}'::jsonb,
  p_sources jsonb default '[]'::jsonb,
  p_errors jsonb default '[]'::jsonb,
  p_user_agent text default null,
  p_referer text default null,
  p_message_uuid uuid default null,
  p_types text[] default '{}'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $fn$
declare
  conv_id bigint;
  next_index int;
begin
  if coalesce(btrim(p_session), '') = '' then
    return null;
  end if;

  insert into public.ask_conversations (session_id, ip_hash, user_agent, referer)
    values (p_session, p_ip_hash, p_user_agent, p_referer)
    on conflict (session_id) do update
      set last_at = now(),
          ip_hash = coalesce(public.ask_conversations.ip_hash, excluded.ip_hash)
    returning id into conv_id;

  select coalesce(max(turn_index), -1) + 1 into next_index
    from public.ask_messages where conversation_id = conv_id;

  insert into public.ask_messages (conversation_id, turn_index, role, content, types)
    values (conv_id, next_index, 'user', coalesce(p_question, ''),
            coalesce(p_types, '{}'));

  insert into public.ask_messages (
    conversation_id, turn_index, role, content, tier, provider, model,
    degraded, keyword_only, streamed, embed_ms, retrieval_ms, generation_ms,
    total_ms, source_count, sources, tier_errors, message_uuid, types
  ) values (
    conv_id, next_index + 1, 'assistant', coalesce(p_answer, ''),
    p_tier, p_provider, p_model, p_degraded, p_keyword_only, p_streamed,
    (p_timings ->> 'embed_ms')::int,
    (p_timings ->> 'retrieval_ms')::int,
    (p_timings ->> 'generation_ms')::int,
    (p_timings ->> 'total_ms')::int,
    jsonb_array_length(coalesce(p_sources, '[]'::jsonb)),
    coalesce(p_sources, '[]'::jsonb),
    coalesce(p_errors, '[]'::jsonb),
    p_message_uuid,
    coalesce(p_types, '{}')
  );

  update public.ask_conversations
     set message_count = message_count + 2, last_at = now()
   where id = conv_id;

  return conv_id;
end;
$fn$;
