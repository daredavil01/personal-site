# Page films

Eleven vertical films, rendered with Remotion (1080×1920 masters, 720×1280 on
the page): seven of 30 seconds, for `/about`, `/resume`, `/writing-ledger`,
`/micro-blog`, `/presentations`, `/sports` and `/treks`, and four of 45 seconds,
for `/newsletter`, `/100-days-to-offload`, `/now` and `/ask`. Each 45-second
film has a **Classic and atlas** scene that shows its page in both shells. Each sits under its page's header in
`PageFilm` (`src/components/common/PageFilm.js`) with its storyline beside it.

Every film is listed with its details on **`/films`** (`src/pages/Films.js`),
beside the six longer films (the trailer, Blueprint, Logbook, Projects,
Training, Videos); the catalogue is `src/data/featureFilms.js`.

| Piece | Where |
|---|---|
| Registry (slug, poster second, title, storyline, alt text) | `src/data/pageFilms.js` |
| **The script**: scenes, lengths, slide-ins, captions, sound cues | `scripts/page-films/script.js` |
| The picture (Remotion composition + one component per scene type) | `scripts/page-films/remotion/` |
| What each film says, read from the live tables | `scripts/page-films/data.mjs` |
| Music and the synthesised sound effects | `scripts/page-films/score.mjs` |
| Render, mix, publish | `scripts/page-films/render.mjs` (`npm run page:films`) |
| Committed web copies | `public/video/page-films/<slug>.{mp4,jpg,vtt,json}` |
| Guards | `src/components/common/pageFilms.test.js`, `src/pages/films.test.js` |

```bash
npm run page:films                            # render all eleven masters → knowledge_base/page-films/ (~2 min each)
npm run page:films -- --only=sports,treks     # some of them (film key or slug)
npm run page:films -- --only=about --frame=5,12.5   # PNG stills, for review
npm run page:films -- --publish               # web copies into public/video/page-films/
npm run page:films -- --recapture             # re-shoot the deck and page screenshots
```

**The numbers are baked in.** Like the share cards and the other films, a film
says what the tables said when it rendered. Re-render and publish after content
moves — a new race, fort, deck, certificate, a ledger or micro-blog refresh.
No number is typed into a script: data.mjs reads the rows through the pages'
own modules (`raceLog`, `trekLog`, `resumeModel`, `aboutModel`), the site-wide
counts from `/api/stats`, and the Ledger / Micro-blog films from their
committed JSON. A beat whose number is missing is left out, never shown as 0.

## One script drives picture, captions and sound

`script.js` is plain JavaScript that both Remotion (webpack) and Node import.
`buildFilm(key, data)` returns the whole plan:

- **Scenes with variable lengths.** Each scene's seconds are a weight that
  grows with its content (five chapters at 2.3 s each, twelve decks at 0.85 s,
  eight races at 1 s); the film is scaled to exactly its length
  (`FILM_SECONDS` in `script.js`: 45 for the four newer films, else 30;
  `remotion/index.jsx` reads it through `calculateMetadata`).
- **Slide-ins, varied.** Every scene enters with one of `left`, `right`, `up`,
  `down`, `zoom`, `wipe`, `tilt`, `iris` (`enterStyle` in `remotion/kit.jsx`),
  sliding over the last by 12 frames; cards inside a scene rotate through
  directions, and list rows alternate sides.
- **Captions, burned in.** `say` is split into chunks of up to seven words,
  each word timed by its length; the composition draws the chunk in a pill with
  the current word lit in the film's accent, and `--publish` writes the same
  chunks to the `.vtt`.
- **Sound cues, from the same frames.** `sfxFor` turns each scene into cues: a
  whoosh panned the way the scene slides (a boom for zoom and iris), ticks that
  climb in pitch while a number counts, a key click per typed letter and a bell
  at the end of the line, a camera shutter per photo, a stamp on bib numbers and
  call-outs, pops for dots and tiles, drips for ink blots, a beep–beep–beep–gun
  countdown, a riser into the end card and a chime on it. `mixSfx` in
  `score.mjs` synthesises each one where it lands, over the film's own score.
- **Chapters**: each scene's name and start, written to `<slug>.json` for the
  players and `/films`.

## Craft, shared by all seven

- **30 seconds, a 4-second hook, an end card with the page's address.**
- **One look per page, taken from the page.** Paper and redline for About,
  navy and blue for the Resume sheet, ink on cream for the Ledger, the night
  palette (English indigo, Marathi saffron) for the Micro-blog, a dark
  auditorium for Presentations, black and race orange for Sports, monsoon
  green and ochre for Treks. Fonts are the site's own (Noto Serif, Inter, Plus
  Jakarta Sans, Noto Sans Devanagari) from `scripts/og-fonts/`.
