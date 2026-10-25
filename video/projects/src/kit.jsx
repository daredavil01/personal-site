// Shared pieces: fonts, easing, the HUD background, the phone that plays a
// recording, chips and the glitch cut.
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { FPS } from "./timeline";
import { CLIPS, FPS_REC } from "./data";

export const fonts = {
  ui: loadInter("normal", { weights: ["400", "600", "800"], subsets: ["latin"] }).fontFamily,
  slam: loadBebas("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily,
  mono: loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily,
};

export const INK = "#05070d";
export const LIME = "#c6ff3d";

export const ease = Easing.bezier(0.65, 0, 0.35, 1);
export const out = Easing.bezier(0.16, 1, 0.3, 1);

/** Absolute time in seconds, for a scene mounted in a Sequence starting at `start`. */
export const useTime = (start) => useCurrentFrame() / FPS + start;

/** 0→1 over [a, b] seconds, clamped and eased. */
export const prog = (t, a, b, e = ease) => interpolate(t, [a, b], [0, 1], {
  extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e,
});

/** Damped spring 0→1 starting at `at`, overshooting once. */
export const pop = (t, at, stiff = 14, damp = 7) => {
  const x = t - at;
  if (x <= 0) return 0;
  return 1 - Math.exp(-damp * x) * Math.cos(stiff * x);
};

/** Seeded 0–1 noise, stable per (i, salt). */
export const rand = (i, salt = 1) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const pad = (i) => String(i).padStart(3, "0");
export const frameSrc = (clip, i) => staticFile(`rec/${clip}/${pad(i)}.jpg`);

/** Recording frame at `t` seconds into the clip, played at capture pace, held on its last frame. */
export const Rec = ({ clip, t, speed = 1, style }) => {
  const n = CLIPS[clip].frames;
  const i = Math.max(0, Math.min(n - 1, Math.floor(t * FPS_REC * speed)));
  return <Img src={frameSrc(clip, i)} style={{ width: 1080, height: 1920, display: "block", ...style }} />;
};

/** A phone: rounded glass edge, 1080×1920 screen drawn at `scale`. */
export const Phone = ({ scale = 0.6, glow = LIME, children, style }) => (
  <div style={{
    position: "absolute", width: 1080 * scale + 28, height: 1920 * scale + 28, borderRadius: 64 * scale + 14,
    background: "#0c0f17", padding: 14, boxShadow: `0 50px 140px rgba(0,0,0,.6), 0 0 0 2px rgba(255,255,255,.08), 0 0 80px ${glow}33`,
    ...style,
  }}>
    <div style={{ width: 1080 * scale, height: 1920 * scale, borderRadius: 64 * scale, overflow: "hidden", position: "relative", background: "#fff" }}>
      <div style={{ width: 1080, height: 1920, transform: `scale(${scale})`, transformOrigin: "0 0" }}>{children}</div>
    </div>
  </div>
);

/** Dark HUD: a faint grid drifting upward, a vignette and scanlines. */
export const Hud = ({ t, tint = LIME, children }) => (
  <AbsoluteFill style={{ background: INK, overflow: "hidden" }}>
    <AbsoluteFill style={{
      backgroundImage: `linear-gradient(${tint}14 2px, transparent 2px), linear-gradient(90deg, ${tint}14 2px, transparent 2px)`,
      backgroundSize: "90px 90px", backgroundPosition: `0 ${-(t * 30) % 90}px`,
    }} />
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, ${tint}22, transparent 60%)` }} />
    {children}
    <AbsoluteFill style={{
      pointerEvents: "none", opacity: 0.18,
      backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,.6) 0 2px, transparent 2px 5px)",
    }} />
    <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.7))" }} />
  </AbsoluteFill>
);

/** A small mono label. */
export const Chip = ({ children, color = LIME, solid = false, size = 26, style }) => (
  <span style={{
    display: "inline-block", padding: `${size * 0.35}px ${size * 0.7}px`, borderRadius: 999, fontFamily: fonts.mono, fontWeight: 700,
    fontSize: size, letterSpacing: 0.5, whiteSpace: "nowrap", color: solid ? INK : color, background: solid ? color : `${color}1a`,
    border: `2px solid ${color}${solid ? "" : "66"}`, ...style,
  }}>{children}</span>
);

/** RGB-split jitter for the first `len` seconds after `at`. Wrap a scene's content. */
export const Glitch = ({ t, at, len = 0.25, children }) => {
  const k = t - at;
  const on = k >= 0 && k < len;
  const dx = on ? (rand(Math.floor(k * 60), 3) - 0.5) * 40 : 0;
  return (
    <AbsoluteFill style={{
      transform: `translateX(${dx}px)`,
      filter: on ? `drop-shadow(${8 + dx / 3}px 0 0 rgba(255,0,80,.7)) drop-shadow(${-8 - dx / 3}px 0 0 rgba(0,240,255,.7))` : "none",
    }}>
      {children}
    </AbsoluteFill>
  );
};

/** Text revealed character by character from `at` at `cps`, with a block cursor. */
export const Typed = ({ t, at, text, cps = 40, cursor = true }) => {
  const n = Math.max(0, Math.min(text.length, Math.floor((t - at) * cps)));
  const blink = Math.floor(t * 2.5) % 2 === 0;
  return (
    <span>
      {text.slice(0, n)}
      {cursor && <span style={{ opacity: n < text.length || blink ? 1 : 0, background: LIME, color: LIME }}>_</span>}
    </span>
  );
};
