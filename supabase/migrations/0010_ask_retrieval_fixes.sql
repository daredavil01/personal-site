-- Two fixes found while testing /ask end to end.
--
-- 1. Keyword search ANDed every word of the question.
--    `websearch_to_tsquery('simple', 'which forts has he trekked?')` requires
--    EVERY term to be present, and the 'simple' config has no stopword list, so
--    "which", "has" and "he" were treated as content words and the query matched
--    nothing. That is fine when the semantic half is carrying the result, but the
--    degraded (keyword-only) path is exactly when it is not — so questions
--    returned zero sources precisely when the fallback mattered. The rewrite ORs
--    the terms and lets ts_rank_cd sort them, which is what a question wants.
--
-- 2. The seeded Gemini model id was retired.
--    `gemini-2.5-flash-lite` now 404s for new API keys ("no longer available to
--    new users"). Pointing the default tier at the moving alias
--    `gemini-flash-lite-latest` means Google's deprecations stop being our
--    outage. Only updated if the row still carries the original seed, so a model
--    chosen by hand in /admin is never overwritten.

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
  -- Words of the question, ORed. Terms of one character are dropped; everything
  -- else survives, including Devanagari, which is alnum under a UTF-8 locale.
  q as (
    select nullif(
      (
        select string_agg(t, ' | ')
        from unnest(
          regexp_split_to_array(lower(coalesce(btrim(query_text), '')), '[^[:alnum:]]+')
        ) as t
        where length(t) > 1
      ), ''
    ) as expr
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

update public.ask_settings
   set tiers = jsonb_set(tiers, '{0,model}', '"gemini-flash-lite-latest"')
 where id = 1
   and tiers #>> '{0,model}' = 'gemini-2.5-flash-lite';
