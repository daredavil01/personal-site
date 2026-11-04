// Every feature film on the site, for the /films page: the eleven page
// films (seven of 30 seconds, four of 45; src/data/pageFilms.js) and the six longer films that came
// before them. Import-free apart from the page-film registry, which is
// import-free too.
//
// `base` is the path of the committed files without the extension (.mp4,
// .jpg, and .vtt / .json where `captions` / `chapters` say so). `seconds` is
// the video's real length — src/pages/films.test.js reads each MP4's header
// and fails if they disagree. `shape` is "vertical" (9:16) or "square".

// eslint-disable-next-line import/extensions -- Node (the OG card generator) imports this file too
import { PAGE_FILMS, PAGE_FILM_DIR, filmSeconds } from "./pageFilms.js";

const PAGE_FILM_MADE = "Remotion, rendered from the live tables; a synthesised score with a sound effect on every cue; captions burned in, word by word";

export const FEATURE_FILMS = [
  {
    key: "trailer",
    title: "The site in 90 seconds",
    route: "/",
    page: "Home",
    base: "/video/the-trailer",
    seconds: 90,
    shape: "vertical",
    captions: true,
    chapters: false,
    sound: "Music and on-screen titles",
    made: "A page that draws any moment of itself, seeked frame by frame in Chrome (scripts/trailer/); a 120 BPM score synthesised in code",
    story: "Kilometres run, forts climbed, books read and short posts, then the Wanderer's Atlas, life in numbers, the archive answering in English and Marathi, the Workshop, and the monthly letter.",
    alt: "The site in 90 seconds: a vertical trailer with music and on-screen titles",
  },
  {
    key: "blueprint",
    title: "The Blueprint",
    route: "/blueprint",
    page: "Blueprint",
    base: "/video/the-blueprint",
    seconds: 110.4,
    shape: "square",
    captions: true,
    chapters: true,
    sound: "Narrated audio description over the Workshop loop",
    made: "SVG frames rasterised by resvg in parallel workers (scripts/blueprint-film/), narrated with Piper",
    story: "The site's features drawn as architectural sheets and animated one by one: the floor plan, a section through the stack, the /ask circuit, the unfurl bench, the shell switch and the tag loom.",
    alt: "The Blueprint, the film, with audio description: all six sheets animated",
  },
  {
    key: "logbook",
    title: "The Logbook tour",
    route: "/logbook",
    page: "Logbook",
    base: "/video/the-logbook",
    seconds: 79.8,
    shape: "vertical",
    captions: true,
    chapters: true,
    sound: "Narrated over the page's own music",
    made: "A Playwright screencast of the page at phone size, narrated with Piper and cut with ffmpeg",
    story: "Every essay read as data and bound as a field journal: the cover, the prologue, then each chapter — Atlas, Sky, Fingerprint, Phrases, Letters and Found poems — opened on a phone.",
    alt: "A narrated tour of the Wanderer's Logbook, recorded on the page at phone size",
  },
  {
    key: "projects",
    title: "Curated works",
    route: "/projects",
    page: "Projects",
    base: "/video/the-projects-story",
    seconds: 60,
    shape: "vertical",
    captions: false,
    chapters: false,
    sound: "Music and sound effects, no speech",
    made: "Remotion (video/projects), with seven projects recorded on a phone",
    story: "Every project's cover popping onto the screen, the numbers, the toolkit, seven spotlights recorded on a phone, /ask answering about them, and an open door for collaborators.",
    alt: "Sixty-second film of the projects: the numbers, the tools, and seven projects shown on a phone",
  },
  {
    key: "training",
    title: "Ten set out",
    route: "/training",
    page: "Training",
    base: "/video/the-training-story",
    seconds: 60,
    shape: "vertical",
    captions: true,
    chapters: true,
    sound: "Narrated, with music that ducks under the voice",
    made: "Remotion, rendered from the Strava log (scripts/training-film/); narration by Aura 2 on Workers AI",
    story: "A watch, every activity piled up, a light painting of the routes, the streak, one day replayed, the numbers, and the two ways into the page.",
    alt: "This page in 60 seconds: a narrated film",
  },
  {
    key: "videos",
    title: "How this page came to be",
    route: "/videos",
    page: "Videos",
    base: "/video/the-videos-story",
    seconds: 90,
    shape: "vertical",
    captions: true,
    chapters: false,
    sound: "Narrated, with its own score",
    made: "A page rendered frame by frame (scripts/videos-film/): satellite tiles from orbit to Pune, the channel, the sync",
    story: "From orbit down to Pune, then the channel's videos and Shorts, the live /videos page at phone size, and how one press of Sync fills it.",
    alt: "How the videos page came to be: a 90-second narrated film",
  },
  ...PAGE_FILMS.map((f) => ({
    key: f.key,
    title: f.title,
    route: f.route,
    page: f.label,
    base: `${PAGE_FILM_DIR}/${f.slug}`,
    seconds: filmSeconds(f),
    shape: "vertical",
    captions: true,
    chapters: true,
    sound: "Synthesised score and sound effects",
    made: PAGE_FILM_MADE,
    story: f.story,
    alt: f.alt,
    series: "page",
  })),
];

export const filmLength = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
