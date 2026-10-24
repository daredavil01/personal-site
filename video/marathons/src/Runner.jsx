// A pencil-sketched runner. The pose is a run cycle driven by time; the
// "boil" (a displacement filter whose seed changes every few frames) makes the
// lines shimmer like hand-drawn animation.
import React from "react";

const rad = (d) => (d * Math.PI) / 180;
// Angles from straight down, positive = forward (+x).
const limb = ([x, y], len, deg) => [x + len * Math.sin(rad(deg)), y + len * Math.cos(rad(deg))];

/** Joint positions for cycle phase p (radians), hip at origin. */
export function pose(p) {
  const leg = (q) => {
    const thigh = 40 * Math.sin(q) + 5;
    // Knee folds most while the leg swings through, straightens on the push.
    const knee = 18 + 85 * Math.max(0, Math.sin(q + 1.2)) ** 1.5;
    return { thigh, shin: thigh - knee };
  };
  const bob = -8 * Math.abs(Math.cos(p));
  const hip = [0, bob];
  const lean = 14;
  const neck = [hip[0] + 98 * Math.sin(rad(lean)), hip[1] - 98 * Math.cos(rad(lean))];
  const head = [neck[0] + 22, neck[1] - 30];
  const legs = [p, p + Math.PI].map((q) => {
    const { thigh, shin } = leg(q);
    const knee = limb(hip, 72, thigh);
    const ankle = limb(knee, 72, shin);
    const toe = limb(ankle, 24, shin + 95);
    return [hip, knee, ankle, toe];
  });
  const arms = [p + Math.PI, p].map((q) => {
    const upper = 42 * Math.sin(q) + 4;
    const elbow = limb(neck, 56, upper);
    const hand = limb(elbow, 50, upper + 95 + 15 * Math.sin(q));
    return [neck, elbow, hand];
  });
  return { hip, neck, head, legs, arms };
}

const line = (pts) => pts.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" ");

const Figure = ({ p, ink, w, opacity = 1 }) => {
  const { hip, neck, head, legs, arms } = pose(p);
  // Far limbs lighter, so the figure reads in depth.
  return (
    <g opacity={opacity} fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
      <path d={line(legs[1])} strokeWidth={w * 0.9} opacity={0.45} />
      <path d={line(arms[1])} strokeWidth={w * 0.8} opacity={0.45} />
      <path d={line([hip, neck])} strokeWidth={w * 1.6} />
      <path d={line(legs[0])} strokeWidth={w} />
      <path d={line(arms[0])} strokeWidth={w * 0.9} />
      <circle cx={head[0]} cy={head[1]} r={22} strokeWidth={w * 0.8} />
      {/* cap brim and a bib on the torso */}
      <path d={`M${head[0] - 18} ${head[1] - 10} Q${head[0]} ${head[1] - 30} ${head[0] + 30} ${head[1] - 12}`} strokeWidth={w * 0.6} />
      <rect x={(hip[0] + neck[0]) / 2 - 2} y={(hip[1] + neck[1]) / 2 - 14} width={26} height={22} strokeWidth={w * 0.35}
        transform={`rotate(14 ${(hip[0] + neck[0]) / 2} ${(hip[1] + neck[1]) / 2})`} />
    </g>
  );
};

/**
 * @param t       seconds (drives the cycle)
 * @param frame   integer frame (drives the boil)
 * @param cadence strides per second
 */
export const Runner = ({ t, frame, x, y, scale = 1, ink = "#2a2622", cadence = 2, id = "r", ghosts = true, width = 9 }) => {
  const p = 2 * Math.PI * cadence * t;
  const seed = Math.floor(frame / 3) % 7;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <defs>
        <filter id={`boil-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed={seed} />
          <feDisplacementMap in="SourceGraphic" scale="5" />
        </filter>
      </defs>
      <g filter={`url(#boil-${id})`}>
        {ghosts && [0.12, 0.06].map((d, i) => <g key={d} transform={`translate(${-30 * (i + 1)} 0)`}><Figure p={p - d * 12} ink={ink} w={width * 0.6} opacity={0.12 + i * 0.08} /></g>)}
        <Figure p={p} ink={ink} w={width} />
        {/* a second, offset pass: pencil goes over the line twice */}
        <g transform="translate(2 -1.5)"><Figure p={p + 0.03} ink={ink} w={width * 0.35} opacity={0.5} /></g>
      </g>
    </g>
  );
};
