-- related_content returned almost nothing but blog posts.
--
-- `distinct on (entity_type, entity_id)` forces the query to sort by those
-- columns FIRST, so the row limit was consumed in alphabetical order of
-- entity_type — 'blog' before 'book' before 'microblog' — instead of by
-- distance. A trek's "more like this" was four marathon blog posts.
--
-- The fix is to take the nearest neighbours first and dedupe afterwards, which
-- is also the order the HNSW index can actually serve.

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
  ),
  near as (
    -- Nearest first, straight off the HNSW index. Over-fetch, because several
    -- chunks of one entity can occupy the top of this list.
    select c.entity_type, c.entity_id, c.title, c.url, c.chunk_date, c.tags,
           c.embedding <#> (select embedding from seed) as distance
      from public.content_chunks c
     where (select embedding from seed) is not null
       and c.embedding is not null
       and not (c.entity_type = p_type and c.entity_id = p_id)
       and (p_types is null or c.entity_type = any (p_types))
     order by c.embedding <#> (select embedding from seed)
     limit greatest(least(p_limit * 10, 300), 10)
  )
  select distinct on (n.entity_type, n.entity_id)
    n.entity_type, n.entity_id, n.title, n.url, n.chunk_date, n.tags,
    (-n.distance)::float
  from near n
  order by n.entity_type, n.entity_id, n.distance;
$fn$;
