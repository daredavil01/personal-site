// 19.6–26 s: a crumpled sheet slides over the wall, a pencil runner runs,
// kilometre flags go by, then he drags the new page in on a rope and the URL
// gets typed, highlighted and circled.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { T } from "../timeline";
import { Browser, fonts, out, pop, prog, track, useLayout, useTime, VW } from "../kit";
import { Runner } from "../Runner";

const INK = "#2a2622";
const SPEED = 900;
const FLAGS = ["5K", "10K", "21K", "35K", "42K", "50K"];

export const PaperBg = ({ id = "paper" }) => {
  const { W, H } = useLayout();
  return (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
    <defs>
      <filter id={id} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.0055" numOctaves="5" seed="11" result="n" />
        <feDiffuseLighting in="n" lightingColor="#fbf3e2" surfaceScale="2.6" result="lit">
          <feDistantLight azimuth="235" elevation="52" />
        </feDiffuseLighting>
      </filter>
      <filter id={`${id}-grain`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="2" />
        <feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.17  0 0 0 0 0.12  0 0 0 0.09 0" />
      </filter>
    </defs>
    <rect width={W} height={H} filter={`url(#${id})`} />
    <rect width={W} height={H} filter={`url(#${id}-grain)`} />
    {/* scrapes: faint eraser smudges and stray pencil */}
    <path d="M140 160 q60 -20 120 4 t130 -6" stroke={INK} strokeOpacity="0.12" strokeWidth="3" fill="none" />
    <path d="M1580 980 q80 -30 170 -4" stroke={INK} strokeOpacity="0.1" strokeWidth="4" fill="none" />
    <ellipse cx={W - 270} cy="210" rx="140" ry="40" fill="#fff" opacity="0.25" transform={`rotate(-12 ${W - 270} 210)`} />
  </svg>
  );
};

// A wobbly hand-drawn line from x1 to x2 at y.
const sketchLine = (x1, x2, y, seed) => {
  let d = `M${x1} ${y}`;
  for (let x = x1; x <= x2; x += 60) d += ` L${x} ${y + Math.sin(x * 0.013 + seed) * 3 + Math.sin(x * 0.051 + seed * 2) * 1.5}`;
  return d;
};

export const Paper = ({ start }) => {
  const t = useTime(start);
  const frame = useCurrentFrame();
  const { W, H, v } = useLayout();
  const GROUND = v ? 1340 : 840;
  const home = v ? 400 : 760;
  const run = (tt) => track(tt, [[20, home], [22.8, home], [24.3, W + 430]], (x) => x * x * x);

  // The sheet arrives over the photo wall.
  const sheet = prog(t, 19.6, 20.25, out);
  const tilt = (1 - sheet) * -6;

  const runnerX = run(t);
  const runnerY = GROUND - 202;
  const travelled = (t - 20) * SPEED + Math.max(0, t - 22.8) * 600;

  // The page on a rope until it snaps, then a spring to centre.
  const snap = 23.75;
  const sc = v ? track(t, [[23.6, 0.6], [24.3, 0.68], [25.2, 0.72]]) : track(t, [[23.6, 0.72], [24.3, 0.84], [25.2, 0.9]]);
  const pulledLeft = (tt) => run(tt) - 300 - VW * (v ? 0.6 : 0.72);
  const target = (W - VW * sc) / 2;
  const left = t < snap ? pulledLeft(t) : pulledLeft(snap) + (target - pulledLeft(snap)) * pop(t, snap, 8, 5);
  const top = v ? track(t, [[22.8, 700], [24.0, 600], [25.2, 560]]) : track(t, [[22.8, 300], [24.0, 170], [25.2, 120]]);
  const show = t > 22.9;

  const typed = prog(t, 24.25, 25.0, (x) => x);
  const mark = prog(t, 25.05, 25.4, out);
  const circle = prog(t, 25.25, 25.85, out);

  return (
    <AbsoluteFill style={{ transform: `translateY(${(1 - sheet) * H * 1.1}px) rotate(${tilt}deg)`, transformOrigin: "50% 100%" }}>
      <PaperBg />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {/* torn top edge shadow */}
        <path d={sketchLine(-20, W + 20, GROUND, 1)} stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round"
          pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - prog(t, 20.1, 20.7, out)} />
        <path d={sketchLine(-20, W + 20, GROUND + 7, 4)} stroke={INK} strokeOpacity="0.4" strokeWidth="2" fill="none"
          pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - prog(t, 20.2, 20.8, out)} />
        {/* ground hatching rushing past */}
        {Array.from({ length: 22 }, (_, i) => {
          const x = ((i * 97 - travelled) % W + W) % W;
          return <path key={i} d={`M${x} ${GROUND + 18 + (i % 3) * 14} l${-24 - (i % 4) * 10} 0`} stroke={INK} strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />;
        })}
        {/* kilometre flags going by */}
        {FLAGS.map((k, i) => {
          const x = W + 120 + i * 520 - (t - 20.2) * SPEED;
          if (x < -200 || x > W + 200) return null;
          return (
            <g key={k} transform={`translate(${x} ${GROUND})`}>
              <path d="M0 0 L0 -170" stroke={INK} strokeWidth="5" strokeLinecap="round" />
              <path d="M0 -170 L95 -150 L0 -122 Z" fill="#d9480f" fillOpacity="0.85" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
              <text x={8} y={-140} fontFamily={fonts.hand} fontWeight="700" fontSize="30" fill="#fff">{k}</text>
            </g>
          );
        })}
        {/* sketched sun */}
        <g opacity={prog(t, 20.4, 21)} transform={`translate(${v ? 880 : 1640} ${v ? 640 : 230}) rotate(${t * 20})`}>
          <circle r={58} fill="none" stroke="#e8a317" strokeWidth="5" />
          {Array.from({ length: 10 }, (_, i) => <path key={i} d="M0 -78 L0 -104" stroke="#e8a317" strokeWidth="5" strokeLinecap="round" transform={`rotate(${i * 36})`} />)}
        </g>
        {/* dust kicked up at each footfall */}
        {Array.from({ length: 10 }, (_, i) => {
          const born = Math.floor(t * 4) / 4 - i * 0.25;
          const age = t - born;
          if (born < 20.3 || age > 0.9) return null;
          const x = (t < 22.8 ? home : runnerX) - 40 - age * 260;
          return <circle key={i} cx={x} cy={GROUND - 10 - age * 30} r={8 + age * 30} fill="none" stroke={INK} strokeOpacity={(0.9 - age) * 0.4} strokeWidth="3" />;
        })}
        {/* speed lines */}
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${runnerX - 170 - i * 30} ${runnerY - 120 + i * 60} l-${110 + i * 40} 0`} stroke={INK} strokeOpacity={0.5 * prog(t, 20.6, 21)} strokeWidth="4" strokeLinecap="round"
            strokeDasharray="40 18" strokeDashoffset={-t * 300} />
        ))}
        {/* the rope */}
        {show && t < snap + 0.25 && (() => {
          const hx = runnerX - 40;
          const hy = runnerY - 60;
          const ex = left + VW * sc;
          const ey = top + 300 * sc;
          const sag = t < snap ? 60 : 60 + (t - snap) * 900;
          return <path d={`M${hx} ${hy} Q${(hx + ex) / 2} ${(hy + ey) / 2 + sag} ${ex} ${ey}`} stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round"
            opacity={t < snap ? 1 : 1 - (t - snap) / 0.25} strokeDasharray={t < snap ? "none" : "14 10"} />;
        })()}
        <Runner t={t} frame={frame} x={runnerX} y={runnerY} scale={1.4} ink={INK} cadence={2} id="paper" />
      </svg>

      {/* The line, handwritten */}
      <div style={{ position: "absolute", left: v ? 70 : 140, top: v ? 260 : 150, fontFamily: fonts.hand, fontWeight: 700, color: INK, fontSize: v ? 96 : 92, lineHeight: 1.05, opacity: 1 - prog(t, 22.7, 23.1) }}>
        <div style={{ clipPath: `inset(0 ${100 - 100 * prog(t, 20.6, 21.6, (x) => x)}% 0 0)` }}>Every finish line</div>
        <div style={{ clipPath: `inset(0 ${100 - 100 * prog(t, 21.5, 22.4, (x) => x)}% 0 0)`, color: "#d9480f" }}>starts with a single step.</div>
      </div>

      {show && (
        <div style={{ position: "absolute", left, top, width: VW, transform: `scale(${sc}) rotate(${t < snap ? -3 : -3 + 3 * pop(t, snap, 8, 5)}deg)`, transformOrigin: "0 0" }}>
          <Browser url="sankettambare.in/sports" typed={t < 24.25 ? 0.6 : 0.6 + 0.4 * typed} mark={mark} style={{ position: "relative" }}>
            <Img src={staticFile("shots/hero.jpg")} style={{ width: VW, display: "block" }} />
          </Browser>
          {/* pencil circle around the address */}
          <svg style={{ position: "absolute", left: 60, top: -40, overflow: "visible" }} width="520" height="130">
            <path d="M60 70 C 40 10, 470 0, 490 55 C 505 105, 90 120, 40 80 C 20 60, 60 28, 120 22" fill="none" stroke="#d9480f" strokeWidth="7" strokeLinecap="round"
              pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - circle} />
          </svg>
          <div style={{
            position: "absolute", left: v ? 120 : 900, top: v ? -170 : -24, fontFamily: fonts.hand, fontWeight: 700, fontSize: v ? 100 : 70, color: "#d9480f",
            textShadow: "0 0 12px #fff, 0 0 4px #fff",
            transform: `rotate(-4deg) scale(${pop(t, 25.5, 10, 6)})`, transformOrigin: "0 100%", whiteSpace: "nowrap",
          }}>
            ← the new marathons page!
          </div>
        </div>
      )}
      <AbsoluteFill style={{ pointerEvents: "none", opacity: prog(t, T.stats - 0.1, T.stats) }} />
    </AbsoluteFill>
  );
};
