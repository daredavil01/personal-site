import React from "react";
import {
  AbsoluteFill, Easing, interpolate, random, useCurrentFrame,
} from "remotion";
import { POSES } from "../../../src/components/Training/poses";
import {
  C, LABEL, SANS, SERIF,
} from "./theme";

// The pieces every scene draws with. Everything moves by frame number:
// Remotion renders frames out of order, so nothing may keep its own clock.

export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

/** 0→1 between two frames, eased. */
export const prog = (frame, a, b, easing = ease) => interpolate(frame, [a, b], [0, 1], { ...clamp, easing });

/** A number counting from 0 to `to` between frames a and b. */
export const countTo = (frame, a, b, to) => Math.round(to * prog(frame, a, b, Easing.out(Easing.cubic)));

export const fmt = (n) => Math.round(n).toLocaleString("en-GB");

// ---------------------------------------------------------------------------
// Figures: the page's poses (src/components/Training/poses.js), drawn here so
// the campfire can flicker by frame.
// ---------------------------------------------------------------------------

const seg = (a, b, w) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={w} />;

export const Figure = ({
  pose, x, y, scale = 1, color = C.ink, frame = 0, flip = false, opacity = 1,
}) => {
  const j = POSES[pose] || POSES.stand;
  const flick = 1 + 0.18 * Math.sin(frame * 0.9) + 0.08 * Math.sin(frame * 2.3);
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`} opacity={opacity}>
      {j.rock && <ellipse cx="-2" cy="-5" rx="10" ry="6" fill={color} opacity="0.85" />}
      {j.fire && (
        <g transform="translate(24 0)">
          <circle cx="0" cy="-8" r={16 * flick} fill={C.gold} opacity="0.18" />
          <path d="M-8 0 L8 -3 M-8 -3 L8 0" stroke="#5b3a29" strokeWidth="3" strokeLinecap="round" />
          <g transform={`scale(1 ${flick})`}>
            <path d="M0 -3 C-7 -9 -2 -14 0 -21 C2 -15 8 -11 0 -3 Z" fill="#f97316" />
            <path d="M0 -4 C-3 -8 -1 -10 0 -14 C1 -10 3 -8 0 -4 Z" fill="#fcd34d" />
          </g>
        </g>
      )}
      {j.flag && (
        <g>
          <line x1="16" y1="2" x2="16" y2="-64" stroke={color} strokeWidth="2.5" />
          <path d={`M16 -64 L${32 + 2 * Math.sin(frame * 0.4)} ${-58 + Math.sin(frame * 0.5)} L16 -52 Z`} fill={C.accent} />
        </g>
      )}
      {j.pack && <rect x={j.neck[0] - 10} y={j.neck[1] + 2} width="8" height="14" rx="3" fill={color} />}
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {seg(j.neck, j.hip, 6)}
        {seg(j.hip, j.kL, 5)}
        {seg(j.kL, j.fL, 5)}
        {seg(j.hip, j.kR, 5)}
        {seg(j.kR, j.fR, 5)}
        {seg(j.neck, j.eL, 4)}
        {seg(j.eL, j.hL, 4)}
        {seg(j.neck, j.eR, 4)}
        {seg(j.eR, j.hR, 4)}
        {j.pole && seg(j.pole[0], j.pole[1], 2)}
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

/** A stride cycle for a moving figure: alternate the two frames of a gait. */
export const gait = (base, frame, speed = 6, phase = 0) => {
  const B = { walk: "walkB", run: "runB", fast: "runB", hike: "walk" }[base];
  if (!B) return base;
  return Math.floor((frame + phase) / speed) % 2 ? B : base;
};

// ---------------------------------------------------------------------------
// Sky, grain and vignette
// ---------------------------------------------------------------------------

export const Sky = ({ tint = C.bg2 }) => {
  const frame = useCurrentFrame();
  const stars = React.useMemo(() => Array.from({ length: 140 }, (_, i) => ({
    x: random(`sx${i}`) * 1080,
    y: random(`sy${i}`) * 1920,
    r: 0.6 + random(`sr${i}`) * 1.8,
    p: random(`sp${i}`) * Math.PI * 2,
  })), []);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 80% at 50% 0%, ${tint} 0%, ${C.bg} 60%)` }}>
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
        {stars.map((s, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <circle key={i} cx={s.x} cy={(s.y - frame * 0.15 * s.r + 1920) % 1920} r={s.r} fill="#fff" opacity={0.25 + 0.35 * (0.5 + 0.5 * Math.sin(frame / 14 + s.p))} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

export const Grain = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, opacity: 0.07, mixBlendMode: "overlay" }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 12} />
        </filter>
        <rect width="1080" height="1920" filter="url(#grain)" />
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Scene in/out: each scene enters its own way and leaves with a push.
// ---------------------------------------------------------------------------

const OUT = 10;

export const SceneWrap = ({
  dur, enter = "zoom", children,
}) => {
  const frame = useCurrentFrame();
  const i = prog(frame, 0, 14);
  const o = prog(frame, dur - OUT, dur, Easing.in(Easing.cubic));
  let transform = "";
  let filter = "";
  if (enter === "zoom") { transform += `scale(${1.18 - 0.18 * i}) `; filter += `blur(${(1 - i) * 18}px) `; }
  if (enter === "rise") { transform += `translateY(${(1 - i) * 220}px) `; filter += `blur(${(1 - i) * 10}px) `; }
  if (enter === "whip") { transform += `translateX(${(1 - i) * 1080}px) skewX(${(1 - i) * -12}deg) `; filter += `blur(${(1 - i) * 24}px) `; }
  if (enter === "drop") { transform += `scale(${0.7 + 0.3 * i}) `; filter += `blur(${(1 - i) * 12}px) `; }
  transform += `scale(${1 - 0.08 * o}) translateY(${-o * 140}px)`;
  filter += `blur(${o * 20}px)`;
  return (
    <AbsoluteFill style={{
      transform, filter, opacity: Math.min(i * 1.4, 1 - o),
    }}
    >
      {children}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

export const Kicker = ({
  children, color = C.accent, style, delay = 0,
}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, delay, delay + 16);
  return (
    <div style={{
      fontFamily: LABEL, fontWeight: 700, fontSize: 30, letterSpacing: "0.32em", textTransform: "uppercase", color, opacity: p, transform: `translateY(${(1 - p) * 24}px)`, ...style,
    }}
    >
      {children}
    </div>
  );
};

/** A headline whose words rise in one after another. */
export const Rise = ({
  text, delay = 0, size = 110, color = C.ink, style, stagger = 4, font = SERIF,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{
      fontFamily: font, fontWeight: 700, fontSize: size, lineHeight: 1.02, color, letterSpacing: "-0.02em", ...style,
    }}
    >
      {text.split(" ").map((w, k) => {
        const p = prog(frame, delay + k * stagger, delay + k * stagger + 18);
        return (
          // eslint-disable-next-line react/no-array-index-key
          <span key={k} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: "0.08em" }}>
            <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 110}%) rotate(${(1 - p) * 6}deg)`, opacity: p }}>
              {w}
              &nbsp;
            </span>
          </span>
        );
      })}
    </div>
  );
};

export const Body = ({ children, style }) => (
  <div style={{
    fontFamily: SANS, fontSize: 36, lineHeight: 1.35, color: C.muted, ...style,
  }}
  >
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Burned-in captions: the narration, word by word, in the lower third.
// ---------------------------------------------------------------------------

export const Caption = ({ text, dur }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  const total = words.reduce((s, w) => s + w.length + 1, 0);
  // Pages of at most ~6 words so a phone reads them at a glance.
  const pages = [];
  let cur = [];
  words.forEach((w, k) => {
    cur.push(k);
    // A page ends at a sentence, at 6 words, or at a comma once it has 3.
    if (cur.length >= 6 || /[.;:—!?]$/.test(w) || (/,$/.test(w) && cur.length >= 3)) { pages.push(cur); cur = []; }
  });
  if (cur.length) pages.push(cur);
  let acc = 0;
  const at = words.map((w) => { const a = (acc / total) * dur; acc += w.length + 1; return a; });
  const page = pages.find((p, k) => frame < (k + 1 < pages.length ? at[pages[k + 1][0]] : dur + 999)) || pages[pages.length - 1];
  const pageStart = at[page[0]];
  const pin = prog(frame, pageStart, pageStart + 6);
  const fadeOut = 1 - prog(frame, dur, dur + 8);
  return (
    <div style={{
      position: "absolute", left: 70, right: 70, bottom: 150, textAlign: "center", opacity: fadeOut,
    }}
    >
      <span style={{
        display: "inline-block",
        padding: "18px 30px",
        borderRadius: 22,
        background: "rgba(5,9,18,0.72)",
        backdropFilter: "blur(6px)",
        fontFamily: LABEL,
        fontWeight: 700,
        fontSize: 46,
        lineHeight: 1.25,
        transform: `translateY(${(1 - pin) * 18}px) scale(${0.96 + 0.04 * pin})`,
      }}
      >
        {page.map((k) => {
          const on = frame >= at[k];
          return (
            <span key={k} style={{ color: on ? C.ink : "rgba(238,242,251,0.35)", transition: "none" }}>
              {`${words[k]} `}
            </span>
          );
        })}
      </span>
    </div>
  );
};
