-- Keyword-only retrieval was ranking on question words.
--
-- 0010 made the terms OR rather than AND, which fixed "returns nothing". But it
-- left "which", "has", "he" as scoring terms, so a question like "which forts
-- has he trekked?" ranked the changelog and random micro posts above the trek
-- rows — the common words appear everywhere, and ts_rank_cd rewards them.
--
-- The 'simple' text search config has no stopword list by design (it is the
-- config this site uses precisely because it leaves Devanagari alone). So the
-- list lives here, applied to the QUERY only — the indexed documents keep every
-- word, so an exact phrase search still works.
--
-- English-only on purpose: Marathi question words are rare enough in the corpus
-- that they carry real signal, and stripping them would cost more than it saves.

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
    select nullif((select string_agg(t, ' | ') from terms), '') as expr
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
