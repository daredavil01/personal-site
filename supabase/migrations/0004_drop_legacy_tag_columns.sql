-- Personal site — drop the legacy text[] tag columns
-- Depends on 0003_centralized_tags.sql.
--
-- APPLY LAST. Order:
--   1. 0003_centralized_tags.sql
--   2. npm run tags:migrate   (its verify step must pass)
--   3. deploy the app code that reads tag_names / writes set_entity_tags
--   4. this file
-- Running it earlier loses every tag that hasn't been migrated, and breaks the
-- still-deployed old code that reads these columns.

alter table public.books     drop column if exists tags;
alter table public.blogs     drop column if exists blog_tags;
alter table public.instagram drop column if exists tags;
alter table public.microblog drop column if exists tags;   -- takes microblog_tags_idx with it

notify pgrst, 'reload schema';
