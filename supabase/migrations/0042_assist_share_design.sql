-- 0042 — The share studio's "Ask AI" button logs to assist_log like the other
-- assist tasks (functions/api/assist.js, task share_design). Owner-only: the
-- endpoint checks is_owner() before a model is called; visitors get the
-- studio's on-device suggestions and never reach this.
--
-- The switch is the `share_suggest` key in ask_settings.ai_features (jsonb, no
-- column), so only the task CHECK needs widening. Idempotent.

alter table public.assist_log drop constraint if exists assist_log_task_check;
alter table public.assist_log
  add constraint assist_log_task_check
  check (task in ('draft', 'tags', 'alt', 'share_design'));
