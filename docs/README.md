# docs/

Two audiences read this folder, and they read different files.

**Coding agents and humans** — start with [architecture.md](architecture.md) for how the
app is put together, then:

| file | what it is | written by |
|---|---|---|
| [data-model.md](data-model.md) | Table-by-table dictionary: columns, types, constraints, live row counts, client-side field renames. | generated + prose |
| [entities.md](entities.md) | What each content type *means* — the things no schema can tell you. | by hand |
| [routes.md](routes.md) | Route → component map, scraped from `src/App.js`. | generated |
| [tags.md](tags.md) | The central tag vocabulary with usage counts. | generated |
| [SITE_DOSSIER.md](SITE_DOSSIER.md) | The long-form tour of the site. | by hand |

**The chatbot at `/ask`** reads exactly one file:

| file | what it is |
|---|---|
| [chatbot-context.md](chatbot-context.md) | A ~1,200-token card describing the archive, injected into every `/ask` prompt. Derived from the others — never edit it directly. |
| [facts.json](facts.json) | The same counts as the `site_facts()` RPC, committed so the Pages Function has an offline fallback. |

## Regenerating

```bash
npm run docs:build
```

Needs `SUPABASE_SERVICE_ROLE_KEY` in `.env`. It reads the live database, rewrites
everything between `<!-- generated:NAME start -->` and `<!-- generated:NAME end -->`
markers, and pushes `chatbot-context.md` into `ask_settings.context_doc` so the
worker and the repo agree without a redeploy.

**Prose outside a marker survives; anything inside one is overwritten.** If a
paragraph matters, keep it outside.

`npm run ask:index` runs this as its last step, so rebuilding the search index
and refreshing the docs are the same command.

- `og-cards.md` — the per-route share cards: how they render, the Workers CPU bet, the Devanagari limitation, and development status.
- `ask-evals.md` — the automatic judge for /ask answers: the rubric, the two routes, every spend gate, and how to turn it off.
