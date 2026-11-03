import React from "react";
import PropTypes from "prop-types";
import { POSES, POSE_NAMES } from "./poses";

// Pictogram figures for the day story: one person drawn as thick round
// strokes, feet at (0, 0), facing right, about 60 units tall. Each pose is a
// set of joints plus props (backpack, pole, campfire, flag, bike, barbell),
// so a new pose is a few coordinates, not a drawing. Purely decorative: the
// chart around it carries the words. The joint tables live in poses.js.

export { POSE_NAMES };

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
