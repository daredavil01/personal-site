-- ---------------------------------------------------------------------------
-- 0008 — Books reborn.
--
-- The books table has carried the same eight content columns since 0001 while
-- every other collection was rebuilt. This adds the bibliographic metadata the
-- redesigned /books page renders (cover, ISBN, pages, publisher, original
-- publication year) plus the personal reading metadata that was never modelled
-- (rating, finish date, status, format, pull-quote, note), and normalizes
-- `category` off free text onto a canonical list.
--
-- `year` keeps its existing meaning: the year the book was READ. The book's own
-- publication year is the new `first_published` column. They are different
-- numbers (Sapiens: read 2021, published 2011) and the old single column
-- conflated them.
--
-- Apply via the Supabase SQL editor or `supabase db push`, then run
-- `npm run books:backfill` to populate the new columns from Open Library /
-- Google Books / BookGanga.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. New columns
-- ---------------------------------------------------------------------------
alter table public.books
  add column if not exists cover_url       text,
  add column if not exists isbn            text,
  add column if not exists page_count      int,
  add column if not exists publisher       text,
  add column if not exists first_published int,
  add column if not exists rating          smallint,
  add column if not exists date_finished   date,
  add column if not exists date_precision  text not null default 'year',
  add column if not exists status          text not null default 'read',
  add column if not exists format          text,
  add column if not exists goodreads_url   text,
  add column if not exists quote           text,
  add column if not exists note            text;

comment on column public.books.year is
  'Year the book was READ. The publication year is first_published.';
comment on column public.books.date_precision is
  'How much of date_finished is real: day when it came from a dated review, year when only the read year is known and the month/day are filler.';

alter table public.books drop constraint if exists books_rating_check;
alter table public.books drop constraint if exists books_status_check;
alter table public.books drop constraint if exists books_format_check;
alter table public.books drop constraint if exists books_date_precision_check;
alter table public.books
  add constraint books_rating_check check (rating is null or rating between 1 and 5),
  add constraint books_status_check check (status in
    ('read', 'reading', 'abandoned', 'want-to-read')),
  add constraint books_format_check check (format is null or format in
    ('paperback', 'hardcover', 'ebook', 'audiobook')),
  add constraint books_date_precision_check check (date_precision in ('day', 'year'));

create index if not exists books_date_finished_idx
  on public.books (date_finished desc nulls last);

-- ---------------------------------------------------------------------------
-- 2. Seed the personal metadata. Every book is rated 4 and marked read by
--    default; edit in /admin.
-- ---------------------------------------------------------------------------
update public.books set rating = 4 where rating is null;

-- ---------------------------------------------------------------------------
-- 3. Normalize `category` onto a canonical list.
--
--    It was free text and had drifted badly — 'Semi-counductor', 'Autography',
--    'Non-FIction', 'Social ' (trailing space), 'Story, FIction'. Multi-value
--    strings were never split by any consumer, so the second genre was dead
--    weight in a column that only ever rendered as one chip.
--
--    Mapped by id, which is stable. The dropped secondary genres are not lost —
--    step 4 pushes the specific ones into the central tag system.
-- ---------------------------------------------------------------------------
update public.books b set category = m.category
from (values
  (1,  'Technology'),             (2,  'History'),                (3,  'Public Policy'),
  (4,  'Biography & Memoir'),     (5,  'Society'),                (6,  'Psychology & Self-Help'),
  (7,  'Psychology & Self-Help'), (8,  'Psychology & Self-Help'), (9,  'History'),
  (10, 'History'),                (11, 'Society'),                (12, 'Technology'),
  (13, 'Public Policy'),          (14, 'Public Policy'),          (15, 'Society'),
  (16, 'Fiction'),                (17, 'Fiction'),                (18, 'Philosophy'),
  (19, 'Philosophy'),             (20, 'Fiction'),                (21, 'Fiction'),
  (22, 'Fiction'),                (23, 'Public Policy'),          (24, 'Travel & Adventure'),
  (25, 'Biography & Memoir'),     (26, 'Biography & Memoir'),     (27, 'Biography & Memoir'),
  (28, 'Technology'),             (29, 'Technology'),             (30, 'Technology'),
  (31, 'Technology'),             (32, 'Fiction'),                (33, 'Philosophy'),
  (34, 'Technology'),             (35, 'Psychology & Self-Help'), (36, 'Society'),
  (37, 'Technology'),             (38, 'Philosophy'),             (39, 'Society'),
  (40, 'Technology'),             (41, 'Sports'),                 (42, 'History'),
  (43, 'History'),                (44, 'Biography & Memoir'),     (45, 'Society'),
  (46, 'Sports'),                 (47, 'Society'),                (48, 'Travel & Adventure'),
  (49, 'Travel & Adventure'),     (50, 'Biography & Memoir'),     (51, 'Fiction')
) as m(id, category)
where b.id = m.id;

-- Anything added after this migration was written, or any id that moved: fall
-- back to a safe bucket rather than failing the constraint below.
update public.books set category = 'Non-fiction'
where category is null or category not in
  ('Fiction', 'Non-fiction', 'Technology', 'Public Policy', 'Philosophy',
   'Psychology & Self-Help', 'Biography & Memoir', 'Society', 'History',
   'Sports', 'Travel & Adventure');

alter table public.books drop constraint if exists books_category_check;
alter table public.books
  add constraint books_category_check check (category in
    ('Fiction', 'Non-fiction', 'Technology', 'Public Policy', 'Philosophy',
     'Psychology & Self-Help', 'Biography & Memoir', 'Society', 'History',
     'Sports', 'Travel & Adventure'));

-- ---------------------------------------------------------------------------
-- 4. Rescue the specific secondary genres into the central tags.
--    Generic ones (non-fiction, social, literature, story) are dropped — they
--    duplicate the category axis and would make a tag cloud useless.
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select * from (values
    (12, array['privacy']),
    (16, array['sexual-drama']),
    (17, array['philosophy']),
    (18, array['spirituality']),
    (19, array['love']),
    (20, array['philosophy']),
    (22, array['religion']),
    (24, array['forts', 'maharashtra']),
    (28, array['semiconductors']),
    (29, array['ai']),
    (34, array['ai']),
    (35, array['technology']),
    (37, array['surveillance']),
    (38, array['art']),
    (39, array['technology', 'psychology']),
    (40, array['ai']),
    (41, array['motivation']),
    (43, array['oil'])
  ) as t(id, extra)
  loop
    -- Merge, never replace: set_entity_tags swaps the whole set, so the row's
    -- existing tags have to be passed back in alongside the new ones.
    perform public.set_entity_tags(
      'book', r.id, public.entity_tag_names('book', r.id) || r.extra
    );
  end loop;
end $$;
