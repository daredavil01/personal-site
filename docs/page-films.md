# Page films

Seven 30-second vertical films (1080×1920 masters, 720×1280 on the page), one
for each of `/about`, `/resume`, `/writing-ledger`, `/micro-blog`,
`/presentations`, `/sports` and `/treks`. Each sits under its page's header in
`PageFilm` (`src/components/common/PageFilm.js`) with its storyline beside it.

| Piece | Where |
|---|---|
| Registry (slug, poster second, title, storyline, alt text) | `src/data/pageFilms.js` |
| The picture: one page that draws any moment of any film | `scripts/page-films/film.html` |
| What each film says, read from the live tables | `scripts/page-films/data.mjs` |
| The music, synthesised per film | `scripts/page-films/score.mjs` |
| Render, mix, publish | `scripts/page-films/render.mjs` (`npm run page:films`) |
| Committed web copies | `public/video/page-films/<slug>.{mp4,jpg,vtt}` |
| Guard (files present, under 4 MB, poster under 300 KB) | `src/components/common/pageFilms.test.js` |

```bash
npm run page:films                            # render all seven masters → knowledge_base/page-films/
npm run page:films -- --only=sports,treks     # some of them (film key or slug)
npm run page:films -- --only=about --frame=5,12.5   # PNG stills, for review
npm run page:films -- --publish               # web copies into public/video/page-films/
npm run page:films -- --recapture             # re-shoot the deck screenshots
```

**The numbers are baked in.** Like the share cards and the other films, a film
says what the tables said when it rendered. Re-render and publish after content
moves — a new race, fort, deck, certificate, a ledger or micro-blog refresh.
No number is typed into a script: data.mjs reads the rows through the pages'
own modules (`raceLog`, `trekLog`, `resumeModel`, `aboutModel`), the site-wide
counts from `/api/stats`, and the Ledger / Micro-blog films from their
committed JSON. A beat whose number is missing is left out, never shown as 0.

## Craft, shared by all seven

- **30 seconds, 120 BPM, cut on the bar.** A bar is 2 s, so every scene starts
  on one. The arc is the same for all: a 4-second hook, three or four beats of
  evidence, a 4-second end card with the page's address.
- **One look per page, taken from the page.** Paper and redline for About,
  navy and blue for the Resume sheet, ink on cream for the Ledger, the night
  palette (English indigo, Marathi saffron) for the Micro-blog, a dark
  auditorium for Presentations, black and race orange for Sports, monsoon
  green and ochre for Treks.
- **Sound:** a score synthesised per film (`MOODS` in `score.mjs`: key,
  progression, drum weight), the site's own SFX sprite on the cuts. Mixed to
  −14 LUFS.
- **Captions** are the words each scene puts on screen (`say` in film.html),
  written to the `.vtt` — the films have no narration, so the track is the
  storyline itself and doubles as the audio description.
- **Phone first:** headline type at 90 px and up on a 1080-wide frame, nothing
  essential in the top 200 px (the progress rail) or the bottom 160 px (the
  address).

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
