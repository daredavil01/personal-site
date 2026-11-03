// The day story's figure poses as joint tables: feet at (0, 0), facing right,
// about 60 units tall. Plain data, so the page's StickFigure and the Remotion
// film (scripts/training-film/) draw the same people.

const P = (x, y) => [x, y];

// head, neck, hip, knee L/R, foot L/R, elbow L/R, hand L/R — one pose per
// line so the joints read as a table.
/* eslint-disable object-property-newline */
export const POSES = {
  stand: {
    head: P(0, -52), neck: P(0, -44), hip: P(0, -25), kL: P(-2, -12), fL: P(-4, 0), kR: P(2, -12), fR: P(4, 0), eL: P(-4, -34), hL: P(-5, -24), eR: P(4, -34), hR: P(5, -24),
  },
  walk: {
    head: P(2, -52), neck: P(1, -44), hip: P(0, -25), kL: P(-4, -12), fL: P(-9, 0), kR: P(4, -13), fR: P(7, 0), eL: P(-5, -35), hL: P(-8, -27), eR: P(6, -35), hR: P(9, -28),
  },
  walkB: {
    head: P(2, -52), neck: P(1, -44), hip: P(0, -25), kL: P(3, -13), fL: P(6, 0), kR: P(-3, -12), fR: P(-8, 0), eL: P(5, -35), hL: P(8, -28), eR: P(-4, -35), hR: P(-7, -27),
  },
  run: {
    head: P(6, -50), neck: P(4, -43), hip: P(0, -26), kL: P(-5, -15), fL: P(-13, -9), kR: P(8, -15), fR: P(6, 0), eL: P(-3, -36), hL: P(-8, -31), eR: P(9, -35), hR: P(13, -40),
  },
  runB: {
    head: P(6, -50), neck: P(4, -43), hip: P(0, -26), kL: P(6, -14), fL: P(3, 0), kR: P(-3, -15), fR: P(-11, -11), eL: P(9, -35), hL: P(13, -40), eR: P(-3, -36), hR: P(-8, -31),
  },
  fast: {
    head: P(10, -48), neck: P(7, -41), hip: P(0, -26), kL: P(-7, -17), fL: P(-17, -12), kR: P(11, -17), fR: P(10, 0), eL: P(-2, -35), hL: P(-9, -29), eR: P(12, -33), hR: P(18, -39),
  },
  hike: {
    head: P(4, -51), neck: P(3, -43), hip: P(0, -25), kL: P(-4, -12), fL: P(-8, 0), kR: P(5, -14), fR: P(8, 0), eL: P(-3, -34), hL: P(-6, -26), eR: P(8, -35), hR: P(12, -30),
    pack: true, pole: [P(12, -30), P(16, 0)],
  },
  climb: {
    head: P(7, -49), neck: P(5, -41), hip: P(0, -24), kL: P(-3, -11), fL: P(-7, 0), kR: P(9, -18), fR: P(12, -8), eL: P(-2, -32), hL: P(-5, -24), eR: P(11, -35), hR: P(15, -30),
    pack: true, pole: [P(15, -30), P(19, -8)],
  },
  rest: {
    head: P(3, -37), neck: P(2, -30), hip: P(-1, -13), kL: P(9, -15), fL: P(10, 0), kR: P(8, -14), fR: P(12, 0), eL: P(6, -22), hL: P(10, -17), eR: P(6, -21), hR: P(11, -16),
    rock: true, fire: true,
  },
  summit: {
    head: P(0, -52), neck: P(0, -44), hip: P(0, -25), kL: P(-3, -12), fL: P(-6, 0), kR: P(3, -12), fR: P(6, 0), eL: P(-7, -50), hL: P(-9, -59), eR: P(7, -50), hR: P(9, -59),
    flag: true,
  },
  ride: {
    head: P(9, -50), neck: P(5, -43), hip: P(-4, -32), kL: P(3, -24), fL: P(1, -12), kR: P(4, -26), fR: P(6, -14), eL: P(9, -36), hL: P(13, -33), eR: P(9, -36), hR: P(13, -33),
    bike: true,
  },
  swim: {
    head: P(16, -10), neck: P(10, -10), hip: P(-6, -8), kL: P(-13, -9), fL: P(-21, -6), kR: P(-13, -6), fR: P(-21, -10), eL: P(16, -18), hL: P(23, -14), eR: P(4, -4), hR: P(-2, -3),
    water: true,
  },
  lift: {
    head: P(0, -52), neck: P(0, -44), hip: P(0, -25), kL: P(-5, -13), fL: P(-6, 0), kR: P(5, -13), fR: P(6, 0), eL: P(-9, -46), hL: P(-10, -57), eR: P(9, -46), hR: P(10, -57),
    barbell: true,
  },
  yoga: {
    head: P(0, -53), neck: P(0, -45), hip: P(0, -26), kL: P(-1, -13), fL: P(0, 0), kR: P(10, -20), fR: P(1, -16), eL: P(-4, -55), hL: P(0, -63), eR: P(4, -55), hR: P(0, -63),
  },
};
/* eslint-enable object-property-newline */

export const POSE_NAMES = Object.keys(POSES);
