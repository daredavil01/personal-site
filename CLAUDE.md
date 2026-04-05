# CLAUDE.md — Personal Site

## Project Overview

React 18 single-page application (personal portfolio). Key stack:
- **React 18** with `react-router-dom` v6 for routing
- **react-helmet-async** for per-page `<head>` metadata
- **Tailwind CSS** for styling
- **Deployed on Cloudflare Pages** — build command is `npm run build` (`react-scripts build`). The `react-snap` pre-rendering step is only used for local/gh-pages deploy via `npm run predeploy`, not on Cloudflare.

## Key File Locations

| Purpose | Path |
|---|---|
| Changelog | `src/data/changelog.md` |
| Page layout + Helmet | `src/layouts/Main.js` |
| App routes | `src/App.js` |
| Data files | `src/data/` |
| Static HTML (OG tags, favicons) | `public/index.html` |
| Page components | `src/pages/` |
| Reusable components | `src/components/` |

## Changelog Rule

**Always update `src/data/changelog.md` when making any code change.**

- Add the entry to the **top** of the file, under a new version header if the current date differs from the latest entry, or append to the existing version block if the date matches.
- Choose the version bump:
  - **Patch** (e.g. `v5.1.0` → `v5.1.1`): bug fixes, copy/style tweaks, metadata changes
  - **Minor** (e.g. `v5.1.0` → `v5.2.0`): new features, new pages, new components
  - **Major** (e.g. `v5.1.0` → `v6.0.0`): full redesigns, breaking structural changes

### Changelog Format

Follow this exact format (taken from the existing entries):

```markdown
## [vX.Y.Z] — YYYY-MM-DD

### Added
- **Component or Feature Name** (`file/path.js`): What was added and why.

### Changed
- **Component Name** (`file/path.js`): What was changed and what it affects.

### Fixed
- **Component Name** (`file/path.js`): What was broken and how it was fixed.
```

- Only include sections (`### Added`, `### Changed`, `### Fixed`) that are relevant to the change.
- Use **bold** for the component/feature name, backtick path in parentheses, then a colon and description.
- Omit the path if the change spans multiple files or is conceptual.
