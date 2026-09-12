-- Two retrieval failures seen in use, both on the keyword-only path (which is
-- what runs whenever the embedding call is unavailable):
--
-- 1. "Get details for all treks" returned nothing. The 'simple' config does not
--    stem, so "treks" never matched a chunk that says "Trek: Jivdhan". Every
--    term now gets a prefix match (trek:*), which makes singular/plural and
--    simple inflections work without stemming Devanagari.
--
-- 2. A question filtered to one content type could still come back empty, which
--    reads as "there are no treks" when the archive has twenty. When a type
--    filter is set and the search finds nothing, fall back to the newest rows
--    OF THAT TYPE — an honest "here is what is there" instead of silence.

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
      c.id,
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
      c.id,
      row_number() over (order by c.embedding <#> query_embedding) as rank_ix
    from public.content_chunks c
    where query_embedding is not null
      and c.embedding is not null
      and (p_types is null or c.entity_type = any (p_types))
    limit (select n * 3 from capped)
  ),
  -- Ids only, so the fallback branch below can union against it without the
  -- column counts diverging (the function returns setof content_chunks).
  fused as (
    select
      coalesce(f.id, s.id) as id,
      row_number() over (
        order by
          coalesce(1.0 / (rrf_k + f.rank_ix), 0.0) * full_text_weight
          + coalesce(1.0 / (rrf_k + s.rank_ix), 0.0) * semantic_weight desc
      ) as rk
    from fts_ranked f
    full outer join semantic_ranked s on f.id = s.id
    limit (select n from capped)
  ),
  picked as (
    select id, rk from fused
    union all
    -- Only reached when the search found nothing AND the caller asked for a
    -- specific type. Newest first, so "all treks" answers with real treks
    -- instead of silence that reads as "there are none".
    select c.id,
           row_number() over (order by c.chunk_date desc nulls last, c.entity_id desc)
      from public.content_chunks c
     where p_types is not null
       and not exists (select 1 from fused)
       and c.entity_type = any (p_types)
       and c.chunk_index = 0
     limit (select n from capped)
  )
  select c.*
    from picked p
    join public.content_chunks c on c.id = p.id
   order by p.rk;
$fn$;