- **Phone first:** headlines fitted to one line (`fit`), the picture in
  220–1500 px, captions in 1540–1720 px, the address at the bottom.
- **Grain** is a pre-made noise tile jumped every other frame; a full-frame SVG
  turbulence filter looked the same and cost several times the render.

## The storylines

### /about — "How long do you have?"

The page reads at four depths, so the film is a stopwatch.

| s | Beat |
|---|---|
| 0–4 | A stopwatch dial sweeps; "How long do you have?" — 10 seconds, 1 minute, 5 minutes, 10 minutes fade in at the corners. |
| 4–8 | **In 10 seconds:** the one line from `about.md` types itself with a red caret. |
| 8–20 | **Five chapters, five people in one**, 2.4 s each, sliding like turned pages: the engineer (projects shipped), the runner (races, km), the trekker (forts), the reader and writer (books, Marathi books, essays, short posts), the citizen. Each has a drawn glyph. |
| 20–26 | **How I work:** the six principles land one by one, numbered like a manifesto. |
| 26–30 | The portrait, ringed by the dial completing. "Read me in ten seconds — or ten minutes." |

### /resume — "One page"

| s | Beat |
|---|---|
| 0–4 | A blank A4 sheet drops in; the name types, then the current role; the body lines draw; the camera dives into the page. |
| 4–13 | **The career** as a timeline from the first campus role to now, one role per beat, coloured work / research / campus, the current role pulsing. |
| 13–18 | **In numbers:** years in industry, projects, certifications, degrees count up in tiles. |
| 18–22 | **Skills:** the strongest eight fill their five dots. |
| 22–26 | **Certified:** cards stack newest first. |
| 26–30 | The sheet shrinks to a printed page: "One page. Always current." |

### /writing-ledger — "Every word, counted"

| s | Beat |
|---|---|
| 0–4 | A pen stroke crosses the page; the total word count inks in, out of focus to sharp. |
| 4–10 | **The long arc:** a column per year; the peak year rises red and is named. |
| 10–16 | **Every month, a blot** as large as its words, filling the calendar in order; the busiest month called out. |
| 16–21 | **Rhythm:** the writing weekday, then the shelf of essay lengths. |
| 21–26 | **Records**, ruled like a ledger with a red margin: longest essay, busiest year, most-written topic, latest. |
| 26–30 | "Every word, counted." underlined by hand. |

### /micro-blog — "After dark"

| s | Beat |
|---|---|
| 0–5 | The night sky fills from the committed `sky` points — every post a star, Marathi ones saffron — while the post count rises. |
| 5–11 | **The clock:** a 24-hour radial chart grows; the hand sweeps to the peak hour; a moon rises; the count written after dark. |
| 11–16 | **Two languages:** English and मराठी counts with a split bar, then the archive's own recurring phrases drift up in both scripts. |
| 16–21 | **Year by year** as a skyline; the loudest year named. |
| 21–26 | **The first post**, typed out again under a large quotation mark. |
| 26–30 | "Written after dark. Read any time." over the dimmed sky, with the five tones of the Overview. |

### /presentations — "The lights go down"

| s | Beat |
|---|---|
| 0–4 | A projector flickers on; the newest deck lights the screen; the deck count. |
| 4–14 | **The carousel:** twelve decks fly across the screen newest first, each with its date and title and a running index. Real screenshots of each deck, captured by render.mjs. |
| 14–20 | **The wall:** every deck tiles into a grid that scrolls; the slides counted across the decks whose description gives a count. |
| 20–26 | **The pace:** every dated deck on a timeline, and the rate that works out to. |
| 26–30 | The newest deck again with a blinking LIVE badge: "Every deck runs live, right in the page." |

### /sports — "Every finish line"

| s | Beat |
|---|---|
| 0–3 | 3 · 2 · 1 · GO, a ring pulsing off each number, a flash on the gun. |
| 3–11 | **Race day:** full-bleed duotone photos in the order they were run, a bib card slapped on, the date, city, distance and finishing time whipping in. |
| 11–16 | **10K → 50K:** the distance ladder as running tracks, longest in orange. |
| 16–22 | **Personal bests:** three stopwatches run up to the 10K, half and marathon PBs; a SUB-2 stamp when the half is under two hours. |
| 22–26 | **Year by year:** races and kilometres per year. |
| 26–30 | The latest race photo, races and kilometres, and the finish tape breaking: "Every finish line." |

