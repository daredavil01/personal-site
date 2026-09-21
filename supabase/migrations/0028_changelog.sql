-- 0028: Changelog — the version history moves from src/data/changelog.md into
-- Postgres.
--
-- The markdown file had grown to 204 KB / 91 versions, and it was fetched whole
-- twice at runtime: once by /changelog, and again by the Now-month editor's
-- "Pull highlights from changelog". Neither needs more than one version.
--
-- The file does not disappear; it becomes a staging buffer. A code change still
-- appends its entry there, in the same commit and the same diff, and
-- `npm run changelog:push` parses the buffer, upserts each version into this
-- table, and empties the file back to its header. Postgres is the source of
-- truth; the file is where an entry waits for a human to read it.
--
-- `changes` is an array of {kind, name, path, body}, the shape
-- src/lib/changelogParse.js already produces from a markdown bullet.

create table if not exists public.changelog (
  id          bigint generated always as identity primary key,
  version     text not null unique check (version ~ '^v\d+\.\d+\.\d+$'),
  released_on date not null,
  summary     text,
  changes     jsonb not null default '[]'::jsonb
                check (jsonb_typeof(changes) = 'array'),

  -- Ordering has to be numeric per component: text sorts v5.0.0 above v18.2.1,
  -- and released_on is not a fallback — v18.2.1 is dated the day *before*
  -- v18.2.0. Generated, so a hand-typed version can never disagree with them.
  major int generated always as (split_part(ltrim(version, 'v'), '.', 1)::int) stored,
  minor int generated always as (split_part(ltrim(version, 'v'), '.', 2)::int) stored,
  patch int generated always as (split_part(ltrim(version, 'v'), '.', 3)::int) stored,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists changelog_semver_idx
  on public.changelog (major desc, minor desc, patch desc);

drop trigger if exists set_updated_at on public.changelog;
create trigger set_updated_at before update on public.changelog
  for each row execute function public.set_updated_at();

alter table public.changelog enable row level security;

drop policy if exists "public read" on public.changelog;
create policy "public read" on public.changelog for select using (true);

drop policy if exists "owner write" on public.changelog;
create policy "owner write" on public.changelog for all
  to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- No tags: a changelog entry is dated engineering prose, not topical content,
-- and set_entity_tags replaces an entity's whole tag set — there is nothing
-- here for /tags to hold.
--
-- No content_chunks change either: 0016 replaced the entity_type CHECK with the
-- format rule '^[a-z][a-z0-9_]*$', so 'changelog' is already a legal type.
