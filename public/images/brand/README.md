# Brand assets for share-as-image cards

The "Share as image" feature (`src/components/share/`) overlays a **logo** at the
top of every exported card and a **signature** at the bottom. Drop the two files
here with these exact names:

| File | Used as | Recommended |
|---|---|---|
| `logo.png` | Card header logo | Transparent PNG, ~400–600px wide (landscape). Rendered ~80px tall. Choose artwork that reads on **both** light and dark backgrounds (e.g. a transparent or framed variant). |
| `signature.png` | Card footer signature | Transparent PNG of **dark ink** (black) on transparent, ~300–500px wide. Rendered ~64px tall. |

Notes:

- The card auto-**inverts the signature** on the Dark and Abstract backgrounds, so
  supply the signature as dark ink on transparent (not pre-whitened).
- Until these files are committed, the card hides the logo/signature gracefully
  (no broken images) — the export still works, just without the marks. You'll see
  a harmless `404` for these paths in the browser console in the meantime.
- Keep them compressed (see the image-compression guidance in `CLAUDE.md`).
