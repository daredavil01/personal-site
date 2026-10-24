// One clock for picture and music, in seconds. 120 BPM: a bar is 2 s, so
// every section starts on a downbeat. scripts/score.mjs reads this file too.

export const FPS = 30;

export const T = {
  tagline: 0, // globe in space, the line
  india: 5, // zoom to India, pins, strings
  question: 11, // "What connects these cities?"
  drop: 14, // photo wall
  paper: 20, // sketch runner on paper
  page: 24, // the page slides in, URL
  stats: 26, // statistics view
  interactive: 34, // interactive view
  modal: 38, // a race opened, slider
  default: 44, // default view and filters
  outro: 56, // finish line
  end: 60,
};

export const CITY_BEATS = [6.5, 7, 7.5, 8, 8.5];
export const PHOTO_BEATS = Array.from({ length: 24 }, (_, i) => 14.25 + i * 0.125);

// Cursor clicks (the score ticks on each).
export const CLICKS = {
  card: 38.6,
  next1: 40.6,
  next2: 42.4,
  distance: 45.0,
  distancePick: 46.0,
  city: 47.4,
  cityPick: 48.4,
  year: 49.8,
  yearPick: 50.8,
  clear: 52.6,
  distance2: 53.3,
  distance2Pick: 54.1,
};

export const f = (s) => Math.round(s * FPS);