### /treks — "Some take two hours"

| s | Beat |
|---|---|
| 0–4 | Contour lines draw; three Sahyadri ridges rise in parallax; the fort count. |
| 4–15 | **Postcards** in the order they were climbed — ten across the years, each with its date, difficulty, index and year, pushed slowly like a Ken Burns. |
| 15–21 | **How hard?** Easy, medium and hard as three snow-capped peaks sized by count; how many have their story written up. |
| 21–26 | **The longest:** its photo, a 24-hour dial filling to its hours. |
| 26–30 | "Some take two hours. One took N." over the ridge, with the hours on the trail. |

## The 45-second films

Four films run 45 seconds: the extra fifteen pay for a **Classic and atlas**
scene (`shells`), where the page itself appears on two phones, classic and then
the atlas sliding in beside it, both scrolling while a switch flips between
them. The phones are real screenshots of the live site at 390 px wide
(`?view=classic` and `?view=atlas`), taken once by `render.mjs` into
`knowledge_base/page-films/cache/pages/` — the atlas's first-visit passport
toasts are removed before the shot. `FILM_SITE` points it at another origin
(a Pages preview); `--recapture` re-shoots them after the page changes.

The score keeps its arc but measures it from the ends of the film, and a
45-second one drops its drums for one bar in the middle, so the second half
comes back in rather than running on.

### /newsletter — "A log is not a memory"

| s | Beat |
|---|---|
| 0–4.5 | An envelope drops in, its flap closes and a red wax seal stamps it; the letter count, "one a month", and the first month. |
| 4.5–12.5 | **The month, gathered:** the latest issue's races, treks, books and posts fly in from either side as paper slips, drop into the envelope, it seals, and the issue's three numbers (`issueStats`) pop up. |
| 12.5–19 | **Written by hand:** the issue's headline, then the letter's opening sentences typed out. |
| 19–28 | **Every issue**, newest first: each share card with its headline, numbers and index. |
| 28–35.5 | **Classic and atlas.** |
| 35.5–40.5 | **Write back:** react, vote, rate, ask. |
| 40.5–45 | The sealed envelope: "A log is not a memory. A letter is." |

### /100-days-to-offload — "One hundred posts, one year"

| s | Beat |
|---|---|
| 0–5 | "Can I publish 100 posts in a year?" typed; a ring of a hundred marks lights one per post. |
| 5–12 | **The trail** draws itself down the year, a red waypoint for every post, a flag at the tip. |
| 12–17 | **Month by month**, the busiest named. |
| 17–24 | **The posts:** eight titles across the year as big type, with their number, date and platform. |
| 24–28.5 | **What it is about:** the top tags. |
| 28.5–33.5 | **The pace:** every post on the year's line, and how far ahead of or behind an even pace it is (the page's own sum: day of year / 365 × 100). |
| 33.5–40.5 | **Classic and atlas.** |
| 40.5–45 | "N down. M to go." |

### /now — "This month, so far"

| s | Beat |
|---|---|
| 0–5.5 | Last month's page tears off a calendar to show this one; "Now." and a pulsing live light. |
| 5.5–12 | **Why a now page:** the first sentence of the page's own story, credited to who inspired it. |
| 12–17.5 | **Daily rituals** as cards. |
| 17.5–23 | **The month so far** in tiles, one per section. |
| 23–32 | **This month:** each section with its first items. |
| 32–39.5 | **Classic and atlas.** |
| 39.5–45 | An envelope: "This month, so far. Next month, a letter." |

### /ask — "It shows its sources"

| s | Beat |
|---|---|
| 0–4.5 | A grid fills: the site read into passages (`content_chunks`), from N things (`site_facts().counts`). |
| 4.5–9 | **What it has read:** books, essays, races, short posts. |
| 9–14.5 | **Ask anything:** starter questions from `ask_settings.question_pool`, English and Marathi, float in; one is picked. |
| 14.5–27.5 | **An answer:** that question typed and sent, the sources arrive first, then the answer streams in, with the rung that answered. It is a **real exchange**: `data.mjs` asks `/api/ask` once (`FILM_ASK` picks the question, default "What has running taught him?") and caches the reply, so a re-render does not spend another answer. |
| 27.5–33.5 | **If one model is busy:** the ladder from `ask_settings.tiers`, down to search only. |
| 33.5–40.5 | **Classic and atlas.** |
| 40.5–45 | "Ask it anything. It shows its sources." |
