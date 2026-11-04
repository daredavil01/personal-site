// The page films — seven of 30 seconds and four of 45: one row per film, read by the renderer
// (scripts/page-films/render.mjs), the player (src/components/common/PageFilm.js)
// and the guard test (src/components/common/pageFilms.test.js). Import-free.
//
// `key` is the film's name in scripts/page-films/film.html, `slug` its file
// name under public/video/page-films/, `poster` the second its poster frame
// is cut from, `title` and `story` the storyline shown beside the player and
// `alt` the player's accessible name, `seconds` its length (30 unless given).
// The storylines are in docs/page-films.md.

export const PAGE_FILM_DIR = "/video/page-films";

export const PAGE_FILMS = [
  {
    key: "about",
    label: "About",
    story: "A stopwatch asks how long you have. Ten seconds gets the one line; then the five people in one — engineer, runner, trekker, reader and writer, citizen — each with a live number, the six rules I work by, and a face at the end.",
    slug: "about",
    route: "/about",
    poster: 27.2,
    title: "How long do you have?",
    alt: "Thirty-second film of the About page: a stopwatch, the ten-second line, five chapters — engineer, runner, trekker, reader and writer, citizen — the six rules I work by, and a portrait",
  },
  {
    key: "resume",
    label: "Resume",
    story: "A blank A4 sheet types my name. The career draws itself as a timeline from college to now, the numbers count up, the strongest skills fill their dots, certificates stack newest first — and it all fits on one page.",
    slug: "resume",
    route: "/resume",
    poster: 15.6,
    title: "One page",
    alt: "Thirty-second film of the resume: the sheet types the name, the career draws itself as a timeline, the numbers count up, skills fill their dots, certificates stack newest first, and it prints on one page",
  },
  {
    key: "ledger",
    label: "Writing Ledger",
    story: "A pen draws the total. The years rise as ink, a quiet start and then the year it all poured out; every month becomes a blot as big as its words; then the week's rhythm, how long an essay runs, and the records.",
    slug: "writing-ledger",
    route: "/writing-ledger",
    poster: 2.8,
    title: "Every word, counted",
    alt: "Thirty-second film of the Writing Ledger: a pen writes the total word count, the years rise as ink bars, every month becomes an ink blot, the writing week and essay lengths, then the records",
  },
  {
    key: "microblog",
    label: "Micro-blog",
    story: "Every short post is a star. A 24-hour clock shows when they get written — late — then English and Marathi side by side, the years as a skyline, and the very first post, typed out again.",
    slug: "micro-blog",
    route: "/micro-blog",
    poster: 3.4,
    title: "After dark",
    alt: "Thirty-second film of the micro-blog: every short post a star, a 24-hour clock that peaks late at night, English and Marathi side by side, the years as a skyline, and the very first post",
  },
  {
    key: "presentations",
    label: "Presentations",
    story: "A projector clicks on and the decks fly past, newest first. Then every one of them on one wall, how many slides they hold between them, and how often a new one appears.",
    slug: "presentations",
    route: "/presentations",
    poster: 6.2,
    title: "The lights go down",
    alt: "Thirty-second film of the presentations: a projector clicks on, the decks fly past newest first, all of them tile into one wall, and a timeline of how often a new one appears",
  },
  {
    key: "sports",
    label: "Race log",
    story: "A countdown, then race day: photos with bib numbers and finishing times in the order they were run. The distance ladder from 10K to a 50K ultra, three stopwatches stopping on the personal bests, and the years.",
    slug: "sports",
    route: "/sports",
    poster: 21.6,
    title: "Every finish line",
    alt: "Thirty-second film of the race log: a countdown, race-day photos with bib numbers and finishing times, the distance ladder from 10K to a 50K ultra, three stopwatches stopping on the personal bests, and the years",
  },
  {
    key: "treks",
    label: "Treks",
    story: "A Sahyadri ridge draws itself. The forts arrive as postcards in the order they were climbed, the difficulty becomes three peaks, and the longest trek gets a clock of its own.",
    slug: "treks",
    route: "/treks",
    poster: 2.6,
    title: "Some take two hours",
    alt: "Thirty-second film of the treks: a Sahyadri ridge draws itself, the forts arrive as postcards in the order they were climbed, difficulty as three peaks, and a clock for the longest trek",
  },
  {
    key: "newsletter",
    label: "Newsletter",
    seconds: 45,
    story: "An envelope seals itself. A month of races, treks, books and posts flies in from the archive as paper slips, the letter gets written by hand, every issue goes past newest first, the page turns from classic to atlas, and you get to write back.",
    slug: "newsletter",
    route: "/newsletter",
    poster: 12.4,
    title: "A log is not a memory",
    alt: "Forty-five-second film of the newsletter: an envelope seals, a month of the archive drops into it, the letter is written, every issue goes past, the page in classic and atlas mode, and the ways to write back",
  },
  {
    key: "offload",
    label: "100 Days To Offload",
    seconds: 45,
    story: "Can I publish a hundred posts in a year? A ring of a hundred marks lights up, the trail draws itself with a waypoint for every post, the months rise, titles flash past, the topics and the pace, then the page in classic and atlas mode — and how many are left.",
    slug: "100-days-to-offload",
    route: "/100-days-to-offload",
    poster: 3.6,
    title: "One hundred posts, one year",
    alt: "Forty-five-second film of 100 Days To Offload: a ring of a hundred marks lights up, a trail with a waypoint per post, posts per month, titles, topics and pace, and the page in classic and atlas mode",
  },
  {
    key: "now",
    label: "Now",
    seconds: 45,
    story: "Last month tears off the calendar and the live light comes on. Why this page exists, the daily rituals, the month so far in numbers and in its own words, the page in classic and atlas mode, and what happens when the month ends: it becomes a letter.",
    slug: "now",
    route: "/now",
    poster: 4.2,
    title: "This month, so far",
    alt: "Forty-five-second film of the Now page: a calendar page tears off, a live light, the daily rituals, this month in numbers and items, the page in classic and atlas mode, and an envelope for next month",
  },
  {
    key: "ask",
    label: "Ask the archive",
    seconds: 45,
    story: "The whole site read into passages. What it has read, the questions you can ask in English or Marathi, then one real question asked live: sources first, then the answer streaming in. The ladder of models behind it, and the archive in classic and atlas mode.",
    slug: "ask",
    route: "/ask",
    poster: 19.5,
    title: "It shows its sources",
    alt: "Forty-five-second film of Ask the archive: the site read into passages, starter questions in English and Marathi, one real question answered with its sources, the model ladder, and the page in classic and atlas mode",
  },
];

export const pageFilm = (key) => PAGE_FILMS.find((f) => f.key === key) || null;
export const filmSeconds = (f) => f?.seconds || 30;
