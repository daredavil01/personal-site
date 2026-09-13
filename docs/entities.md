# What the content types actually mean

Hand-written. `npm run docs:build` never touches this file — it is the half a
schema dump cannot give you, and the half that makes `/ask` sound like someone
who knows the archive rather than someone reading column names.

If you change what a field means, change it here too.

## Books

`year` is the year the book was **read**, not the year it was published — that
is `first_published`. Half the finish dates are reconstructed from memory, which
is why `date_precision` exists: `'year'` means "sometime that year, don't quote a
day", `'day'` means the date is real.

`status` covers `read`, `reading`, `abandoned`, `want-to-read`. Abandoned is not
a failure state; it is information, and the archive keeps it on purpose.

`category` is a fixed vocabulary (see the CHECK constraint in
[data-model.md](data-model.md)) and is separate from tags: the category is what
shelf the book sits on, tags are what it is about.

`blog_link` points at a review published elsewhere. There is no review text in
the database — only the link — so the chatbot must not claim to know what a
review says.

## Micro-blog

A bulk import of an old Tumblr archive, ~1,600 rows, and the largest corpus on
the site by row count. Two things follow from that:

- These are **passing thoughts, not positions**. They are short, unedited, often
  years old, and a fair number are reblogs of someone else's words. An answer
  that quotes a micro post as a considered opinion is wrong even when the quote
  is accurate.
- Roughly 59% are photo posts whose images were never migrated, so `image_url` is
  usually blank and `text` is often empty. A chunk with no text is not a bug.

`source` distinguishes `tumblr` (imported), `manual` (written in `/admin`), and
leaves room for other archives later. `source_id` is the Tumblr post id and is
null for manual posts.

## 100 Days To Offload (`blogs`)

A **ledger**, not a corpus. Each row is a title, a description and a link out to
Substack or WordPress — the post body is not in the database. Anything the
chatbot says about one of these posts has to come from its description.

Not every published post has a row; the ledger tracks the challenge, not the
whole writing output.

## Projects

`visible = false` means draft, and it is enforced in Postgres, not React: the RLS
policy narrows anonymous selects to `visible or is_owner()`, so a hidden project
never reaches a public payload, a tag page, a share card, or the index. The
indexer skips them too — but the database is the thing actually guarding it.

`tech_stack` is a plain `text[]`, deliberately not tags: tags are the topical
axis ("urbanism", "running"), tech stack is the build axis ("react", "postgres").
Both are filterable on `/projects`, and one row can't back two independent tag
sets because `set_entity_tags` replaces an entity's whole tag set.

`problem` / `solution` / `outcome` are the only long prose in this table, which
is why projects are the one content type the indexer splits into several chunks.

## Presentations

HTML slide decks — talks, feature dossiers, data stories — that live on their
own host (GitHub Pages) and are embedded on the site by URL. The row holds only
metadata; the deck is never copied into the repo or storage, so adding one is an
`/admin` edit. `url` must be https and the host must allow iframes. `date` is
optional; an undated deck buckets into the Monthly Digest by `created_at`. The
indexer fetches each deck and indexes its slide text alongside the metadata.

## Races (`sports`)

`date` is free text in "February 22, 2026" form and `time` is chip time as
`HH:MM:SS` — finish time, not pace. `distance` is a label ("21 Kms"), not a
number, so distance questions are string matches.

`timeCertificateLink` is the official result certificate. If it is missing, the
time is self-reported.

## Treks

`date` is free text in `DD-MM-YYYY` — a different format from races, for
historical reasons, which is why the indexer parses both.

`endurance_level` is Easy/Medium/Hard and is a personal rating of that day, not
an objective grade of the fort.

## Instagram

Photo sets with captions. There is no detail route — everything renders on
`/instagram` — so every chunk of this type links to the listing page.

## Now

One row per month, with a free-form `sections` jsonb blob (`blogs`, `running`,
`books`, `events`, `projects`, `website`, `stats`, `certificates`, `misc`).
Exactly one row has `is_current = true`; the rest are the archive. "What is he
doing now" should be answered from the current row, not from whatever the search
happened to retrieve.

## Tags

Lowercase, always, and compared case-insensitively. Names are **URI-encoded, not
slugified**, because several are in Marathi and slugifying would destroy them.
Tags are shared across every content type through `tag_associations`, which is
what makes cross-entity questions ("what else is tagged like this book?")
answerable at all.

Resume skill categories are *not* tags — `resume_skills.category` is a plain
`text[]`.

## Pages

`about.md` and `changelog.md` are hand-maintained markdown in `src/data/`, not
rows. The changelog is the densest prose in the repo and doubles as the project's
memory: "when did the site get X" is usually answerable from it.
