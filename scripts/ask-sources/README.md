# /ask sources

Every `*.mjs` file in this folder is a source for the `/ask` index. The indexer
(`npm run ask:index`) loads them all; there is no list to register a new one in.

## Adding a source

Create `scripts/ask-sources/<name>.mjs`:

```js
export default {
  type: "reading_list",           // lowercase, [a-z0-9_]; becomes content_chunks.entity_type
  load: (ctx) => ctx.fetchAll("reading_list", "*"),
  toChunks: (rows, { compose, syntheticId }) => rows.map((r) => ({
    entity_type: "reading_list",
    entity_id: r.id,               // or syntheticId(someStableKey) for non-table data
    chunk_index: 0,
    title: r.title,
    url: "/reading-list",
    chunk_date: null,
    tags: [],
    image_url: null,
    body: compose([["Reading list", r.title], [null, r.note]]),
  })),
};
```

Then:

1. `npm run ask:index -- --dry-run` — shows the new type and its chunk count.
2. `npm run ask:index` — embeds only the new chunks.
3. Optionally add a label, plural and listing page for the type in
   `src/data/askConfig.js`. Without one the chat still renders it ("Reading list").

No migration is needed: since `0016`, `content_chunks` accepts any well-formed
type name.

## The context object

`load(ctx)` and `toChunks(data, ctx)` receive:

| Key | What it is |
|---|---|
| `supabase` | service-role client (bypasses RLS — filter drafts yourself) |
| `fetchAll(table, columns)` | paginated select, ordered by id |
| `ROOT` | repo root, for reading files |
| `entityUrl(type, id)` | the site route for a known type |
| `compose`, `splitProse`, `clean` | chunk text helpers (`scripts/lib/chunking.mjs`) |
| `parseLooseDate`, `syntheticId` | date and id helpers |
| `storageUrl(path)`, `firstImage(slides)` | resolve Supabase Storage paths |

## Rules

- **Keys must be stable.** `(entity_type, entity_id, chunk_index)` identifies a
  chunk across runs. Two sources emitting the same key stop the run.
- **Throw when data is unavailable.** A source that throws is reported, the run
  exits non-zero, and its existing chunks are kept rather than deleted. Declare
  `owns: ["other_type"]` if the source also emits chunks of another type.
- **Keep daily-changing numbers out of `body`.** Changed text is re-embedded.
  Month-to-date figures belong in the worker's facts card
  (`functions/api/ask.js`), not in a chunk.
- **Text only needs to be embedded once.** Unchanged chunks are skipped, and
  text that merely moved to another key reuses its vector — see
  `planChunks()` in `scripts/lib/registry.mjs` and `npm run test:scripts`.
