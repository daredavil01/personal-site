# Data model

Generated from the live database by `npm run docs:build`. Prose outside the
generated block is hand-written and survives regeneration; anything inside the
markers is overwritten.

See [entities.md](entities.md) for what these tables mean.

<!-- generated:data-model start -->
### `books`

Every book read, with the review link when there is one. `year` is the year READ, not published.

Rows: **51** · indexed as `book`

| column | type | null | default |
|---|---|---|---|
| `id` | bigint | no | — |
| `title` | text | no | — |
| `author` | text | no | — |
| `category` | text | no | — |
| `language` | text | no | — |
| `description` | text | no | — |
| `year` | integer | no | — |
| `translator` | text | yes | — |
| `blog_link` | text | yes | — |
| `blog_platform` | text | yes | — |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |
| `cover_url` | text | yes | — |
| `isbn` | text | yes | — |
| `page_count` | integer | yes | — |
| `publisher` | text | yes | — |
| `first_published` | integer | yes | — |
| `rating` | smallint | yes | — |
| `date_finished` | date | yes | — |
| `date_precision` | text | no | `'year'::text` |
| `status` | text | no | `'read'::text` |
| `format` | text | yes | — |
| `goodreads_url` | text | yes | — |
| `quote` | text | yes | — |
| `note` | text | yes | — |

Constraints:
- `CHECK ((category = ANY (ARRAY['Fiction'::text, 'Non-fiction'::text, 'Technology'::text, 'Public Policy'::text, 'Philosophy'::text, 'Psychology & Self-Help'::text, 'Biography & Memoir'::text, 'Society'::text, 'History'::text, 'Sports'::text, 'Travel & Adventure'::text])))`
- `CHECK ((date_precision = ANY (ARRAY['day'::text, 'year'::text])))`
- `CHECK (((format IS NULL) OR (format = ANY (ARRAY['paperback'::text, 'hardcover'::text, 'ebook'::text, 'audiobook'::text]))))`
- `CHECK (((rating IS NULL) OR ((rating >= 1) AND (rating <= 5))))`
- `CHECK ((status = ANY (ARRAY['read'::text, 'reading'::text, 'abandoned'::text, 'want-to-read'::text])))`

### `blogs`

The 100 Days To Offload challenge ledger — one row per published post, pointing at Substack/WordPress.

Rows: **60** · indexed as `blog`

Client-side renames: tags live on `blog_tags`, not `tags`

| column | type | null | default |
|---|---|---|---|
| `id` | bigint | no | — |
| `blog_title` | text | no | — |
| `blog_description` | text | no | — |
| `challenge_id` | text | no | `'100_days_to_offload'::text` |
| `blog_date` | text | no | — |
| `blog_link` | text | no | — |
| `blog_platform` | text | no | — |
| `language` | text | no | — |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

### `microblog`

A 2013→2019 Tumblr archive, imported in bulk. Two languages, ~59% photo posts, short and unedited.

Rows: **1661** · indexed as `microblog`

Client-side renames: `source_id` → `sourceId`, `post_type` → `postType`, `image_url` → `imageUrl`

| column | type | null | default |
|---|---|---|---|
| `id` | bigint | no | — |
| `source` | text | no | `'tumblr'::text` |
| `source_id` | text | yes | — |
| `post_type` | text | no | `'text'::text` |
| `date` | date | no | — |
| `title` | text | no | `''::text` |
| `text` | text | no | `''::text` |
| `url` | text | yes | — |
| `image_url` | text | yes | — |
| `search_tsv` | tsvector | yes | `to_tsvector('simple'::regconfig, ((COALE` |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

### `projects`

Things built, with problem/solution/outcome prose. `visible = false` means draft and is hidden by RLS, not by React.

Rows: **13** · indexed as `project`

Client-side renames: `description` → `desc`, `tech_stack` → `techStack`, `slide_images` → `slideImages`

| column | type | null | default |
|---|---|---|---|
| `id` | bigint | no | — |
| `title` | text | no | — |
| `subtitle` | text | yes | — |
| `link` | text | no | — |
| `image` | text | yes | — |
| `date` | date | yes | — |
| `description` | text | no | — |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |
| `slide_images` | jsonb | no | `'[]'::jsonb` |
| `links` | jsonb | no | `'[]'::jsonb` |
| `tech_stack` | text[] | no | `'{}'::text[]` |
| `highlights` | text[] | no | `'{}'::text[]` |
| `category` | text | yes | — |
| `status` | text | yes | — |
| `role` | text | yes | — |
| `org` | text | yes | — |
| `featured` | boolean | no | `false` |
| `visible` | boolean | no | `true` |
| `problem` | text | yes | — |
| `solution` | text | yes | — |
| `outcome` | text | yes | — |

Constraints:
- `CHECK (((category IS NULL) OR (category = ANY (ARRAY['Web App'::text, 'Website'::text, 'Data Story'::text, 'Tool'::text, 'Design'::text, 'Other'::text]))))`
- `CHECK (((status IS NULL) OR (status = ANY (ARRAY['Live'::text, 'In Progress'::text, 'Archived'::text, 'Concept'::text]))))`

### `sports`

Races run. `date` is free text ('February 22, 2026'), `time` is chip time HH:MM:SS.

Rows: **25** · indexed as `sport`

