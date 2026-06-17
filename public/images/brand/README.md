# Brand assets for share-as-image cards

The "Share as image" feature (`src/components/share/`) overlays a **logo** at the
top of every exported card and a **signature** at the bottom, picking the variant
that suits the chosen background theme:

| File | Used on | Notes |
|---|---|---|
| `logo.png` | **Light** background | Transparent logo. |
| `logo_circle.png` | **Dark** & **Abstract** backgrounds | Circle-badge logo that reads on dark. |
| `black_sign.png` | **Light** background | Dark-ink signature. |
| `white_sign.png` | **Dark** & **Abstract** backgrounds | White signature. |

Notes:

- Filenames are referenced from `ShareCard.js` (the `THEMES` map). To swap art,
  replace the file in place keeping the same name, or update that map.
- Any missing file is hidden gracefully (no broken image) — the export still
  works, just without that mark.
- These are rendered small (logo ~80px tall, signature ~64px tall). Keep them
  reasonably compressed so exports stay fast for the mobile-network audience.
