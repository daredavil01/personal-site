// The seven 30-second page films: one row per film, read by the renderer
// (scripts/page-films/render.mjs), the player (src/components/common/PageFilm.js)
// and the guard test (src/components/common/pageFilms.test.js). Import-free.
//
// `key` is the film's name in scripts/page-films/film.html, `slug` its file
// name under public/video/page-films/, `poster` the second its poster frame
// is cut from, `title` and `story` the storyline shown beside the player and
// `alt` the player's accessible name. The storylines are in docs/page-films.md.

export const PAGE_FILM_DIR = "/video/page-films";

export const PAGE_FILMS = [
  {
    key: "about",
    story: "A stopwatch asks how long you have. Ten seconds gets the one line; then the five people in one — engineer, runner, trekker, reader and writer, citizen — each with a live number, the six rules I work by, and a face at the end.",
    slug: "about",
    route: "/about",
    poster: 27.2,
    title: "How long do you have?",
    alt: "Thirty-second film of the About page: a stopwatch, the ten-second line, five chapters — engineer, runner, trekker, reader and writer, citizen — the six rules I work by, and a portrait",
  },
  {
    key: "resume",
    story: "A blank A4 sheet types my name. The career draws itself as a timeline from college to now, the numbers count up, the strongest skills fill their dots, certificates stack newest first — and it all fits on one page.",
    slug: "resume",
    route: "/resume",
    poster: 15.6,
    title: "One page",
    alt: "Thirty-second film of the resume: the sheet types the name, the career draws itself as a timeline, the numbers count up, skills fill their dots, certificates stack newest first, and it prints on one page",
  },
  {
    key: "ledger",
    story: "A pen draws the total. The years rise as ink, a quiet start and then the year it all poured out; every month becomes a blot as big as its words; then the week's rhythm, how long an essay runs, and the records.",
    slug: "writing-ledger",
    route: "/writing-ledger",
    poster: 2.8,
    title: "Every word, counted",
    alt: "Thirty-second film of the Writing Ledger: a pen writes the total word count, the years rise as ink bars, every month becomes an ink blot, the writing week and essay lengths, then the records",
  },
  {
    key: "microblog",
    story: "Every short post is a star. A 24-hour clock shows when they get written — late — then English and Marathi side by side, the years as a skyline, and the very first post, typed out again.",
    slug: "micro-blog",
    route: "/micro-blog",
    poster: 3.4,
    title: "After dark",
    alt: "Thirty-second film of the micro-blog: every short post a star, a 24-hour clock that peaks late at night, English and Marathi side by side, the years as a skyline, and the very first post",
  },
  {
    key: "presentations",
    story: "A projector clicks on and the decks fly past, newest first. Then every one of them on one wall, how many slides they hold between them, and how often a new one appears.",
    slug: "presentations",
    route: "/presentations",
    poster: 6.2,
    title: "The lights go down",
    alt: "Thirty-second film of the presentations: a projector clicks on, the decks fly past newest first, all of them tile into one wall, and a timeline of how often a new one appears",
  },
  {
    key: "sports",
    story: "A countdown, then race day: photos with bib numbers and finishing times in the order they were run. The distance ladder from 10K to a 50K ultra, three stopwatches stopping on the personal bests, and the years.",
    slug: "sports",
    route: "/sports",
    poster: 17.6,
    title: "Every finish line",
    alt: "Thirty-second film of the race log: a countdown, race-day photos with bib numbers and finishing times, the distance ladder from 10K to a 50K ultra, three stopwatches stopping on the personal bests, and the years",
  },
  {
    key: "treks",
    story: "A Sahyadri ridge draws itself. The forts arrive as postcards in the order they were climbed, the difficulty becomes three peaks, and the longest trek gets a clock of its own.",
    slug: "treks",
    route: "/treks",
    poster: 2.6,
    title: "Some take two hours",
    alt: "Thirty-second film of the treks: a Sahyadri ridge draws itself, the forts arrive as postcards in the order they were climbed, difficulty as three peaks, and a clock for the longest trek",
  },
];

export const pageFilm = (key) => PAGE_FILMS.find((f) => f.key === key) || null;
