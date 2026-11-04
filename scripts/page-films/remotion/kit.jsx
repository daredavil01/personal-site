import React from "react";
import {
  AbsoluteFill, Easing, Img, continueRender, delayRender, interpolate, random, staticFile, useCurrentFrame,
} from "remotion";
import { OVERLAP } from "../script";

// The pieces every page-film scene draws with. Everything moves by frame
// number: Remotion renders frames out of order, so nothing keeps its own clock.

export const W = 1080;
export const H = 1920;
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };
export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const back = Easing.bezier(0.34, 1.56, 0.64, 1);
export const prog = (f, a, b, easing = ease) => interpolate(f, [a, b], [0, 1], { ...clamp, easing });
export const lerp = (a, b, k) => a + (b - a) * k;
export const fmt = (n) => Math.round(n).toLocaleString("en-IN");
export const src = (s) => (!s ? null : /^(https?:|data:)/.test(s) ? s : staticFile(s));

export const SERIF = "'Noto Serif', Georgia, serif";
export const SANS = "'Inter', sans-serif";
export const DISPLAY = "'Plus Jakarta Sans', 'Inter', sans-serif";
export const DEVA = "'Noto Sans Devanagari', 'Inter', sans-serif";
export const headFont = (th) => (th.head === "serif" ? SERIF : DISPLAY);
export const headStyle = (th, size, extra = {}) => ({
  fontFamily: headFont(th),
  fontWeight: 700,
  fontSize: size,
  lineHeight: 1.04,
  letterSpacing: th.head === "serif" ? -1 : -2,
  textTransform: th.head === "display" ? "uppercase" : "none",
  color: th.fg,
  ...extra,
});
export const label = (th, extra = {}) => ({
  fontFamily: DISPLAY, fontWeight: 700, fontSize: 26, letterSpacing: "0.28em", textTransform: "uppercase", color: th.accent, ...extra,
});

const FACES = [
  ["Noto Serif", "noto-serif-latin-400-normal.woff", "400"],
  ["Noto Serif", "noto-serif-latin-700-normal.woff", "700"],
  ["Plus Jakarta Sans", "plus-jakarta-sans-latin-700-normal.woff", "700"],
  ["Inter", "inter-latin-400-normal.woff", "400"],
  ["Inter", "inter-latin-700-normal.woff", "700"],
  ["Noto Sans Devanagari", "noto-sans-devanagari-devanagari-400-normal.woff", "400"],
  ["Noto Sans Devanagari", "noto-sans-devanagari-devanagari-700-normal.woff", "700"],
];

export function loadFonts() {
  if (typeof document === "undefined" || typeof FontFace === "undefined") return;
  const handle = delayRender("fonts");
  Promise.all(FACES.map(([family, file, weight]) => new FontFace(family, `url(${staticFile(file)})`, { weight })
    .load().then((f) => document.fonts.add(f))))
    .then(() => continueRender(handle), () => continueRender(handle));
}

// --- slide-in effects ------------------------------------------------------------------
// One vocabulary for scenes and for the items inside them, so a film can vary
// how each thing arrives: from either side, from above or below, a zoom, a
// wipe, a tilt, an iris.

export function enterStyle(variant, k) {
  const inv = 1 - k;
  switch (variant) {
    case "left": return { transform: `translateX(${-inv * 1100}px)` };
    case "right": return { transform: `translateX(${inv * 1100}px)` };
    case "up": return { transform: `translateY(${inv * 900}px)` };
    case "down": return { transform: `translateY(${-inv * 900}px)` };
    case "zoom": return { transform: `scale(${lerp(1.6, 1, k)})`, opacity: k, filter: `blur(${inv * 18}px)` };
    case "wipe": return { clipPath: `inset(0 ${inv * 100}% 0 0)` };
    case "tilt": return { transform: `perspective(1600px) rotateY(${inv * -70}deg) translateX(${inv * 200}px)`, opacity: Math.min(1, k * 1.5) };
    case "iris": return { clipPath: `circle(${k * 120}% at 50% 45%)` };
    default: return { opacity: k };
  }
}

