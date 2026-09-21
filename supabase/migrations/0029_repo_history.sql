-- 0029: Repository history — the commit graph behind the changelog.
--
-- /changelog/graph draws the release rail, the commit DAG, the contribution
-- heatmap and the code-frequency chart from these rows. They are written by
-- `npm run repo:sync` (scripts/sync-repo-history.mjs), which reads the local
-- clone with `git log --numstat` — no GitHub API: the clone already holds every
-- commit, and an unauthenticated api.github.com allows 60 requests an hour,
-- which a public page cannot live inside.
--
-- Nothing here is derived at read time. A commit's additions and deletions are
-- what git reported when the row was written, the same way /stats is a snapshot
-- rather than a live count.

-- ---------------------------------------------------------------------------
-- Every commit, with its parents, so the DAG can be drawn without git
-- ---------------------------------------------------------------------------

create table if not exists public.repo_commits (
  sha         text primary key check (sha ~ '^[0-9a-f]{40}$'),
  -- First parent first, as git reports them. A commit with two or more parents
  -- is a merge; the lane layout on /changelog/graph is built from this column
  -- alone, which is why it is stored rather than recomputed.
  parents     text[] not null default '{}',
  authored_on date not null,
  authored_at timestamptz not null,
  author      text not null default '',
  subject     text not null default '',
  -- git's own numbers for the commit. A merge commit reports no diff of its
  -- own (git log --numstat is empty for one), so these are 0 on merges — that
  -- is correct, not missing: counting a merge's lines would count them twice.
  additions   int not null default 0,
  deletions   int not null default 0,
  files       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists repo_commits_date_idx
  on public.repo_commits (authored_on desc);

drop trigger if exists set_updated_at on public.repo_commits;
create trigger set_updated_at before update on public.repo_commits
  for each row execute function public.set_updated_at();

alter table public.repo_commits enable row level security;

drop policy if exists "public read" on public.repo_commits;
create policy "public read" on public.repo_commits for select using (true);

drop policy if exists "owner write" on public.repo_commits;
create policy "owner write" on public.repo_commits for all
  to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- What each version cost, on the changelog row itself
-- ---------------------------------------------------------------------------
--
-- A version has no git tag — there are none in this repository. It has
-- something better: the commit that added its `## [vX.Y.Z]` heading to
-- src/data/changelog.md, which is by convention the commit the version shipped
-- in. The sync script finds that commit with `git log -S`, and the version's
-- cost is the diff from the previous version's release commit to its own.

alter table public.changelog
  add column if not exists commit_sha    text references public.repo_commits(sha) on delete set null,
  add column if not exists lines_added   int,
  add column if not exists lines_removed int,
  add column if not exists files_changed int,
  add column if not exists commit_count  int;

-- Null, not zero: a version whose release commit could not be identified has
-- no measurement, and rendering that as "0 lines changed" would be a lie. The
-- page omits a stat it does not have.
comment on column public.changelog.lines_added is
  'Lines added between the previous version''s release commit and this one. Null when the release commit is unknown.';