Client-side renames: `time_certificate_link` → `timeCertificateLink`, `bib_number` → `bibNumber`, `slide_images` → `slideImages`

| column | type | null | default |
|---|---|---|---|
| `id` | bigint | no | — |
| `title` | text | no | — |
| `date` | text | no | — |
| `description` | text | no | — |
| `place` | text | no | — |
| `distance` | text | no | — |
| `time` | text | no | — |
| `time_certificate_link` | text | yes | — |
| `bib_number` | text | yes | — |
| `slide_images` | jsonb | no | `'[]'::jsonb` |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

### `treks`

Forts and hills climbed. `date` is free text in DD-MM-YYYY.

Rows: **20** · indexed as `trek`

Client-side renames: `slide_images` → `slideImages`

| column | type | null | default |
|---|---|---|---|
| `id` | bigint | no | — |
| `fort_name` | text | no | — |
| `trek_time` | text | no | — |
| `endurance_level` | text | no | — |
| `date` | text | no | — |
| `blog_link` | text | yes | — |
| `slide_images` | jsonb | no | `'[]'::jsonb` |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

### `instagram`

Photo sets mirrored from Instagram. No detail route — everything renders on /instagram.

Rows: **11** · indexed as `instagram`

| column | type | null | default |
|---|---|---|---|
| `id` | bigint | no | — |
| `title` | text | no | — |
| `caption` | text | no | — |
| `slide_images` | jsonb | no | `'[]'::jsonb` |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

### `now_months`

One row per month of the /now page. `sections` is a free-form jsonb blob.

Rows: **12** · indexed as `now`

Client-side renames: `is_current` → `isCurrent`

| column | type | null | default |
|---|---|---|---|
| `id` | bigint | no | — |
| `month` | text | no | — |
| `year` | integer | no | — |
| `is_current` | boolean | no | `false` |
| `sections` | jsonb | no | `'{}'::jsonb` |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

### `tags`

The central tag vocabulary: lowercase name, display name, colour, category.

Rows: **213**

Client-side renames: `display_name` → `displayName`

| column | type | null | default |
|---|---|---|---|
| `id` | bigint | no | — |
| `name` | text | no | — |
| `display_name` | text | yes | — |
| `color` | text | yes | — |
| `description` | text | yes | — |
| `category` | text | yes | — |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

Constraints:
- `CHECK ((color ~ '^#[0-9a-f]{6}
::text))`
- `CHECK (((name = lower(btrim(name))) AND (name <> ''::text)))`

### `tag_associations`

Polymorphic join from a tag to a row in any content table.

Rows: **471**

| column | type | null | default |
|---|---|---|---|
| `entity_type` | text | no | — |
| `entity_id` | bigint | no | — |
| `tag_id` | bigint | no | — |
| `position` | integer | no | `0` |
| `created_at` | timestamp with time zone | no | `now()` |

Constraints:
- `CHECK ((entity_type = ANY (ARRAY['book'::text, 'blog'::text, 'instagram'::text, 'microblog'::text, 'sport'::text, 'trek'::text, 'project'::text])))`

### `content_chunks`

The /ask search index. Written only by `npm run ask:index` — never by hand.

Rows: **2702**

| column | type | null | default |
|---|---|---|---|
| `id` | bigint | no | — |
| `entity_type` | text | no | — |
| `entity_id` | bigint | no | — |
| `chunk_index` | integer | no | `0` |
| `title` | text | no | `''::text` |
| `url` | text | no | `''::text` |
| `body` | text | no | `''::text` |
| `chunk_date` | date | yes | — |
| `tags` | text[] | no | `'{}'::text[]` |
| `embedding` | vector(1024) | yes | — |
| `fts` | tsvector | yes | `to_tsvector('simple'::regconfig, ((COALE` |
| `source_updated_at` | timestamp with time zone | yes | — |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |
| `content_hash` | text | yes | — |
| `embed_hash` | text | yes | — |
| `image_url` | text | yes | — |

Constraints:
- `CHECK ((entity_type ~ '^[a-z][a-z0-9_]*
::text))`

### `ask_settings`

Runtime config for /ask, edited from /admin. Singleton, id = 1.

Rows: **1**

| column | type | null | default |
|---|---|---|---|
| `id` | integer | no | `1` |
| `enabled` | boolean | no | `true` |
| `daily_global_cap` | integer | no | `300` |
| `daily_ip_cap` | integer | no | `15` |
| `max_message_chars` | integer | no | `500` |
| `max_history_turns` | integer | no | `8` |
| `match_count` | integer | no | `8` |
| `full_text_weight` | double precision | no | `1` |
| `semantic_weight` | double precision | no | `1` |
| `tiers` | jsonb | no | `'[]'::jsonb` |
| `system_persona` | text | no | `''::text` |
| `refusal_note` | text | no | `''::text` |
| `disabled_note` | text | no | `''::text` |
| `quota_note` | text | no | `''::text` |
| `suggested_questions` | text[] | no | `'{}'::text[]` |
| `context_doc` | text | no | `''::text` |
| `context_doc_updated_at` | timestamp with time zone | yes | — |
| `turnstile_required` | boolean | no | `false` |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

Constraints:
- `CHECK ((id = 1))`
<!-- generated:data-model end -->
