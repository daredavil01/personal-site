-- Personal site — initial Supabase schema
-- Apply via the Supabase SQL editor (paste & run) or `supabase db push`.
--
-- Conventions:
--   * snake_case columns; bigint identity primary keys
--   * created_at / updated_at timestamptz on every table (updated_at via trigger)
--   * arrays of scalars  -> text[]   (tags, points, category labels)
--   * arrays/objects      -> jsonb    (slide_images, daily_rituals, now sections)
--   * RLS: public SELECT, owner-only writes (see OWNER_EMAIL below)

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Returns true only for the single site owner. Public sign-ups are disabled in
-- the Supabase Auth settings, so only this account can ever authenticate; the
-- email check is defence-in-depth. Update the address here if the owner changes.
create or replace function public.is_owner()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'sanket.tambare01@gmail.com';
$$;

-- ---------------------------------------------------------------------------
-- Content tables
-- ---------------------------------------------------------------------------

create table if not exists public.books (
  id            bigint generated always as identity primary key,
  title         text not null,
  author        text not null,
  category      text not null,
  language      text not null,
  description   text not null,
  year          int  not null,
  tags          text[] not null default '{}',
  translator    text,
  blog_link     text,
  blog_platform text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.sports (
  id                    bigint generated always as identity primary key,
  title                 text not null,
  date                  text not null,
  description           text not null,
  place                 text not null,
  distance              text not null,
  time                  text not null,
  time_certificate_link text,
  bib_number            text,
  slide_images          jsonb not null default '[]',   -- [{url, caption}]
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.treks (
  id              bigint generated always as identity primary key,
  fort_name       text not null,
  trek_time       text not null,
  endurance_level text not null,
  date            text not null,
  blog_link       text,
  slide_images    jsonb not null default '[]',          -- [{url, caption}]
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.projects (
  id          bigint generated always as identity primary key,
  title       text not null,
  subtitle    text,
  link        text not null,
  image       text not null,
  date        text not null,
  description  text not null,                            -- was `desc` in the JS data
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 100 Days To Offload blog posts
create table if not exists public.blogs (
  id               bigint generated always as identity primary key,
  blog_title       text not null,
  blog_description text not null,
  challenge_id     text not null default '100_days_to_offload',
  blog_tags        text[] not null default '{}',
  blog_date        text not null,
  blog_link        text not null,
  blog_platform    text not null,
  language         text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.instagram (
  id           bigint generated always as identity primary key,
  title        text not null,
  caption      text not null,
  tags         text[] not null default '{}',
  slide_images jsonb not null default '[]',              -- [{url, caption}]
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Now page — single meta row + one row per month
create table if not exists public.now_meta (
  id             int primary key default 1,
  intro_story    text,
  category_labels text[] not null default '{}',
  nownownow_url  text,
  inspired_by    jsonb,                                  -- {name, url, nownownow}
  daily_rituals  jsonb not null default '[]',            -- [{icon, label, description}]
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint now_meta_singleton check (id = 1)
);

create table if not exists public.now_months (
  id         bigint generated always as identity primary key,
  month      text not null,
  year       int  not null,
  is_current boolean not null default false,
  sections   jsonb not null default '{}',  -- {blogs, running, books, events, projects, stats, website, certificates, misc}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, year)
);

-- Resume sub-collections
create table if not exists public.resume_positions (
  id         bigint generated always as identity primary key,
  company    text not null,
  position   text not null,
  link       text not null,
  daterange  text not null,
  points     text[] not null default '{}',
  sort_order int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resume_degrees (
  id         bigint generated always as identity primary key,
  school     text not null,
  degree     text not null,
  link       text not null,
  year       int  not null,
  sort_order int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resume_certifications (
  id          bigint generated always as identity primary key,
  name        text not null,
  link        text not null,
  source      text not null,
  issued_date text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.resume_skills (
  id         bigint generated always as identity primary key,
  title      text not null,
  competency int  not null,
  category   text[] not null default '{}',
  sort_order int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers + RLS policies for every table
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  content_tables text[] := array[
    'books','sports','treks','projects','blogs','instagram',
    'now_meta','now_months',
    'resume_positions','resume_degrees','resume_certifications','resume_skills'
  ];
begin
  foreach t in array content_tables loop
    -- updated_at trigger
    execute format(
      'drop trigger if exists set_updated_at on public.%I;', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t);

    -- enable RLS
    execute format('alter table public.%I enable row level security;', t);

    -- public read
    execute format('drop policy if exists "public read" on public.%I;', t);
    execute format(
      'create policy "public read" on public.%I for select using (true);', t);

    -- owner write (insert/update/delete)
    execute format('drop policy if exists "owner write" on public.%I;', t);
    execute format(
      'create policy "owner write" on public.%I for all
         to authenticated
         using (public.is_owner()) with check (public.is_owner());', t);
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- Storage bucket for admin image uploads
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "media owner write" on storage.objects;
create policy "media owner write" on storage.objects
  for all to authenticated
  using (bucket_id = 'media' and public.is_owner())
  with check (bucket_id = 'media' and public.is_owner());
