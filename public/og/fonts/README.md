# OG card fonts

The faces `src/lib/og/fonts.js` loads when rendering a share card. They are
**only** used by `functions/api/og/[[path]].js`; nothing in `index.html`
references them, so page weight is unchanged.

Satori accepts **TTF, OTF and WOFF — not WOFF2**, which is why these are `.woff`.
They are Fontsource's per-unicode-subset builds, so no subsetting step is needed.

**Do not narrow these subsets further.** Card text is arbitrary content — any
book title, any tag a reader coins. A subset built from today's rows renders
tofu the first time a title uses a character that was dropped, and you find out
when someone shares the link.

Vendored from (all OFL-1.1, licence text alongside):

| package | version | files |
|---|---|---|
| `@fontsource/noto-serif` | 5.3.0 | `noto-serif-latin-{400,700}-normal.woff` |
| `@fontsource/inter` | 5.3.0 | `inter-latin-{400,700}-normal.woff` |
| `@fontsource/plus-jakarta-sans` | 5.3.0 | `plus-jakarta-sans-latin-700-normal.woff` |
| `@fontsource/noto-sans-devanagari` | 5.3.0 | `noto-sans-devanagari-devanagari-{400,700}-normal.woff` |

To refresh one, take `files/<name>.woff` from that package's npm tarball.
