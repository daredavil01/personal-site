-- 0034 — The admin assist features (draft, tag suggestions, alt text) get their
-- own model ladder and an audit log, both shown at /admin/ai.
--
-- assist_tiers has the same row shape as tiers. Empty means "use the /ask
-- ladder", so an untouched deployment behaves exactly as before.
--
-- assist_log is one row per /api/assist call. It holds what was asked for and
-- what came back, never the prompt or an image's bytes: the prompt is the row
-- being edited, which is already in its own table. Written by the worker with
-- the service-role key; owner-only to read and to prune.

alter table public.ask_settings
  add column if not exists assist_tiers jsonb not null default '[]'::jsonb;

comment on column public.ask_settings.assist_tiers is
  'Model ladder for /api/assist (draft, tags, alt). Same shape as tiers; empty falls back to tiers.';

create table if not exists public.assist_log (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  task         text not null check (task in ('draft', 'tags', 'alt')),
  resource     text,
  field        text,
  tier         text,
  failed_rungs text[] not null default '{}',
  latency_ms   int,
  prompt_chars int,
  status       text not null check (status in ('ok', 'error', 'disabled')),
  error        text,
  output       jsonb
);

create index if not exists assist_log_created_at_idx on public.assist_log (created_at desc);

alter table public.assist_log enable row level security;

drop policy if exists "assist_log owner read" on public.assist_log;
create policy "assist_log owner read" on public.assist_log
  for select using (public.is_owner());

drop policy if exists "assist_log owner delete" on public.assist_log;
create policy "assist_log owner delete" on public.assist_log
  for delete using (public.is_owner());
