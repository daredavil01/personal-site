import React from "react";
import PropTypes from "prop-types";

// Pictogram figures for the day story: one person drawn as thick round
// strokes, feet at (0, 0), facing right, about 60 units tall. Each pose is a
// set of joints plus props (backpack, pole, campfire, flag, bike, barbell),
// so a new pose is a few coordinates, not a drawing. Purely decorative: the
// chart around it carries the words.

const P = (x, y) => [x, y];

// head, neck, hip, knee L/R, foot L/R, elbow L/R, hand L/R — one pose per
// line so the joints read as a table.
/* eslint-disable object-property-newline */
const POSES = {
  stand: {
    head: P(0, -52), neck: P(0, -44), hip: P(0, -25), kL: P(-2, -12), fL: P(-4, 0), kR: P(2, -12), fR: P(4, 0), eL: P(-4, -34), hL: P(-5, -24), eR: P(4, -34), hR: P(5, -24),
  },
  walk: {
    head: P(2, -52), neck: P(1, -44), hip: P(0, -25), kL: P(-4, -12), fL: P(-9, 0), kR: P(4, -13), fR: P(7, 0), eL: P(-5, -35), hL: P(-8, -27), eR: P(6, -35), hR: P(9, -28),
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

const line = (a, b, w = 5) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={w} />;

const StickFigure = ({
  pose, x, y, scale, color, flicker,
}) => {
  const j = POSES[pose] || POSES.stand;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} aria-hidden="true">
      {j.water && (
        <path d="M-30 -2 q5 -4 10 0 t10 0 t10 0 t10 0 t10 0 t10 0" fill="none" stroke="#3987e5" strokeWidth="2.5" strokeLinecap="round" />
      )}
      {j.bike && (
        <g fill="none" stroke={color} strokeWidth="2.5">
          <circle cx="-12" cy="-9" r="9" />
          <circle cx="16" cy="-9" r="9" />
          <path d="M-12 -9 L-2 -9 L-6 -24 M-2 -9 L10 -24 L-6 -24 M10 -24 L16 -9 M10 -24 L11 -30" strokeLinejoin="round" />
        </g>
      )}
      {j.rock && <ellipse cx="-2" cy="-5" rx="10" ry="6" fill={color} opacity="0.85" />}
      {j.fire && (
        <g transform="translate(24 0)">
          <path d="M-8 0 L8 -3 M-8 -3 L8 0" stroke="#5b3a29" strokeWidth="3" strokeLinecap="round" />
          <path className={flicker ? "tr-flame" : ""} d="M0 -3 C-7 -9 -2 -14 0 -21 C2 -15 8 -11 0 -3 Z" fill="#f97316" />
          <path className={flicker ? "tr-flame" : ""} d="M0 -4 C-3 -8 -1 -10 0 -14 C1 -10 3 -8 0 -4 Z" fill="#fcd34d" />
        </g>
      )}
      {j.flag && (
        <g>
          <line x1="16" y1="2" x2="16" y2="-64" stroke={color} strokeWidth="2.5" />
          <path d="M16 -64 L32 -58 L16 -52 Z" fill="#b22200" />
        </g>
      )}
      {j.pack && <rect x={j.neck[0] - 10} y={j.neck[1] + 2} width="8" height="14" rx="3" fill={color} transform={`rotate(${(j.neck[0] - j.hip[0]) * 2} ${j.neck[0] - 6} ${j.neck[1] + 9})`} />}
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {line(j.neck, j.hip, 6)}
        {line(j.hip, j.kL)}
        {line(j.kL, j.fL)}
        {line(j.hip, j.kR)}
        {line(j.kR, j.fR)}
        {line(j.neck, j.eL, 4)}
        {line(j.eL, j.hL, 4)}
        {line(j.neck, j.eR, 4)}
        {line(j.eR, j.hR, 4)}
        {j.pole && line(j.pole[0], j.pole[1], 2)}
      </g>
      {j.barbell && (
        <g stroke={color} strokeLinecap="round">
          <line x1="-20" y1="-57" x2="20" y2="-57" strokeWidth="2.5" />
          <line x1="-17" y1="-63" x2="-17" y2="-51" strokeWidth="5" />
          <line x1="17" y1="-63" x2="17" y2="-51" strokeWidth="5" />
        </g>
      )}
      <circle cx={j.head[0]} cy={j.head[1]} r="5.5" fill={color} />
    </g>
  );
};

StickFigure.propTypes = {
  pose: PropTypes.oneOf(POSE_NAMES),
  x: PropTypes.number,
  y: PropTypes.number,
  scale: PropTypes.number,
  color: PropTypes.string,
  flicker: PropTypes.bool,
};

StickFigure.defaultProps = {
  pose: "stand",
  x: 0,
  y: 0,
  scale: 1,
  color: "currentColor",
  flicker: true,
};

export default StickFigure;
