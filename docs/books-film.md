# The Reading Room film

A 60-second vertical launch film for the redesigned `/books`, shown after the
page's shelf (`src/components/Books/BooksFilm.js`) and listed on `/films`.
Rendered with Remotion at 1080×1920, published as a 720×1280 web encode of
about 3 MB.

```bash
pip install edge-tts                             # the narrator (once)
npm run books:film                               # footage → data → voice → score → render
npm run books:film -- --publish                  # …and the web copy in public/video/
npm run books:film -- --capture                  # re-record every view of the page first
npm run books:film -- --capture=pull,lenses      # re-record some clips
npm run books:film -- --stills                   # one PNG per scene, for review
npm run books:film -- --frame=12.5               # one PNG at 12.5 s
npm run books:film -- --voice=en-IN-PrabhatNeural   # another narrator
```

Playwright comes from the global install (`NODE_PATH=$(npm root -g)` if
Node cannot find it). Working files live in gitignored
`knowledge_base/books-film/`.

| Piece | Where |
|---|---|
| Screen recordings + stills of the live page (Vite + Playwright, 414×896) | `scripts/books-film/capture.mjs` |
| The numbers and the spines, through `src/lib/bookShelf.js` | `scripts/books-film/data.mjs` |
| The narrator, with each word's time | `scripts/books-film/voice.py` |
| The script, timeline, captions, publish | `scripts/books-film/render.mjs` |
| The beat | `scripts/books-film/score.mjs` |
| The picture | `scripts/books-film/remotion/` (`kit.jsx` parts, `scenes.jsx` the eleven scenes) |
| Fonts (Fraunces, Tiro Devanagari Marathi; OFL) | `scripts/books-film/fonts/` |
| Committed web copy | `public/video/the-books-story.{mp4,jpg,vtt,json}` |
| Guards | `src/components/Books/film.test.js`, `src/pages/films.test.js` |

## The story: a modern, digital bookshelf

| Scene | What happens | What is said |
|---|---|---|
| The shelf | A lamp comes on; boards slide in; every book drops onto the shelf in reading order, each spine with its real width, height and cloth; a wave runs along the spines. "The Reading Room." | Every reader keeps a shelf. Meet the modern, digital one. |
| The library | The books pile up flat, oldest at the bottom, slab thickness from the page count, beside a ruler; books, the English/Marathi split, pages and centimetres count up. | N books, two languages, N pages. |
| A spine is data | One spine held up to the lamp; width, cloth, ribbon, tab and foot mark are named the moment the voice says them. | Every book is a spine. Width is pages, colour is subject, and a ribbon means a review. |
| Take one down | The page on a phone: a hand runs along the shelf and each spine tips out. | Run a finger along the shelf… |
| Six ways | The shelf re-arranges by subject, language, decade written, thickness, A–Z and back to year read; a chip lights at each tap. | Six ways to shelve it… |
| Filters dim | Marathi, then History: the rest dim, nothing leaves. | Filter, and nothing vanishes. |
| Face out | The wall of covers. | Or turn the shelf face out. |
| Pull one | "Pull one for me", the book opens, → walks on. | Can't choose? Pull one for me. |
| Five lenses | Borrower's slip, Numbers, Marginalia, Catalogue. | Four more lenses… |
| Day and night | The atlas shell by day beside the classic shell in the dark theme. | By day, or after dark. Classic, or atlas. |
| Come in | The whole shelf behind a library card, stamped with the address. | The Reading Room. Come, take one down… |

## How it is made

- **Every view is real.** `capture.mjs` drives the live page (a local Vite
  server reading the live table) and records each clip as a Playwright
  screencast; it notes when each tap happens, so the film's chips light on the
  same frame the page changes. Clips are sped up to fit their scene (≤ 2.8×).
- **The voice sets the clock.** Each line is spoken first; edge-tts returns
  every word's start and length, the scenes are sized around the lines to fill
  exactly 60 s (the voice is asked to speak up to 20 % quicker if it must),
  and the captions and the anatomy callouts key off those word times.
- **The narrator** is Microsoft's `en-IN-NeerjaExpressiveNeural` through
  edge-tts — an Indian English voice. Behind a TLS-intercepting proxy, set
  `EDGE_TTS_CA` to the CA bundle (render.mjs uses `/root/.ccr/ca-bundle.crt`
  when it exists).
- **The beat** is synthesised in code, nothing to license: 90 BPM in D Kafi,
  a tanpura drone, a Karplus–Strong string with a little meend, a soft
  electric piano, a swung kit with a bayan bending on the one, vinyl crackle;
  a breakdown under the day-and-night scene and a bell on the end card. It
  ducks under every spoken line, and the lamp in the picture pulses with it.
- **Small on purpose:** CRF 30 at 720×1280, AAC 80 kb/s, loudness normalised
  to −16 LUFS. `film.test.js` fails the build past 4 MB.
- **The numbers are baked in**, as with the share cards: re-render and publish
  after books are added or the page changes visibly.
