-- 0030: A written summary per major version.
--
-- /changelog shows one major at a time. A major holds up to seventeen releases
-- and several hundred engineering entries, and the first thing a reader meets
-- should be what that chapter was about — not `ts_rank_cd` in the first
-- sentence. So each major gets a headline, a paragraph, and the additions and
-- fixes worth naming; the engineering entries are collapsed underneath it.
--
-- Written by `npm run changelog:majors` (scripts/summarise-majors.mjs) through
-- the existing `release_notes` AI feature — the same switch and the same Gemini
-- ladder `npm run changelog:notes` uses for a single version's summary. A major
-- summary is written from those per-version summaries, so the layering is
-- entries → version summary → major summary.

create table if not exists public.changelog_majors (
  major        int primary key check (major >= 0),
  headline     text,
  summary      text,
  -- { "added": ["…"], "fixed": ["…"] } — the additions and fixes worth naming,
  -- already in a reader's words. Shape is checked here rather than trusted from
  -- a model's JSON.
  highlights   jsonb not null default '{}'::jsonb
                 check (jsonb_typeof(highlights) = 'object'),

  -- The hash of the text the summary was written from. A re-run skips a major
  -- whose versions have not changed, so re-running the script costs nothing —
  -- the same rule `npm run ask:index` follows.
  source_hash  text,
  model        text,
  generated_at timestamptz,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.changelog_majors;
create trigger set_updated_at before update on public.changelog_majors
  for each row execute function public.set_updated_at();

alter table public.changelog_majors enable row level security;

drop policy if exists "public read" on public.changelog_majors;
create policy "public read" on public.changelog_majors for select using (true);

drop policy if exists "owner write" on public.changelog_majors;
create policy "owner write" on public.changelog_majors for all
  to authenticated
  using (public.is_owner()) with check (public.is_owner());
