-- Sharing a whole /ask conversation.
--
-- The per-answer permalink deliberately freezes nothing — it re-asks the
-- question, because the archive moves and a stale answer under a live URL is a
-- lie. A shared CONVERSATION cannot work that way: the point is to send someone
-- the exchange you actually had. So it is a snapshot, and the honesty comes from
-- the page instead — it stamps the date it was asked and offers to re-ask it
-- live. Revoking is the remedy when a snapshot goes bad.
--
-- The snapshot is taken from the browser rather than joined out of
-- ask_conversations, so a share still works when logging failed or localStorage
-- was blocked, and so later feedback edits cannot change what a shared page says.

-- ---------------------------------------------------------------------------
-- 1. The table
-- ---------------------------------------------------------------------------

create table if not exists public.ask_shares (
  id             bigint generated always as identity primary key,
  token          text not null unique,
  thread         jsonb not null,
  -- Answers may link roster entries, and the browser re-sanitises against this
  -- list (askFormat.js). Without it every roster link in a shared answer would
  -- silently decay to plain text. Deduped union across the thread's turns.
  linkable       text[] not null default '{}',
  title          text not null default '',
  summary        text not null default '',
  turn_count     int not null default 0,
  -- Every question and answer as one string, for admin search. 'simple', not
  -- 'english': stemming Devanagari is worse than not stemming, same as 0002.
  plain_text     text not null default '',
  search_tsv     tsvector generated always as (to_tsvector('simple', plain_text)) stored,
  -- Denormalised at share time so the admin filters are index scans rather than
  -- jsonb walks over every row.
  types          text[] not null default '{}',
  has_downvote   boolean not null default false,
  has_refusal    boolean not null default false,
  no_sources     boolean not null default false,
  view_count     int not null default 0,
  last_viewed_at timestamptz,
  revoked        boolean not null default false,
  ip_hash        text,
  user_agent     text,
  created_at     timestamptz not null default now()
);

create index if not exists ask_shares_created_idx on public.ask_shares (created_at desc);
create index if not exists ask_shares_search_idx on public.ask_shares using gin (search_tsv);
create index if not exists ask_shares_ip_day_idx on public.ask_shares (ip_hash, created_at);

-- ---------------------------------------------------------------------------
-- 2. RLS: owner-only, and the public gets in only through a token
-- ---------------------------------------------------------------------------
-- This is the part that matters. An anon select policy — even a narrow one —
-- would let anybody GET /rest/v1/ask_shares?select=* and read every conversation
-- ever shared, and "unlisted" would be a fiction. So the table is owner-only and
-- the public path is a SECURITY DEFINER function that demands the exact token.

alter table public.ask_shares enable row level security;

drop policy if exists "owner read" on public.ask_shares;
create policy "owner read" on public.ask_shares
  for select to authenticated using (public.is_owner());

drop policy if exists "owner write" on public.ask_shares;
create policy "owner write" on public.ask_shares
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- 3. Settings: the daily cap per visitor
-- ---------------------------------------------------------------------------

alter table public.ask_settings
  add column if not exists daily_share_cap int not null default 10;

comment on column public.ask_settings.daily_share_cap is
  'Shared conversations one IP may create per day. The ask_shares rows are the counter; there is no separate usage table.';

-- ---------------------------------------------------------------------------
-- 4. Creating a share
-- ---------------------------------------------------------------------------
-- NOT callable by anon, on purpose. The per-IP cap is only meaningful if the
-- caller cannot choose its own ip_hash, and Postgres cannot see the client IP
-- through PostgREST — so the hash has to come from the edge. /api/share hashes
-- the real CF-Connecting-IP and calls this with the service role; a browser
-- calling it directly would just be inventing an identity to be counted under.
--
-- The derived columns (title, summary, plain_text, signals) are computed by the
-- worker, which can strip markdown properly and knows the configured refusal
-- note. Trusting them is fine precisely because only the worker can get here.

create or replace function public.create_ask_share(
  p_thread jsonb,
  p_linkable text[] default '{}',
  p_title text default '',
  p_summary text default '',
  p_plain_text text default '',
  p_types text[] default '{}',
  p_has_downvote boolean default false,
  p_has_refusal boolean default false,
  p_no_sources boolean default false,
  p_ip_hash text default null,
  p_user_agent text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  cap int;
  used int;
  turns int;
  new_token text;
begin
  turns := jsonb_array_length(coalesce(p_thread, '[]'::jsonb));
  if turns = 0 then
    raise exception 'empty thread' using errcode = '22023';
  end if;
  -- One row should not hold a novel: 20 turns, 100KB.
  if turns > 20 then
    raise exception 'thread too long' using errcode = '22023';
  end if;
  if octet_length(p_thread::text) > 100000 then
    raise exception 'thread too large' using errcode = '22023';
  end if;

  select coalesce(daily_share_cap, 10) into cap from public.ask_settings where id = 1;
  cap := coalesce(cap, 10);

  -- The rows are the counter — no separate usage table to keep in step.
  select count(*) into used
    from public.ask_shares
   where ip_hash is not null
     and ip_hash = p_ip_hash
     and created_at >= date_trunc('day', now());
  if used >= cap then
    raise exception 'share quota reached' using errcode = '53400';
  end if;

  -- 16 hex chars — 64 bits, unguessable, and short enough to paste.
  loop
    new_token := substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
    exit when not exists (select 1 from public.ask_shares where token = new_token);
  end loop;

  insert into public.ask_shares (
    token, thread, linkable, title, summary, turn_count, plain_text, types,
    has_downvote, has_refusal, no_sources, ip_hash, user_agent
  ) values (
    new_token, p_thread, coalesce(p_linkable, '{}'), left(coalesce(p_title, ''), 300),
    left(coalesce(p_summary, ''), 400), turns, coalesce(p_plain_text, ''),
    coalesce(p_types, '{}'), p_has_downvote, p_has_refusal, p_no_sources,
    p_ip_hash, left(coalesce(p_user_agent, ''), 400)
  );

  return new_token;
end;
$fn$;

revoke all on function public.create_ask_share(
  jsonb, text[], text, text, text, text[], boolean, boolean, boolean, text, text
) from public, anon, authenticated;
grant execute on function public.create_ask_share(
  jsonb, text[], text, text, text, text[], boolean, boolean, boolean, text, text
) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Reading a share
-- ---------------------------------------------------------------------------
-- Token-gated and read-only: the social-card middleware calls this too, and an
-- unfurl must not count as a visit. ip_hash and user_agent never leave the row.
-- A revoked share reads as missing rather than as an error, so the page can say
-- "no longer shared" without distinguishing it from a typo'd token.

create or replace function public.get_ask_share(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  select jsonb_build_object(
    'token', s.token,
    'thread', s.thread,
    'linkable', s.linkable,
    'title', s.title,
    'summary', s.summary,
    'turnCount', s.turn_count,
    'types', s.types,
    'createdAt', s.created_at
  )
  from public.ask_shares s
  where s.token = p_token and not s.revoked;
$fn$;

grant execute on function public.get_ask_share(text) to anon, authenticated, service_role;

-- Fire-and-forget from the page only, never from the middleware — a crawler
-- unfurling a link is not a reader opening it.
create or replace function public.bump_ask_share_view(p_token text)
returns void
language sql
security definer
set search_path = public
as $fn$
  update public.ask_shares
     set view_count = view_count + 1, last_viewed_at = now()
   where token = p_token and not revoked;
$fn$;

grant execute on function public.bump_ask_share_view(text) to anon, authenticated, service_role;
