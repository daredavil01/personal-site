-- 0023 — retrieval relevance: stem English, floor the keyword half, and report
-- the two raw scores.
--
-- Depends on 0009 (content_chunks) and 0019 (the current hybrid_search).
--
-- Three facts measured against this database, in the order they matter:
--
-- 1. match_score carried no relevance. Every query returned the same ladder,
--    0.0196, 0.0192, 0.0189 … — that is 1/(rrf_k + rank) and nothing else. RRF
--    fuses *rank positions*, so ts_rank_cd was computed, used to order, and then
--    thrown away. Nothing downstream could tell a perfect match from a junk one,
--    which is why the worker always handed the model eight items even when none
--    of them matched, and why every confident wrong answer had eight sources
--    under it.
--
-- 2. 'simple' does not stem, so "trekked" did not match "trek" and "marathons"
--    did not match "marathon". Live, before this migration:
--      "Which forts has he trekked"   -> zero trek chunks
--      "How many marathons has he run" -> zero sport chunks
--      "marathon"                      -> correct hits
--    The config is not the bug — it is the reason Marathi works at all
--    (0009_second_brain.sql:41). So this adds a SECOND vector rather than
--    replacing the first: English stems in fts_en, Devanagari stays unstemmed in
--    fts, and the keyword branch matches either.
--
-- 3. The keyword half had no floor of any kind. The semantic half has had
--    min_similarity since 0019; its twin could return anything containing any
--    prefix of any non-stopword term, ranked only against other matches. A
--    question with no answer in the archive still filled every slot.
--
-- What this does NOT do, deliberately:
--
-- * No per-type weight. Micro-blog is 56% of the index, but weighting a type in
--   SQL makes relevance depend on what the corpus happens to hold. The slot cap
--   for that lives in src/lib/askRetrieval.js, where it can see the question.
-- * No re-embedding. Only the tsvector side changes, so every stored vector and
--   the hnsw index are untouched.
-- * No recency term. Recency questions are answered from site_facts().roster,
--   not from search.

-- ---------------------------------------------------------------------------
-- 1. The English vector, beside the existing one
-- ---------------------------------------------------------------------------
-- Generated and stored, like fts, so it stays in step with title/body without a
-- trigger. Backfills itself on add; ~2,969 rows, seconds.

alter table public.content_chunks
  add column if not exists fts_en tsvector
  generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
  ) stored;

create index if not exists content_chunks_fts_en_idx
  on public.content_chunks using gin (fts_en);

-- ---------------------------------------------------------------------------
-- 2. hybrid_search(): stemmed OR unstemmed, floored, and honest about scores
-- ---------------------------------------------------------------------------
-- The 0019 signature is dropped explicitly: adding a defaulted parameter makes
-- the old and new forms ambiguous to the resolver rather than replacing it.

drop function if exists public.hybrid_search(
  text, vector, int, text[], float, float, int, float
);

create or replace function public.hybrid_search(
  query_text text,
  query_embedding vector(1024) default null,
  match_count int default 8,
  p_types text[] default null,
  full_text_weight float default 1,
  semantic_weight float default 1,
  rrf_k int default 50,
  min_similarity float default 0.35,
  -- Normalised ts_rank_cd, so this is comparable across queries. 0 disables the
  -- floor and restores 0019's behaviour exactly.
  min_keyword_rank float default 0.02
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
  match_kind text,
  -- The two halves, unfused. match_score still orders the result; these say how
  -- well each side actually did, which is what the caller needs to drop a weak
  -- match and what the admin log needs to show why something was retrieved.
  kw_score double precision,
  sem_score double precision
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
  qq as (
    -- Two readings of the same expression. 'english' stems both sides, so
    -- "trekked" reaches "trek"; 'simple' leaves Devanagari alone. A term the
    -- English config considers a stopword drops out of q_en and survives in
    -- q_simple, which is the right way round.
    select
      to_tsquery('simple', (select expr from q))  as q_simple,
      to_tsquery('english', (select expr from q)) as q_en
    where (select expr from q) is not null
  ),
  fts_scored as (
    select
      c.id as chunk_id,
      -- Normalisation flag 32 is rank/(rank+1), so this lands in [0,1) and a
      -- floor means the same thing for every query. Without it ts_rank_cd is an
      -- unbounded number whose scale depends on the query's term count.
      greatest(
        ts_rank_cd(c.fts, (select q_simple from qq), 32),
        ts_rank_cd(c.fts_en, (select q_en from qq), 32)
      ) as kw
    from public.content_chunks c
    where exists (select 1 from qq)
      and (
        c.fts @@ (select q_simple from qq)
        or c.fts_en @@ (select q_en from qq)
      )
      and (p_types is null or c.entity_type = any (p_types))
  ),
  fts_ranked as (
    select
      f.chunk_id,
      f.kw,
      row_number() over (order by f.kw desc, f.chunk_id) as rank_ix
    from fts_scored f
    where f.kw >= min_keyword_rank
    order by f.kw desc
    limit (select n * 3 from capped)
  ),
  semantic_ranked as (
    select
      c.id as chunk_id,
      -- The operator returns negative inner product; report the similarity.
      (-(c.embedding <#> query_embedding))::double precision as sim,
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
      f.kw as kw,
      s.sim as sim,
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
      sc.kw,
      sc.sim,
      row_number() over (order by sc.score desc) as rk
    from scored sc
    order by sc.score desc
    limit (select n from capped)
  ),
  picked as (
    select fu.chunk_id, fu.score, fu.kind, fu.kw, fu.sim, fu.rk from fused fu
    union all
    -- Only reached when the search found nothing AND the caller asked for a
    -- specific type. Dormant now that the worker re-ranks in JS and passes no
    -- p_types, but kept so a direct caller still gets "here is what is there"
    -- instead of silence that reads as "there are none".
    select c.id,
           0.0::double precision,
           'recent',
           null::double precision,
           null::double precision,
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
    c.chunk_date, c.tags, c.image_url, p.score, p.kind, p.kw, p.sim
  from picked p
  join public.content_chunks c on c.id = p.chunk_id
  order by p.rk;
$fn$;

-- ---------------------------------------------------------------------------
-- 3. The floor as a setting, not a constant
-- ---------------------------------------------------------------------------
-- semantic_floor has been editable at /admin/ask/settings since 0019; its twin
-- should be too. The right value depends on the corpus, and finding it should be
-- a slider rather than a deploy. Mirrored in DEFAULT_ASK_SETTINGS
-- (src/data/askConfig.js) — keep the two in step.

alter table public.ask_settings
  add column if not exists keyword_floor real not null default 0.02;
