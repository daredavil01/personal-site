-- 0027 — Log the two stages 0025/0026's wave added to an answer.
--
-- ask_log() explodes p_timings into named int columns, so a key it does not
-- know about is silently dropped. The worker has been measuring `rerank_ms`
-- and flagging `cached` since reranking and the answer cache shipped, and both
-- went nowhere: the one feature whose whole purpose is "does this make answers
-- better, and what does it cost" was invisible in the log that would say so.
--
-- Two columns and four lines of the function. Everything else is unchanged.

alter table public.ask_messages
  add column if not exists rerank_ms int,
  add column if not exists from_cache boolean not null default false;

comment on column public.ask_messages.rerank_ms is
  'Milliseconds spent in the cross-encoder reranker. Null means it did not run — the rerank switch was off, there was no AI binding, or fewer than two candidates.';
comment on column public.ask_messages.from_cache is
  'True when the answer came from the edge answer cache rather than a model call. generation_ms is then the cache read, not a model.';

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
    rerank_ms, from_cache, total_ms, source_count, sources, tier_errors,
    message_uuid, types
  ) values (
    conv_id, next_index + 1, 'assistant', coalesce(p_answer, ''),
    p_tier, p_provider, p_model, p_degraded, p_keyword_only, p_streamed,
    (p_timings ->> 'embed_ms')::int,
    (p_timings ->> 'retrieval_ms')::int,
    (p_timings ->> 'generation_ms')::int,
    (p_timings ->> 'rerank_ms')::int,
    coalesce((p_timings ->> 'cached')::boolean, false),
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
