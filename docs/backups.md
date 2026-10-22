# Backups

Weekly text backup of the Supabase content store into the private R2 bucket
`personal-website-backups`.

- **What:** `npm run backup` (`scripts/backup-r2.mjs`) reads every table in its
  `TABLES` list with the service-role key — content, tags and tag associations,
  now/newsletter, resume, `ask_settings`, newsletter feedback, /ask
  conversations, messages and shares, changelog — and writes one
  `text/<YYYY-MM-DD>.json.gz` holding `{ taken_at, tables: { name: rows[] } }`.
- **Not included:** Storage images (`media` bucket), `content_chunks` (rebuilt
  by `npm run ask:index`), `ask_usage` / `ask_eval_usage` (counters),
  `repo_commits` (rebuilt by `npm run repo:sync`), `assist_log`.
- **When:** `.github/workflows/backup.yml`, Mondays 02:30 IST, plus manual
  dispatch. Secrets: `SUPABASE_SERVICE_ROLE_KEY`, `CF_ACCOUNT_ID`,
  `CF_API_TOKEN` (needs Workers R2 Storage Write). Optional repo variable
  `R2_BACKUP_BUCKET`.
- **Retention:** bucket lifecycle rule `expire-text-30d` deletes objects under
  `text/` after 30 days. It lives on the bucket, not in code:

  ```bash
  npx wrangler r2 bucket lifecycle list personal-website-backups
  ```

- **Check without uploading:** `npm run backup -- --dry-run` prints row counts.

## Restore

1. `npx wrangler r2 object get personal-website-backups/text/<date>.json.gz --file backup.json.gz --remote`
2. Gunzip and parse; `tables.<name>` is the table's rows exactly as PostgREST
   returned them.
3. Upsert per table with the service-role key, parents before children
   (`tags` before `tag_associations`, `ask_conversations` before
   `ask_messages`). Identity `id` columns are `generated always`, so insert with
   `OVERRIDING SYSTEM VALUE` (SQL) or restore into a fresh table and copy.
   Tags come back through the `tag_associations` rows, not `set_entity_tags`.
