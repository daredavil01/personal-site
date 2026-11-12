---
name: site-upkeep
description: Run the site's periodic upkeep end to end (e.g. "/site-upkeep", "refresh the site data", "run npm run refresh"). Snapshots the numbers, runs npm run refresh, fills any changelog summary the model ladder failed on with a Haiku subagent, re-renders the share cards whose numbers moved, validates every output, and returns a before/after summary of what changed. Commits only when asked.
---

# Site upkeep

`npm run refresh` (`scripts/refresh.mjs`) is the upkeep: changelog → repo →
blogs → strava → ask → logbook → microblog → indexnow. Your job is to run it,
finish what it leaves undone, prove the outputs are consistent, and report.
CLAUDE.md's **Periodic upkeep**, **Ask Sources** and **The Logbook** sections
say what each step means.

## Input

Nothing, or step names to run a subset (`/site-upkeep blogs ask logbook`) — pass
them through as `npm run refresh -- <steps>`. "Dry run" → add `-- --dry-run`,
skip steps 4–6 and the commit, and report the plan.

## Steps

Keep every working file in your scratchpad directory (call it `$S` below; use
its full absolute path in commands and in anything you tell the user).

1. **Preflight.** Fix these before running anything; none of them is a
   reason to stop:
   - Secrets: check `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`,
     `CF_ACCOUNT_ID`, `CF_API_TOKEN` are set (`[ -n "$X" ]`, never print a
     value). A missing one is a real blocker for the steps CLAUDE.md lists
     against it: say which steps it costs, run the rest
     (`npm run refresh -- <steps>`), and report the gap. The Supabase URL and
     publishable key are public and read from `wrangler.toml` when unset.
   - `git rev-parse --is-shallow-repository` → `true` means
     `git fetch --unshallow origin`; the `repo` step refuses a shallow clone.
   - `node_modules` missing → `npm ci`.
   - Not on the latest `main` → say so; refresh from what is checked out only
     if the user wants that.

2. **Snapshot.** `npm run refresh:report -- snapshot $S/before.json`

3. **Run.** `npm run refresh 2>&1 | tee $S/refresh.log` (timeout 10 min).
   It stops at the first failing step: read the error, fix the cause, re-run
   from that step (`npm run refresh -- <that step> <the ones after it>`).
   Ignore the `MODULE_TYPELESS_PACKAGE_JSON` warnings. Read the log for:
   - `every rung failed` or `N failed` in the changelog step → step 4.
   - `Substack unreachable` or `posts have no text` → the essays did not
     arrive. Find out why before reporting it: `curl` the URL in the message
     and read the response body. A 403 challenge is Substack blocking this
     machine (CLAUDE.md: it blocks GitHub runners) — report it. A 400 with a
     JSON error is Substack changing its API (it moved the archive to cursor
     paging in November 2026) — fix `fetchSubstack` in
     `scripts/blog-word-counts.mjs` and re-run `blogs ask logbook`.
   - `kept existing chunks for: writing` → the same thing seen from `/ask`.

4. **Fill failed summaries with Haiku.** Only for what the ladder failed on
   (Gemini 503s; the Workers AI rungs cannot run in node by design):
   1. `node scripts/summarise-changelog.mjs --export $S/notes` — one
      `<version>.prompt.txt` per version still without a summary.
   2. Spawn one Agent with `model: "haiku"`, told to read each prompt file,
      follow the rules above its `---` exactly, and write `<version>.answer.txt`
      (the paragraph alone) beside it. Read/Write only.
   3. Check each answer against its prompt: every name, place and feature it
      mentions must appear in the entries. Rewrite a sentence that invents
      anything.
   4. `node scripts/summarise-changelog.mjs --import $S/notes`
   5. Then the majors, which are built from those notes — so run this even
      when only a note failed: `node scripts/summarise-majors.mjs --export
      $S/majors`, Haiku writes `v<major>.answer.json` (bare JSON, the keys
      the prompt names), check them the same way, then
      `node scripts/summarise-majors.mjs --import $S/majors --model claude-haiku`.
   6. `npm run ask:index` so `/ask` reads the new changelog text.

5. **Re-render the cards whose numbers moved.** Each card bakes its numbers
   in (`npm run og:fallbacks -- --only=<slug>`, one slug per run). Always
   `stats`; plus `writing-ledger` and `logbook` when posts moved, `micro-blog`
   when micro-posts moved, `100-days-to-offload` when the blogs table moved,
   `training` after a Strava import. Never commit a card over 300 KB that was
   under it before.

6. **Validate.** All of these must hold:
   - `npm run refresh:report -- diff $S/before.json` exits 0. It checks: the
     text cache misses no post, the Logbook counts every ledger post, every
     `blogs` row matches a published post (warning), the data files are
     inside their test budgets, no card newly over 300 KB, every changelog
     version and major has a summary, `/ask` holds essay chunks.
   - `node scripts/summarise-changelog.mjs --dry-run` and
     `node scripts/summarise-majors.mjs --dry-run` both say `0 … to summarise`.
   - `npm run ask:index -- --dry-run` plans `0 to embed`, and no `kept
     existing chunks` line.
   - `npx jest src/lib/logbook src/lib/writingLedger src/lib/microblogInsights
     src/components/Logbook src/data/routeManifest` passes, plus the tests of
     any code you changed. (`npm test` is Jest; vitest finds no tests here.)
   A failing check is work to do, not a line in the report: fix it and
   re-validate. Report it only if it cannot be fixed from here, and say why.

7. **Commit — only if the user asked.** Stage the generated files (`docs/`,
   `public/data/`, `public/og/`, `src/data/blogWords.js`, and the emptied
   `src/data/changelog.md`), never `knowledge_base/` (gitignored). Data alone
   needs no changelog entry; a code fix you made does (CLAUDE.md's rule).
   Push where the user says; otherwise to the session's branch.

## The summary you return

Lead with the outcome in one line (done, or done except X). Then:

- **What moved:** the `refresh:report diff` table, trimmed to the rows that
  changed, plus the new posts it lists, by title.
- **Changelog:** versions published, notes and chapter summaries written, and
  which ones Haiku wrote.
- **Fixed on the way:** each thing you had to repair (API change, missing
  var), one line each.
- **Checks:** pass/fail per item from step 6.
- **Still open:** anything that needs the user (a blocked host, a missing
  secret, a summary to review on `/changelog`), or nothing.

Plain sentences, no step-by-step narration of commands you ran.
