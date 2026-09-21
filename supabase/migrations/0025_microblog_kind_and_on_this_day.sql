-- 0025 — Two things the micro-blog archive has been missing, in one file
-- because both are about the same 1,661 rows.
--
-- 1. post_kind: whether a post is the author's own thought, a quote, a reblog
--    or a link-share. CLAUDE.md currently instructs the /ask persona to warn,
--    in prose, that a micro-post "may be a reblog of someone else — not a
--    considered position". A column makes that structural instead of something
--    a model has to remember to say: the card can label it, the reader can
--    filter to the posts that are actually his, and /ask can weight it later.
--
--    Filled by `npm run microblog:classify` (Gemini, behind the microblog_kind
--    switch in 0024's ai_features). Nullable on purpose — null means "not
--    classified yet", which is not the same as any of the four verdicts, and a
--    run that stops half way leaves the rest honestly unknown.
--
-- 2. microblog_on_this_day(): today's date in earlier years. PostgREST cannot
--    express `extract(day from date)` as a filter, so this is the smallest
--    possible RPC rather than a page of client-side month queries.

alter table public.microblog
  add column if not exists post_kind text,
  add column if not exists post_kind_confidence numeric;

-- Separate from the add so a re-run does not fail on an existing constraint.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'microblog_post_kind_check'
  ) then
    alter table public.microblog
      add constraint microblog_post_kind_check
      check (post_kind is null or post_kind in ('own', 'quote', 'reblog', 'link'));
  end if;
end $$;

comment on column public.microblog.post_kind is
  'own | quote | reblog | link. Null means not classified. Written by scripts/classify-microposts.mjs and editable in /admin.';
comment on column public.microblog.post_kind_confidence is
  'The classifier''s own 0–1 confidence. Kept so a low-confidence pass can be re-run without touching the sure ones.';

create index if not exists microblog_post_kind_idx on public.microblog (post_kind);

-- "On this day", across every year the archive covers. SECURITY INVOKER: the
-- microblog table's own public-read policy decides what comes back.
create or replace function public.microblog_on_this_day(
  p_month int,
  p_day int,
  p_limit int default 3
)
returns table (
  id bigint,
  date date,
  title text,
  text text,
  post_type text,
  url text,
  image_url text
)
language sql
stable
as $fn$
  select m.id, m.date, m.title, m.text, m.post_type, m.url, m.image_url
    from public.microblog m
   where extract(month from m.date) = p_month
     and extract(day   from m.date) = p_day
   order by m.date desc
   limit greatest(least(p_limit, 12), 1);
$fn$;
