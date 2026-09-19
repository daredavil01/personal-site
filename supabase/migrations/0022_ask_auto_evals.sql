-- 0022 — Automatic evaluation of /ask answers by a decision model (Jev).
--
-- 0017 gave the owner somewhere to record a judgement by hand. This adds a
-- machine that can fill the same columns, and the accounting that stops it
-- costing anything.
--
-- Two rules are enforced here rather than in the UI:
--
--   1. A hand-written evaluation is immutable. The judge only ever writes rows
--      where evaluated_at is null, so eval_source tells you who wrote a row and
--      a human verdict can never be silently replaced by a machine one.
--   2. eval_auto keeps the machine's own record even after a human overwrites
--      the verdict. Without it, grading a row the judge already graded destroys
--      the only evidence of whether the judge agrees with you — which is the
--      number that decides whether it is worth running at all.

-- ---------------------------------------------------------------------------
-- 1. Who wrote an evaluation, and what the machine actually said
-- ---------------------------------------------------------------------------

alter table public.ask_messages
  add column if not exists eval_source text,
  -- {model, verdict, score, confidence, dims: {...}, at}
  add column if not exists eval_auto jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ask_messages_eval_source') then
    alter table public.ask_messages
      add constraint ask_messages_eval_source
      check (eval_source is null or eval_source in ('human', 'auto'));
  end if;
end$$;

-- Everything graded before this migration was typed by the owner.
update public.ask_messages
   set eval_source = 'human'
 where evaluated_at is not null and eval_source is null;

-- "Unevaluated answers, newest first" is the judge's candidate query. Without
-- this it is a sequential scan of the whole log.
create index if not exists ask_messages_unevaluated_idx
  on public.ask_messages (created_at desc)
  where role = 'assistant' and evaluated_at is null;

-- ---------------------------------------------------------------------------
-- 2. Settings: the flag, the caps, the thresholds
-- ---------------------------------------------------------------------------

-- Defaults are chosen so that a deployment which has not been touched behaves
-- as "off": auto_eval_enabled is false, and no judge call can happen.
alter table public.ask_settings
  add column if not exists auto_eval_enabled boolean not null default false,
  -- 'gateway' routes through Vercel's AI Gateway, which is where the monthly
  -- free credit lives; 'typesafe' calls api.typesafe.ai directly and IS metered.
  add column if not exists auto_eval_route text not null default 'gateway',
  -- Named differently on the two routes: typesafe-ai/jev through the gateway,
  -- jev-latest direct. The endpoint normalises an id that does not match.
  add column if not exists auto_eval_model text not null default 'typesafe-ai/jev',
  -- Rows per press of the button.
  add column if not exists auto_eval_batch_cap int not null default 50,
  -- Rows per HTTP request. Workers Free allows ~10ms CPU per request, so the
  -- browser walks the batch in slices rather than asking for all of it at once.
  add column if not exists auto_eval_request_batch int not null default 8,
  -- Below this confidence the row is tagged needs-review for a human to settle.
  add column if not exists auto_eval_min_confidence real not null default 0.7,
  -- Input tokens per calendar month. 2,000,000 is about USD 0.08 at Jev's
  -- $0.042/MTok, i.e. under 2% of a $5 monthly gateway credit.
  add column if not exists auto_eval_monthly_token_cap int not null default 2000000,
  -- The Gemini escalation that writes a reason for a low-confidence verdict.
  add column if not exists auto_eval_explain_enabled boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ask_settings_auto_eval_route') then
    alter table public.ask_settings
      add constraint ask_settings_auto_eval_route
      check (auto_eval_route in ('gateway', 'typesafe'));
  end if;
end$$;

-- The judge endpoint asks this with the caller's own access token, which is how
-- it knows the request came from the owner before it spends anything. Reached
-- only from inside RLS policies until now, so the grant may be implicit —
-- stated here so it does not depend on a default.
grant execute on function public.is_owner() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Budget accounting, fail-closed
-- ---------------------------------------------------------------------------

create table if not exists public.ask_eval_usage (
  month date primary key,
  input_tokens bigint not null default 0,
  graded int not null default 0,
  runs int not null default 0,
  updated_at timestamptz not null default now()
);

-- Not public, and not reachable by the owner's browser either: the two RPCs
-- below are the only door, and they are service-role only. A cap the caller can
-- read is fine; a cap the caller can move is not.
alter table public.ask_eval_usage enable row level security;
drop policy if exists "owner read" on public.ask_eval_usage;
create policy "owner read" on public.ask_eval_usage
  for select to authenticated using (public.is_owner());

-- Reserve-then-check, the same shape as ask_quota: the estimate is added to the
-- month's total BEFORE the judge is called, so two runs cannot both squeeze
-- past the cap. ask_eval_record reconciles the reservation against what the
-- judge actually billed. A run that dies mid-way leaves its reservation
-- standing, which errs towards spending less.
create or replace function public.ask_eval_budget(p_estimate int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  s public.ask_settings%rowtype;
  used bigint;
  est int := greatest(coalesce(p_estimate, 0), 0);
begin
  select * into s from public.ask_settings where id = 1;
  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'unconfigured');
  end if;
  if not s.auto_eval_enabled then
    return jsonb_build_object('allowed', false, 'reason', 'disabled');
  end if;

  insert into public.ask_eval_usage (month, input_tokens, runs)
    values (date_trunc('month', now())::date, est, 1)
    on conflict (month) do update
      set input_tokens = public.ask_eval_usage.input_tokens + est,
          runs = public.ask_eval_usage.runs + 1,
          updated_at = now()
    returning input_tokens into used;

  if used > s.auto_eval_monthly_token_cap then
    return jsonb_build_object(
      'allowed', false, 'reason', 'token_cap', 'remaining', 0,
      'cap', s.auto_eval_monthly_token_cap, 'used', used - est
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'remaining', s.auto_eval_monthly_token_cap - used,
    'cap', s.auto_eval_monthly_token_cap,
    'used', used
  );
end;
$fn$;

-- Swap the reservation for the real number once the judge has answered.
create or replace function public.ask_eval_record(
  p_reserved int, p_actual int, p_graded int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  used bigint;
begin
  update public.ask_eval_usage
     set input_tokens = greatest(
           input_tokens - greatest(coalesce(p_reserved, 0), 0)
                        + greatest(coalesce(p_actual, 0), 0), 0),
         graded = graded + greatest(coalesce(p_graded, 0), 0),
         updated_at = now()
   where month = date_trunc('month', now())::date
   returning input_tokens into used;
  return jsonb_build_object('used', coalesce(used, 0));
end;
$fn$;

-- The judge runs at the edge with the service role, which bypasses these
-- grants; nobody else may move the counters.
revoke all on function public.ask_eval_budget(int) from anon, authenticated;
revoke all on function public.ask_eval_record(int, int, int) from anon, authenticated;

notify pgrst, 'reload schema';
