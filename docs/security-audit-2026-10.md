# Security audit — 2026-10-22

Scope: Pages Functions (`functions/`), Supabase migrations (RLS, SECURITY
DEFINER functions, grants, Storage policies), client rendering sinks, GitHub
workflows, dependencies (read from `package-lock.json`; `npm audit` not run).

Clean: no secrets committed (`.env`, `.dev.vars` ignored; only the publishable
key is in history), RLS on every table with no anon write policy, every
SECURITY DEFINER function sets `search_path`, owner endpoints (`assist`,
`ask-eval`) check `is_owner()` with the caller's token before spending,
middleware escapes meta tags, JSON-LD and fallback HTML, every
`target="_blank"` has `rel`, no `pull_request_target` workflow.

## Fixed (v23.2.0)

| id | severity | finding | fix |
|---|---|---|---|
| C1 | critical | `/ask/s/<token>` stored XSS: share snapshots are built from client-sent turns; `AnswerBody` parsed raw HTML (`<iframe srcdoc>` runs on this origin and can read the Supabase session); `AskShare` trusted `source.external` for `<a href>` (`javascript:`) | `disableParsingRawHTML`, URL allow-list in `askShareSnapshot.js`, external decided from the URL, markdown-to-jsx 7.7 |
| H1 | high | anon could call `ask_quota` and use up `daily_global_cap`, switching /ask off | `0033`: service-role only; worker calls with service key |
| H2 | high | anon could call `ask_log` and write forged, unbounded conversations | `0033` |
| M1 | medium | `ask_eval_budget` / `ask_eval_record` still executable through PUBLIC (0022 revoked only anon/authenticated) — reset the judge's monthly spend cap | `0033` revokes from PUBLIC too |
| M2 | medium | open redirect: `//evil.example/` was 301'd off-site by the canonical-path redirect | redirect pinned to `url.origin` |

## Open

| id | severity | finding | suggested fix |
|---|---|---|---|
| M3 | medium | no security headers (CSP, `frame-ancestors`, HSTS, nosniff, Referrer-Policy); `/admin` can be framed | `public/_headers`; test CSP against gtag, Supabase, Turnstile, decks, Logbook |
| M4 | medium | `ask-refresh.yml` sets the service-role key job-wide, visible to `npm ci` install scripts | step-level `env`, as `backup.yml` does |
| M5 | medium | Turnstile fails open when the secret is missing or the settings read fails; `hostname` not checked | refuse in both cases; check `out.hostname` |
| M6 | medium | `is_owner()` compares the JWT email | compare `auth.uid()` to a fixed UUID |
| L1 | low | `hashIp` falls back to the fixed salt `"ask"` | throw when `ASK_IP_SALT` is unset |
| L2 | low | POST endpoints accept any Content-Type (cross-site text/plain POSTs) | require `application/json` or check `Origin` |
| L3 | low | `bump_ask_share_view` counts can be inflated | accept |
| L4 | low | `payload.types` in `ask.js` uncapped; client can send assistant-role history | cap + allow-list |
| L5 | low | public SELECT policy on `storage.objects` allows listing the `media` bucket | drop it; public buckets serve files without it |
| L6 | low | `/rss-feed` cache keyed by full URL incl. query | key on `FEED_URL` |
| L7 | low | `/api/stats` returns `err.message` | generic error |
| L8 | low | CodeQL workflow uses retired `codeql-action@v1`, `checkout@v2` | v3 / v4 |
| L9 | low | `node.js.yml` has no `permissions:`; actions pinned by tag | `contents: read`, pin SHAs |
| L10 | low | an old Google Maps key from the original template is in git history | revoke if it was ever yours |
| L11 | low | react-router-dom 6.9; dev-only cross-spawn / brace-expansion ReDoS | 6.30.x; `npm audit fix` |
