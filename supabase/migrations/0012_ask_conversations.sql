-- Conversation log for /ask — every question, every answer, and the numbers
-- needed to judge whether the thing is any good.
--
-- Two tables: one row per conversation (a browser session), one row per message.
-- Assistant rows carry the operational detail — which tier answered, which
-- model, how long each stage took, whether it ran degraded, which sources were
-- shown — so "is Gemini's free tier actually holding up" and "what do people
-- ask that the archive cannot answer" are both queries, not guesses.
--
-- Writes go through ask_log(), SECURITY DEFINER: anonymous visitors can neither
-- read the log nor write to it directly. Reads are owner-only, for /admin.

create table if not exists public.ask_conversations (
  id bigint generated always as identity primary key,
  -- Client-generated, stored in the visitor's localStorage. Not an identity —
  -- it survives a reload and nothing else.
  session_id text not null unique,
  ip_hash text,
  user_agent text,
  referer text,
  message_count int not null default 0,
  started_at timestamptz not null default now(),
  last_at timestamptz not null default now()
);

create index if not exists ask_conversations_last_at_idx
  on public.ask_conversations (last_at desc);

create table if not exists public.ask_messages (
  id bigint generated always as identity primary key,
  conversation_id bigint not null
    references public.ask_conversations (id) on delete cascade,
  turn_index int not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  -- Assistant-only operational detail.
  tier text,
  provider text,
  model text,
  degraded boolean,
  keyword_only boolean,
  streamed boolean,
  stopped boolean,
  -- Per-stage milliseconds, so a slow answer can be blamed on the right stage.
  embed_ms int,
  retrieval_ms int,
  generation_ms int,
  total_ms int,
  source_count int,
  sources jsonb not null default '[]'::jsonb,
  tier_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ask_messages_conversation_idx
  on public.ask_messages (conversation_id, turn_index);
create index if not exists ask_messages_created_idx
  on public.ask_messages (created_at desc);
create index if not exists ask_messages_tier_idx
  on public.ask_messages (tier);

-- Writes one exchange: the question and the answer, as two rows, creating or
-- touching the conversation. Best-effort by design — the worker calls it from
-- waitUntil() after the response has already gone out, so logging can never
-- slow down or break an answer.
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
  p_referer text default null
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
    total_ms, source_count, sources, tier_errors
  ) values (
    conv_id, next_index + 1, 'assistant', coalesce(p_answer, ''),
    p_tier, p_provider, p_model, p_degraded, p_keyword_only, p_streamed,
    (p_timings ->> 'embed_ms')::int,
    (p_timings ->> 'retrieval_ms')::int,
    (p_timings ->> 'generation_ms')::int,
    (p_timings ->> 'total_ms')::int,
    jsonb_array_length(coalesce(p_sources, '[]'::jsonb)),
    coalesce(p_sources, '[]'::jsonb),
    coalesce(p_errors, '[]'::jsonb)
  );

  update public.ask_conversations
     set message_count = message_count + 2, last_at = now()
   where id = conv_id;

  return conv_id;
end;
$fn$;

-- Rollup for the /admin list: one row per conversation with the numbers that
-- matter, so the table does not have to aggregate client-side.
create or replace function public.ask_conversation_list(
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id bigint,
  session_id text,
  started_at timestamptz,
  last_at timestamptz,
  exchanges int,
  first_question text,
  tiers text[],
  avg_total_ms int,
  degraded_count int,
  user_agent text
)
language sql stable
as $fn$
  select
    c.id,
    c.session_id,
    c.started_at,
    c.last_at,
    (count(*) filter (where m.role = 'assistant'))::int,
    (array_agg(m.content order by m.turn_index)
       filter (where m.role = 'user'))[1],
    array_remove(array_agg(distinct m.tier), null),
    avg(m.total_ms) filter (where m.role = 'assistant')::int,
    (count(*) filter (where m.degraded))::int,
    c.user_agent
  from public.ask_conversations c
  left join public.ask_messages m on m.conversation_id = c.id
  group by c.id
  order by c.last_at desc
  limit greatest(least(p_limit, 500), 1)
  offset greatest(p_offset, 0);
$fn$;

-- Headline numbers for the admin panel.
create or replace function public.ask_message_stats(p_days int default 30)
returns jsonb
language sql stable
as $fn$
  select jsonb_build_object(
    'window_days', p_days,
    'conversations', (select count(distinct conversation_id) from public.ask_messages
                       where created_at > now() - make_interval(days => p_days)),
    'questions', (select count(*) from public.ask_messages
                   where role = 'user' and created_at > now() - make_interval(days => p_days)),
    'degraded', (select count(*) from public.ask_messages
                  where degraded and created_at > now() - make_interval(days => p_days)),
    'keyword_only', (select count(*) from public.ask_messages
                      where keyword_only and created_at > now() - make_interval(days => p_days)),
    'by_tier', (select jsonb_object_agg(k, n) from
                 (select coalesce(tier, 'unknown') k, count(*) n
                    from public.ask_messages
                   where role = 'assistant'
                     and created_at > now() - make_interval(days => p_days)
                   group by 1) t),
    'latency_ms', (select jsonb_build_object(
                     'avg', avg(total_ms)::int,
                     'p50', percentile_disc(0.5) within group (order by total_ms),
                     'p95', percentile_disc(0.95) within group (order by total_ms),
                     'max', max(total_ms))
                    from public.ask_messages
                   where role = 'assistant' and total_ms is not null
                     and created_at > now() - make_interval(days => p_days))
  );
$fn$;

-- RLS: the log is owner-only. Anonymous visitors write through ask_log() and
-- can never read what anyone else asked.
alter table public.ask_conversations enable row level security;
alter table public.ask_messages enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['ask_conversations', 'ask_messages'] loop
    execute format('drop policy if exists "owner read" on public.%I;', t);
    execute format(
      'create policy "owner read" on public.%I for select
         to authenticated using (public.is_owner());', t);
    execute format('drop policy if exists "owner write" on public.%I;', t);
    execute format(
      'create policy "owner write" on public.%I for all
         to authenticated
         using (public.is_owner()) with check (public.is_owner());', t);
  end loop;
end$$;
