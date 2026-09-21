-- 0031: How many entries a version carries, as a column.
--
-- /changelog/graph wants "how much was written" beside "how many lines moved",
-- and `changes` is the prose /changelog renders — several hundred KB across the
-- archive, which a stats page must not download to count an array.
--
-- Generated, so it can never disagree with the column it counts.
-- jsonb_array_length is immutable, which is what a stored generated column
-- requires; a split by kind is not (it needs a path query), so the kinds are
-- counted where the rows are already loaded, on the page.

alter table public.changelog
  add column if not exists entry_count int
    generated always as (jsonb_array_length(changes)) stored;
