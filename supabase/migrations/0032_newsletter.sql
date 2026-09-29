-- 0032 — The monthly newsletter.
--
-- An issue IS a now_months row. The month's `sections` blob was already a
-- frozen snapshot of what happened (the admin autofill copies content rows into
-- it), so a separate issues table would have been a second copy of the same
-- month. This adds what makes a month publishable: a slug for the URL, a
-- headline and a hand-written note, an optional poll, a publish date and the
-- pre-rendered share card. /now keeps showing the current month; every other
-- month is read at /newsletter/<slug>.
--
-- Reader feedback (reactions, poll votes, ratings, replies) lives in
-- newsletter_feedback, which is owner-only. The public writes through
-- /api/newsletter-feedback (it hashes the real IP at the edge, like /api/share)
-- and reads counts through newsletter_feedback_summary(), which never returns a
-- reply.
--
-- Depends on 0001 (now_months, is_owner).

-- ---------------------------------------------------------------------------
-- 1. Issue columns on now_months
-- ---------------------------------------------------------------------------

alter table public.now_months
  add column if not exists slug         text,
  add column if not exists headline     text,
  add column if not exists note         text,
  add column if not exists poll         jsonb,
  add column if not exists published_at timestamptz,
  add column if not exists card_url     text;

comment on column public.now_months.slug is
  'YYYY-MM. The issue URL is /newsletter/<slug>. Written by the client toRow and by npm run newsletter:draft.';
comment on column public.now_months.note is
  'The hand-written letter for the month, markdown.';
comment on column public.now_months.poll is
  '{q, options[]} — one question readers vote on; the result is quoted in the next issue.';
comment on column public.now_months.published_at is
  'Null = draft. Drafts are invisible to the public except the current month, which /now shows.';
comment on column public.now_months.card_url is
  'The 1200x630 share card, rendered by npm run newsletter:draft into media/og/newsletter-<slug>.png.';

update public.now_months
   set slug = year::text || '-' || lpad(array_position(array[
     'January', 'February', 'March', 'April', 'May', 'June',
     'July', 'August', 'September', 'October', 'November', 'December'
   ], month)::text, 2, '0')
 where slug is null;

create unique index if not exists now_months_slug_idx on public.now_months (slug);

-- Every month already on /now was, in effect, published. The current month is
-- still being lived, so it stays a draft until its issue is written.
update public.now_months
   set published_at = coalesce(updated_at, created_at, now())
 where published_at is null and not is_current;

-- Narrow the public read the way 0005 did for projects: a draft never reaches an
-- anonymous payload, except the current month, which /now renders live.
-- Known ceiling: the current month's draft note is readable over raw REST before
-- it is published. Publishing follows within hours of writing, so it is accepted.
drop policy if exists "public read" on public.now_months;
create policy "public read" on public.now_months
  for select using (published_at is not null or is_current or public.is_owner());

-- ---------------------------------------------------------------------------
-- 2. Reader feedback
-- ---------------------------------------------------------------------------

create table if not exists public.newsletter_feedback (
  id         bigint generated always as identity primary key,
  issue_id   bigint not null references public.now_months (id) on delete cascade,
  kind       text not null check (kind in ('reaction', 'poll', 'rating', 'reply')),
  -- A section key from the issue (books, running, …): which part a reaction is
  -- on, or which part a rating picked as the most useful.
  section    text check (section is null or section ~ '^[a-z_]{1,32}$'),
  value      text check (value is null or char_length(value) <= 16),
  message    text check (message is null or char_length(message) <= 1000),
  name       text check (name is null or char_length(name) <= 80),
  ip_hash    text,
  created_at timestamptz not null default now()
);

create index if not exists newsletter_feedback_issue_idx on public.newsletter_feedback (issue_id, kind);
create index if not exists newsletter_feedback_ip_day_idx on public.newsletter_feedback (ip_hash, created_at);

alter table public.newsletter_feedback enable row level security;

drop policy if exists "owner read" on public.newsletter_feedback;
create policy "owner read" on public.newsletter_feedback
  for select to authenticated using (public.is_owner());

