// One clock for picture and music, in seconds. 120 BPM: a beat is 0.5 s and
// every cut below lands on one. scripts/score.mjs reads this file too.

export const FPS = 30;

export const T = {
  boot: 0, // terminal line on the dark grid
  collage: 1.5, // every project's cover pops onto the screen
  caption: 5, // "Here's what Sanket has built so far."
  stats: 8, // the numbers
  variety: 13, // tech stack and tags
  vtbm: 17, // spotlight 1: for a hill
  ngo: 22, // spotlight 2: for NGOs (three sites)
  dividend: 28, // spotlight 3: for a question
  feed: 32.5, // spotlight 4: After the Feed + 45 Days
  escape: 37.5, // spotlight 5: a game about attention
  runfolio: 42, // spotlight 6: for runners
  site: 46.5, // spotlight 7: this site
  ask: 51, // /ask answers about the projects
  outro: 55.5, // open to collaboration
  end: 60,
};

// The covers pop on sixteenths from T.collage (the score plucks each one).
export const POP_STEP = 0.125;

export const f = (s) => Math.round(s * FPS);
