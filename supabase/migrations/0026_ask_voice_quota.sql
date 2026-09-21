-- 0026 — Transcription gets its own counter.
--
-- ask_quota() counts answers. Audio bodies are the first requests on this site
-- with real size, and a hot microphone must not be able to eat the day's
-- Gemini calls — so voice is counted separately, with its own caps, rather
-- than sharing the answer budget.
--
-- The counter table is unchanged: ask_usage is keyed by (day, ip_hash), so a
-- kind is simply a prefix on the hash. 'v:<hash>' for a visitor, 'v:' for the
-- reserved global row, exactly mirroring '' for answers.
--
-- p_kind defaults to '', so every existing caller — functions/api/ask.js —
-- keeps working untouched: PostgREST resolves by named argument.

alter table public.ask_settings
  add column if not exists daily_voice_global_cap int not null default 200,
  add column if not exists daily_voice_ip_cap int not null default 20;

comment on column public.ask_settings.daily_voice_global_cap is
  'Transcriptions per day across all visitors. Separate from daily_global_cap: transcription and answering must not share one budget.';
comment on column public.ask_settings.daily_voice_ip_cap is
  'Transcriptions per day per visitor.';

create or replace function public.ask_quota(p_ip_hash text, p_kind text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  s public.ask_settings%rowtype;
  prefix text;
  global_cap int;
  ip_cap int;
  global_count int;
  ip_count int;
begin
  select * into s from public.ask_settings where id = 1;
  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'unconfigured');
  end if;
  if not s.enabled then
    return jsonb_build_object('allowed', false, 'reason', 'disabled');
  end if;

  if p_kind = 'voice' then
    prefix := 'v:';
    global_cap := s.daily_voice_global_cap;
    ip_cap := s.daily_voice_ip_cap;
  else
    prefix := '';
    global_cap := s.daily_global_cap;
    ip_cap := s.daily_ip_cap;
  end if;

  insert into public.ask_usage (day, ip_hash, count)
    values (current_date, prefix, 1)
    on conflict (day, ip_hash) do update set count = public.ask_usage.count + 1
    returning count into global_count;

  insert into public.ask_usage (day, ip_hash, count)
    values (current_date, prefix || coalesce(nullif(p_ip_hash, ''), 'unknown'), 1)
    on conflict (day, ip_hash) do update set count = public.ask_usage.count + 1
    returning count into ip_count;

  if global_count > global_cap then
    return jsonb_build_object('allowed', false, 'reason', 'global_cap',
                              'remaining_global', 0);
  end if;
  if ip_count > ip_cap then
    return jsonb_build_object('allowed', false, 'reason', 'ip_cap',
                              'remaining_ip', 0);
  end if;

  return jsonb_build_object(
    'allowed', true,
    'remaining_ip', ip_cap - ip_count,
    'remaining_global', global_cap - global_count
  );
end;
$fn$;

-- The single-argument signature from 0009 would otherwise still exist and win
-- for callers that pass only p_ip_hash, leaving voice counted as an answer.
drop function if exists public.ask_quota(text);
