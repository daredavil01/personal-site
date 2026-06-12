# Customization Guide

This guide explains how to update content and customize the look of the website.

## Updating Content

**Content lives as markdown in `src/cms-content/` — the JS files in `src/data/` are
generated and must not be edited by hand.** There are two ways to edit:

1. **Decap CMS** — open `/cms/`, log in with GitHub, and use the form editors.
   Edits are committed straight to the repository.
2. **Direct markdown edits** — add or edit a file under the matching collection
   folder (`src/cms-content/books/`, `sports/`, `treks/`, `projects/`,
   `instagram/`, `100days/`, `resume/`, `now/`), then run:

   ```bash
   npm run cms:sync   # regenerates src/data/*.js
   ```

   and commit both the markdown and the regenerated JS. CI rejects commits where
   the two are out of sync.

Field shapes for each collection are defined in `public/cms/config.yml`, with
step-by-step recipes (including image conventions) in [CLAUDE.md](../CLAUDE.md)
and the full pipeline described in [cms-data-flow.md](cms-data-flow.md).

## Adding Images

Place new images in the `public/images/` directory. Organize them into subfolders (e.g., `sports`, `projects`) to keep things tidy.

## Styling Customization

### Changing Colors
Global design tokens and brand colors are defined using Tailwind CSS and SCSS variables in `src/static/css/base/_variables.scss`. The project uses a sophisticated **Stone & Slate** palette for a premium editorial feel.

### Typography
The project uses **Inter** (Body) and **Headline** fonts. You can update the typography settings in the SCSS base files.
