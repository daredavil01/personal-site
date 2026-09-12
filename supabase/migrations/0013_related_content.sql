-- "More like this" on detail pages, from the /ask index.
--
-- The embeddings already exist for every book, trek, race, project and post, so
-- a nearest-neighbour lookup is free: no second index, no extra pipeline, no
-- model call at read time. The query vector is the item's OWN stored embedding,
-- which is why this needs no API key on the client.
--
-- Chunks of the same entity are excluded, so a multi-chunk project cannot fill
-- its own related strip.

create or replace function public.related_content(
  p_type text,
  p_id bigint,
  p_limit int default 6,
  p_types text[] default null
)
returns table (
  entity_type text,
  entity_id bigint,
  title text,
  url text,
  chunk_date date,
  tags text[],
  similarity float
)
language sql stable
as $fn$
  with seed as (
    select embedding
      from public.content_chunks
     where entity_type = p_type and entity_id = p_id and embedding is not null
     order by chunk_index
     limit 1
  )
  select distinct on (c.entity_type, c.entity_id)
    c.entity_type, c.entity_id, c.title, c.url, c.chunk_date, c.tags,
    -- Inner product on normalised vectors, flipped back to "higher is closer".
    (-(c.embedding <#> (select embedding from seed)))::float
  from public.content_chunks c
  where (select embedding from seed) is not null
    and c.embedding is not null
    and not (c.entity_type = p_type and c.entity_id = p_id)
    and (p_types is null or c.entity_type = any (p_types))
  order by c.entity_type, c.entity_id,
           c.embedding <#> (select embedding from seed)
  limit greatest(least(p_limit * 4, 100), 1);
$fn$;

-- distinct on has to sort by its own keys first, so the caller gets the best
-- chunk per entity but not a globally sorted list. This wrapper re-sorts and
-- trims to the requested count.
create or replace function public.related_content_ranked(
  p_type text,
  p_id bigint,
  p_limit int default 6,
  p_types text[] default null
)
returns table (
  entity_type text,
  entity_id bigint,
  title text,
  url text,
  chunk_date date,
  tags text[],
  similarity float
)
language sql stable
as $fn$
  select *
    from public.related_content(p_type, p_id, p_limit, p_types)
   order by similarity desc
   limit greatest(least(p_limit, 24), 1);
$fn$;
