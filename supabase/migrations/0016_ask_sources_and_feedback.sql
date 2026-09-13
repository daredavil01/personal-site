-- /ask, round two: every data source, incremental indexing, pictures in
-- answers, and reader feedback as evals.
--
-- 1. content_chunks accepts any well-formed entity type, so a new source is a
--    file in scripts/ask-sources/ rather than a migration.
-- 2. content_hash / embed_hash let the indexer skip unchanged rows and reuse a
--    vector when text merely moves (the changelog grows at the top, which used
--    to renumber — and re-embed — every chunk below the new entry).
-- 3. image_url gives source cards and answers a picture.
-- 4. site_facts() gains the résumé, micro-post activity by year, tag categories
--    and what the index holds.
-- 5. ask_messages gains message_uuid and feedback columns; ask_feedback() lets
--    the visitor who got an answer rate it, and nobody else.

-- ---------------------------------------------------------------------------
-- 1–3. The index
-- ---------------------------------------------------------------------------

-- The original CHECK was declared inline, so its name is generated. Drop
-- whichever check constraint mentions entity_type rather than guessing the name.
do $$
declare
  r record;
begin
  for r in
    select conname
      from pg_constraint
     where conrelid = 'public.content_chunks'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%entity_type%'
  loop
    execute format('alter table public.content_chunks drop constraint %I', r.conname);
  end loop;
end$$;

alter table public.content_chunks
  add constraint content_chunks_entity_type_format
  check (entity_type ~ '^[a-z][a-z0-9_]*$');

alter table public.content_chunks
  add column if not exists content_hash text,
  add column if not exists embed_hash text,
  add column if not exists image_url text;

create index if not exists content_chunks_embed_hash_idx
  on public.content_chunks (embed_hash)
  where embed_hash is not null;

-- hybrid_search() returns setof content_chunks via `select c.*`, so the new
-- columns flow through to the worker without redefining it.

-- ---------------------------------------------------------------------------
-- 4. Facts card
-- ---------------------------------------------------------------------------

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
                         order by total desc limit 25) t)
  );
$fn$;

-- ---------------------------------------------------------------------------
-- 5. Feedback on the conversation log
-- ---------------------------------------------------------------------------

alter table public.ask_messages
  add column if not exists message_uuid uuid,
  add column if not exists feedback smallint,
  add column if not exists feedback_tags text[] not null default '{}',
  add column if not exists feedback_comment text,
  add column if not exists feedback_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ask_messages_feedback_value') then
    alter table public.ask_messages
      add constraint ask_messages_feedback_value check (feedback in (-1, 1));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ask_messages_feedback_comment_len') then
    alter table public.ask_messages
      add constraint ask_messages_feedback_comment_len
      check (feedback_comment is null or char_length(feedback_comment) <= 1000);
  end if;
end$$;

create unique index if not exists ask_messages_message_uuid_idx
  on public.ask_messages (message_uuid);
create index if not exists ask_messages_feedback_idx
  on public.ask_messages (feedback_at desc)
  where feedback is not null or feedback_comment is not null;

-- ask_log gains p_message_uuid. Dropped first so no stale 15-argument overload
-- is left behind for PostgREST to pick.
drop function if exists public.ask_log(
  text, text, text, text, text, text, text, boolean, boolean, boolean,
  jsonb, jsonb, jsonb, text, text
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
  p_message_uuid uuid default null
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

  insert into public.ask_messages (conversation_id, turn_index, role, content)
    values (conv_id, next_index, 'user', coalesce(p_question, ''));

  insert into public.ask_messages (
    conversation_id, turn_index, role, content, tier, provider, model,
    degraded, keyword_only, streamed, embed_ms, retrieval_ms, generation_ms,
    total_ms, source_count, sources, tier_errors, message_uuid
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
    p_message_uuid
  );

  update public.ask_conversations
     set message_count = message_count + 2, last_at = now()
   where id = conv_id;

  return conv_id;
end;
$fn$;

-- Rates one answer. Only the browser session that received the answer can
-- rate it: the message must belong to a conversation with that session id,
-- which is a random value that never leaves that visitor's localStorage.
-- Calling it again replaces the rating; a null rating with no tags and no
-- comment clears it. Returns false when nothing matched (wrong session, or the
-- log row has not landed yet — the worker writes it just after answering).
create or replace function public.ask_feedback(
  p_message_uuid uuid,
  p_session text,
  p_rating smallint default null,
  p_tags text[] default '{}',
  p_comment text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  updated int;
  clean_tags text[];
  clean_comment text;
begin
  if p_message_uuid is null or coalesce(btrim(p_session), '') = '' then
    return false;
  end if;
  if p_rating is not null and p_rating not in (-1, 1) then
    raise exception 'rating must be -1, 1 or null';
  end if;

  select coalesce(array_agg(tag), '{}')
    into clean_tags
    from (
      select distinct left(lower(btrim(t)), 40) as tag
        from unnest(coalesce(p_tags, '{}')) as t
       where btrim(t) <> ''
       limit 8
    ) s;
  clean_comment := nullif(left(btrim(coalesce(p_comment, '')), 1000), '');

  update public.ask_messages m
     set feedback = p_rating,
         feedback_tags = clean_tags,
         feedback_comment = clean_comment,
         feedback_at = case
           when p_rating is null and clean_comment is null and cardinality(clean_tags) = 0 then null
           else now()
         end
    from public.ask_conversations c
   where m.message_uuid = p_message_uuid
     and m.role = 'assistant'
     and c.id = m.conversation_id
     and c.session_id = p_session;

  get diagnostics updated = row_count;
  return updated > 0;
end;
$fn$;

grant execute on function public.ask_feedback(uuid, text, smallint, text[], text) to anon, authenticated;

notify pgrst, 'reload schema';
