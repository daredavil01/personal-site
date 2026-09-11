-- Repairs project dates lost to the leading-space bug in the first cut of 0005.
--
-- 0005 originally matched its date backfill on `p.title = v.title`. One row is
-- stored as " E20 ka Chakravyuha", with a leading space, so it never matched,
-- fell through to the non-ISO safety net, and had its date set to null. 0005 was
-- corrected to trim titles and match on btrim, but a database that ran the first
-- version already lost the value — this restores it.
--
-- Safe to run on a database that never had the problem: it only touches rows
-- whose date is null, and it is idempotent.

update public.projects as p set date = v.date::date
from (values
  ('Expense Management Web-App using firebase',        '2020-10-20'),
  ('Personal Website',                                 '2020-10-20'),
  ('Social-Ape',                                       '2020-11-20'),
  ('RunLog',                                           '2026-03-01'),
  ('RunSmart',                                         '2026-03-01'),
  ('Young Foundation Nisarg School Management Portal', '2026-07-01'),
  ('YUNG Foundation Website',                          '2026-08-01'),
  ('RunFolio',                                         '2026-08-01'),
  ('Visiting Card',                                    '2026-08-01'),
  ('E20 ka Chakravyuha',                               '2026-08-01'),
  ('Antyodaya Foundation Website',                     '2026-08-01'),
  ('CMS Site Planner',                                 '2026-08-01'),
  ('Personal Websites & Projects Directory',           '2026-08-01')
) as v(title, date)
where p.date is null and btrim(p.title) = v.title;

notify pgrst, 'reload schema';