/** A whole scene: slides in over the overlap, fades and sinks on the way out. */
export const SceneEnter = ({ variant, dur, last, children, bg }) => {
  const f = useCurrentFrame();
  const k = prog(f, 0, OVERLAP + 6, Easing.bezier(0.22, 1, 0.36, 1));
  const out = last ? 0 : prog(f, dur - OVERLAP, dur, Easing.in(Easing.cubic));
  return (
    <AbsoluteFill style={{ ...enterStyle(variant, k), opacity: (enterStyle(variant, k).opacity ?? 1) * (1 - out * 0.85), background: bg }}>
      <AbsoluteFill style={{ transform: `scale(${1 - out * 0.06})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** An item inside a scene, arriving at frame `at` with its own effect. */
export const SlideIn = ({
  at, variant = "up", len = 14, style, children, dist = 120,
}) => {
  const f = useCurrentFrame();
  const k = prog(f, at, at + len, variant === "pop" ? back : ease);
  const inv = 1 - k;
  const t = {
    up: `translateY(${inv * dist}px)`,
    down: `translateY(${-inv * dist}px)`,
    left: `translateX(${-inv * dist * 1.5}px)`,
    right: `translateX(${inv * dist * 1.5}px)`,
    pop: `scale(${lerp(0.4, 1, k)})`,
    zoom: `scale(${lerp(1.5, 1, k)})`,
  }[variant] || "none";
  return <div style={{ position: "absolute", ...style, opacity: Math.min(1, k * 1.6), transform: `${t} ${style?.transform || ""}` }}>{children}</div>;
};

export const Counter = ({ value, from, to, suffix = "" }) => {
  const f = useCurrentFrame();
  return <>{`${fmt(value * prog(f, from, to, Easing.out(Easing.cubic)))}${suffix}`}</>;
};

/** A photo that drifts and pushes in (Ken Burns), seeded per photo. */
export const Photo = ({
  file, k, seed = 1, style, filter = "none", radius = 0,
}) => {
  const dx = (random(`x${seed}`) - 0.5) * 50;
  const dy = (random(`y${seed}`) - 0.5) * 50;
  return (
    <div style={{ position: "absolute", overflow: "hidden", borderRadius: radius, background: "#222", ...style }}>
      {file && (
        <Img
          src={src(file)}
          style={{
            position: "absolute", width: "100%", height: "100%", objectFit: "cover", filter,
            transform: `translate(${dx * k}px, ${dy * k}px) scale(${1.05 + 0.12 * k})`,
          }}
        />
      )}
    </div>
  );
};

// --- the overlays ----------------------------------------------------------------------------

// Film grain: one pre-made noise tile (render.mjs writes grain.png), jumped
// to a new offset every other frame. A full-frame SVG turbulence filter looked
// the same and cost several times the render.
export const Grain = ({ amount }) => {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 2);
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none", opacity: amount, mixBlendMode: "overlay",
        backgroundImage: `url(${staticFile("grain.png")})`, backgroundSize: "512px 512px",
        backgroundPosition: `${Math.round(random(`gx${seed}`) * 512)}px ${Math.round(random(`gy${seed}`) * 512)}px`,
      }}
    />
  );
};

export const Vignette = ({ dark }) => (
  <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse 90% 75% at 50% 50%, transparent 55%, ${dark ? "rgba(0,0,0,.55)" : "rgba(120,90,50,.18)"} 100%)` }} />
);

/** The progress rail and the page's name, top left; the address at the end. */
export const Chrome = ({
  th, name, route, total,
}) => {
  const f = useCurrentFrame();
  const endK = prog(f, total - 110, total - 92);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 60, right: 60, top: 70, height: 6, borderRadius: 3, background: th.soft, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(f / total) * 100}%`, background: th.accent, borderRadius: 3 }} />
      </div>
      <div style={{ ...label(th, { color: th.muted, fontSize: 24 }), position: "absolute", left: 60, top: 100, opacity: prog(f, 4, 20) * (1 - prog(f, total - 120, total - 108)) }}>
        sankettambare.in · <span style={{ color: th.accent }}>{name}</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 84, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 36, color: th.fg, opacity: endK, transform: `translateY(${(1 - endK) * 30}px)` }}>
        {`sankettambare.in${route}`}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Burned-in captions: one short chunk at a time in a pill, the word being
 * said lit in the accent, the ones already said full strength, the rest dim.
 * Timings come from script.js, the same list the .vtt is written from.
 */
export const Captions = ({ th, captions }) => {
  const f = useCurrentFrame();
  const cur = captions.find((c) => f >= c.from - 2 && f < c.to + 4);
  if (!cur) return null;
  const k = prog(f, cur.from - 2, cur.from + 4);
  const out = prog(f, cur.to, cur.to + 4);
  const deva = (w) => /[ऀ-ॿ]/.test(w);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 1560, display: "flex", justifyContent: "center", opacity: k * (1 - out), transform: `translateY(${(1 - k) * 18}px) scale(${lerp(0.96, 1, k)})` }}>
      <div style={{
        maxWidth: 940, padding: "18px 30px", borderRadius: 26, textAlign: "center",
        background: th.dark ? "rgba(0,0,0,.62)" : "rgba(255,255,255,.82)", boxShadow: "0 12px 40px rgba(0,0,0,.25)",
        fontFamily: SANS, fontWeight: 700, fontSize: 46, lineHeight: 1.22,
      }}
      >
        {cur.words.map((w, i) => {
          const lit = f >= w.at && f < w.end + 2;
          const said = f >= w.at;
          return (
            <span
              key={`${w.w}${i}`}
              style={{
                fontFamily: deva(w.w) ? DEVA : SANS,
                color: lit ? th.accent : th.fg,
                opacity: said ? 1 : 0.38,
                display: "inline-block",
                transform: `scale(${lit ? 1.06 : 1})`,
                marginRight: 12,
              }}
            >
              {w.w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Typewriter: the first `n` characters of text, with a caret. */
export const Typed = ({
  text, at, cpf, style, caret,
}) => {
  const f = useCurrentFrame();
  const n = Math.max(0, Math.floor((f - at) * cpf));
  return (
    <div style={style}>
      {text.slice(0, n)}
      {n < text.length && <span style={{ display: "inline-block", width: 6, height: "0.85em", background: caret, marginLeft: 4, opacity: Math.floor(f / 8) % 2 ? 0.25 : 1, verticalAlign: "-0.08em" }} />}
    </div>
  );
};
