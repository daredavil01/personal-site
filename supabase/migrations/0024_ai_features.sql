-- 0024 — One switchboard for the AI features outside /ask.
--
-- Tag descriptions, drafted form text, tag suggestions, bulk auto-tagging and
-- alt text all call a model, and until now each would have decided for itself
-- whether it was allowed to. This is the single place that decides, for the same
-- reason auto_eval_enabled is a row and not a constant: turning one of these off
-- should be an /admin edit, never a deploy.
--
-- It lives on ask_settings rather than in a table of its own because that row is
-- already the deployment's runtime config, already cached by the worker for 60
-- seconds, already edited at /admin/ask/settings, and already the thing a script
-- reads to find the model ladder. A second settings table would be a second
-- thing to read, cache and forget.
--
-- Shape: { "enabled": bool, "<feature>": bool }
--   enabled   the master switch — false means no feature here runs, whatever
--             its own flag says.
--   <feature> one key per feature, named in src/data/askConfig.js (AI_FEATURES).
--
-- Default '{}' means OFF, deliberately and in both directions: a deployment that
-- has not been touched runs nothing, and a settings read that fails falls back to
-- DEFAULT_ASK_SETTINGS, where every one of these is false too. The same bargain
-- as auto_eval_enabled — an unreachable database switches the machine off rather
-- than on.

alter table public.ask_settings
  add column if not exists ai_features jsonb not null default '{}'::jsonb;

comment on column public.ask_settings.ai_features is
  'Master + per-feature switches for the AI features outside /ask. Keys are defined in src/data/askConfig.js (AI_FEATURES); missing key means off.';