drop policy if exists "owner write" on public.newsletter_feedback;
create policy "owner write" on public.newsletter_feedback
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Counts only. Replies are private to the owner and never leave through here.
create or replace function public.newsletter_feedback_summary(p_issue bigint)
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  with f as (
    select f.*
      from public.newsletter_feedback f
      join public.now_months m on m.id = f.issue_id
     where f.issue_id = p_issue and m.published_at is not null
  )
  select jsonb_build_object(
    'reactions', coalesce((
      select jsonb_object_agg(section, counts)
        from (
          select section, jsonb_object_agg(value, n) as counts
            from (select section, value, count(*) as n
                    from f where kind = 'reaction' group by section, value) r
           group by section
        ) s
    ), '{}'::jsonb),
    'poll', coalesce((
      select jsonb_object_agg(value, n)
        from (select value, count(*) as n from f where kind = 'poll' group by value) p
    ), '{}'::jsonb),
    'rating', (
      select jsonb_build_object('avg', round(avg(value::numeric), 2), 'n', count(*))
        from f where kind = 'rating'
    ),
    'picks', coalesce((
      select jsonb_object_agg(section, n)
        from (select section, count(*) as n
                from f where kind = 'rating' and section is not null group by section) k
    ), '{}'::jsonb),
    'replies', (select count(*) from f where kind = 'reply')
  );
$fn$;

grant execute on function public.newsletter_feedback_summary(bigint) to anon, authenticated, service_role;

-- NOT callable by anon, for the same reason as create_ask_share (0021): the
-- per-visitor cap only means something if the caller cannot pick the ip_hash
-- it is counted under, and only the edge sees the real address.
--
-- A poll vote and a rating replace that visitor's earlier one on the issue, so
-- changing your mind is allowed and stuffing the box is not. A repeated
-- reaction is a no-op.
create or replace function public.newsletter_feedback_add(
  p_issue   bigint,
  p_kind    text,
  p_section text default null,
  p_value   text default null,
  p_message text default null,
  p_name    text default null,
  p_ip_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  issue public.now_months%rowtype;
  used int;
  options int;
begin
  select * into issue from public.now_months where id = p_issue;
  if not found or issue.published_at is null then
    raise exception 'no such issue' using errcode = '22023';
  end if;

  if p_kind = 'reaction' then
    if p_section is null or p_value not in ('love', 'fire', 'clap', 'wow') then
      raise exception 'bad reaction' using errcode = '22023';
    end if;
  elsif p_kind = 'poll' then
    options := coalesce(jsonb_array_length(issue.poll -> 'options'), 0);
    if p_value !~ '^\d{1,2}$' or p_value::int >= options then
      raise exception 'bad vote' using errcode = '22023';
    end if;
  elsif p_kind = 'rating' then
    if p_value !~ '^[1-5]$' then
      raise exception 'bad rating' using errcode = '22023';
    end if;
  elsif p_kind = 'reply' then
    if coalesce(btrim(p_message), '') = '' then
      raise exception 'empty reply' using errcode = '22023';
    end if;
  else
    raise exception 'bad kind' using errcode = '22023';
  end if;

  -- ponytail: fixed cap of 40 writes per visitor per day; move it to ask_settings if it ever needs tuning.
  select count(*) into used
    from public.newsletter_feedback
   where ip_hash is not null and ip_hash = p_ip_hash
     and created_at >= date_trunc('day', now());
  if used >= 40 then
    raise exception 'feedback quota reached' using errcode = '53400';
  end if;

  if p_kind = 'reaction' and exists (
    select 1 from public.newsletter_feedback
     where issue_id = p_issue and kind = 'reaction' and ip_hash = p_ip_hash
       and section = p_section and value = p_value
  ) then
    return public.newsletter_feedback_summary(p_issue);
  end if;

  if p_kind in ('poll', 'rating') and p_ip_hash is not null then
    delete from public.newsletter_feedback
     where issue_id = p_issue and kind = p_kind and ip_hash = p_ip_hash;
  end if;

  insert into public.newsletter_feedback (issue_id, kind, section, value, message, name, ip_hash)
  values (
    p_issue, p_kind, p_section, p_value,
    nullif(btrim(left(coalesce(p_message, ''), 1000)), ''),
    nullif(btrim(left(coalesce(p_name, ''), 80)), ''),
    p_ip_hash
  );

  return public.newsletter_feedback_summary(p_issue);
end;
$fn$;

revoke all on function public.newsletter_feedback_add(bigint, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.newsletter_feedback_add(bigint, text, text, text, text, text, text)
  to service_role;
