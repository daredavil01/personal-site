// Shared pieces: easing tracks, fonts, the browser frame, the page camera,
// the cursor, highlights, wipes and the URL chip.
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { FPS } from "./timeline";

export const fonts = {
  ui: loadInter("normal", { weights: ["400", "600", "800"], subsets: ["latin"] }).fontFamily,
  slam: loadBebas("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily,
  hand: loadCaveat("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily,
  serif: loadFraunces("normal", { weights: ["400", "700", "900"], subsets: ["latin"] }).fontFamily,
  mono: loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily,
};

export const ease = Easing.bezier(0.65, 0, 0.35, 1);
export const out = Easing.bezier(0.16, 1, 0.3, 1);
export const backOut = Easing.bezier(0.34, 1.56, 0.64, 1);

/** Absolute time in seconds, for a scene mounted in a Sequence starting at `start`. */
export const useTime = (start) => useCurrentFrame() / FPS + start;

/** 0→1 over [a, b] seconds, clamped and eased. */
export const prog = (t, a, b, e = ease) => interpolate(t, [a, b], [0, 1], {
  extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e,
});

/** Eased value through keyframes [[time, value], …]. */
export const track = (t, keys, e = ease) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i += 1) {
    const [t1, v1] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) return v0 + (v1 - v0) * prog(t, t0, t1, e);
  }
  return keys[keys.length - 1][1];
};

/** Damped spring 0→1 starting at `at`, overshooting once. */
export const pop = (t, at, stiff = 9, damp = 6) => {
  const x = t - at;
  if (x <= 0) return 0;
  return 1 - Math.exp(-damp * x) * Math.cos(stiff * x);
};

/** Frame size of the composition being rendered; v = portrait. */
export const useLayout = () => {
  const { width: W, height: H } = useVideoConfig();
  return { W, H, v: H > W };
};
// The page as captured: 1440 CSS px wide viewport of 810.
export const VW = 1440;
export const VH = 810;

/** Page coordinates → viewport coordinates under a camera {cx, cy, z}. */
export const toView = (cam, x, y) => [VW / 2 + (x - cam.cx) * cam.z, VH / 2 + (y - cam.cy) * cam.z];

/** A screenshot of the page seen through the camera; children sit in page coordinates. */
export const Shot = ({ src, pageH, cam, opacity = 1, children, style }) => (
  <div style={{
    position: "absolute", left: 0, top: 0, width: VW, height: pageH, transformOrigin: "0 0", opacity,
    transform: `translate(${VW / 2 - cam.cx * cam.z}px, ${VH / 2 - cam.cy * cam.z}px) scale(${cam.z})`, ...style,
  }}>
    <Img src={staticFile(src)} style={{ width: VW, height: pageH, display: "block" }} />
    {children}
  </div>
);

/** A browser window: chrome bar with the URL, a 1440×810 viewport. */
export const Browser = ({ url = "sankettambare.in/sports", typed = 1, mark = 0, dark = false, children, style }) => {
  const shown = url.slice(0, Math.round(url.length * typed));
  const bar = dark ? "#1d2333" : "#ece8e1";
  return (
    <div style={{
      position: "absolute", width: VW, height: VH + 52, borderRadius: 18, overflow: "hidden",
      boxShadow: "0 40px 120px rgba(0,0,0,.45), 0 0 0 1px rgba(0,0,0,.12)", background: "#fff", ...style,
    }}>
      <div style={{ height: 52, background: bar, display: "flex", alignItems: "center", padding: "0 20px", gap: 10 }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />)}
        <div style={{
          marginLeft: 24, flex: 1, maxWidth: 760, height: 34, borderRadius: 17, background: dark ? "#0f1320" : "#fff",
          display: "flex", alignItems: "center", padding: "0 18px", fontFamily: fonts.ui, fontSize: 21, fontWeight: 600,
          color: dark ? "#cfd6ea" : "#333", position: "relative",
        }}>
          <span style={{ opacity: 0.5, marginRight: 8 }}>🔒</span>
          <span style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: -4, right: -4, top: 2, bottom: 2, background: "#ffe14d",
              transformOrigin: "left", transform: `scaleX(${mark})`, borderRadius: 4, opacity: 0.85,
            }} />
            <span style={{ position: "relative" }}>{shown}</span>
            {typed < 1 && <span style={{ position: "relative", borderLeft: "2px solid #333", marginLeft: 1 }} />}
          </span>
        </div>
      </div>
      <div style={{ position: "relative", width: VW, height: VH, overflow: "hidden", background: "#fff" }}>{children}</div>
    </div>
  );
};

/** Mouse pointer with a click ripple at each time in `clicks`. */
export const Cursor = ({ x, y, t, clicks = [], color = "#111" }) => {
  const last = clicks.filter((c) => t >= c).pop();
  const since = last === undefined ? 9 : t - last;
  const press = since < 0.15 ? 0.85 : 1;
  return (
    <div style={{ position: "absolute", left: x, top: y, pointerEvents: "none" }}>
      {since < 0.6 && (
        <div style={{
          position: "absolute", left: -40, top: -40, width: 80, height: 80, borderRadius: 40,
          border: `4px solid ${color}`, opacity: 1 - since / 0.6, transform: `scale(${0.3 + since * 1.6})`,
        }} />
      )}
      <svg width="40" height="48" viewBox="0 0 20 24" style={{ transform: `scale(${press})`, transformOrigin: "0 0", filter: "drop-shadow(0 4px 6px rgba(0,0,0,.35))" }}>
        <path d="M1 1 L1 19 L6 14.5 L9.5 22 L12.5 20.6 L9 13.4 L15.5 13.4 Z" fill="#fff" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/** A glowing outline drawn around a page box (page coordinates). */
export const Ring = ({ box, p, color = "#c6ff3d", pad = 8, radius = 14, width = 5, glow = true }) => {
  if (p <= 0) return null;
  const w = box.w + pad * 2;
  const h = box.h + pad * 2;
  return (
    <svg style={{ position: "absolute", left: box.x - pad - width, top: box.y - pad - width, overflow: "visible" }} width={w + width * 2} height={h + width * 2}>
      <rect x={width} y={width} width={w} height={h} rx={radius} fill="none" stroke={color} strokeWidth={width}
        pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p}
        style={{ filter: glow ? `drop-shadow(0 0 10px ${color})` : "none" }} />
    </svg>
  );
};

/** A diagonal colour wipe that reveals children; p 0→1. */
export const Wipe = ({ p, children, colors = ["#ffe14d", "#111"] }) => {
  const edge = (k) => -30 + k * 160; // percent
  const a = edge(p);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `polygon(0 0, ${a}% 0, ${a - 30}% 100%, 0 100%)` }}>{children}</AbsoluteFill>
      {p > 0 && p < 1 && colors.map((c, i) => {
        const b = a + (i + 1) * 6;
        return <AbsoluteFill key={c} style={{ background: c, clipPath: `polygon(${b - 6}% 0, ${b}% 0, ${b - 30}% 100%, ${b - 36}% 100%)` }} />;
      })}
    </AbsoluteFill>
  );
};

/** Persistent URL chip for the page scenes. */
export const UrlChip = ({ p = 1, fg = "#111", bg = "#ffe14d" }) => {
  const { v } = useLayout();
  return (
  <div style={{
    position: "absolute", right: v ? 0 : 48, left: v ? 0 : "auto", margin: v ? "0 auto" : 0, width: "fit-content", bottom: v ? 90 : 40, padding: "12px 22px", borderRadius: 40, background: bg, color: fg,
    fontFamily: fonts.mono, fontWeight: 700, fontSize: 26, letterSpacing: 0.5, boxShadow: "0 10px 30px rgba(0,0,0,.3)",
    transform: `translateY(${(1 - p) * 140}px)`, display: "flex", alignItems: "center", gap: 12,
  }}>
    <span style={{ width: 12, height: 12, borderRadius: 6, background: fg }} />
    sankettambare.in/sports
  </div>
  );
};

/** Scene title that slams in big then tucks into the top-left corner. */
export const SceneTitle = ({ t, at, index, title, color, font = fonts.slam, accent, hold = 1.3 }) => {
  const { W, H, v } = useLayout();
  const enter = prog(t, at, at + 0.45, out);
  const tuck = prog(t, at + hold, at + hold + 0.6);
  const scale = 1 - tuck * 0.62;
  return (
    <div style={{
      position: "absolute", left: interpolate(tuck, [0, 1], [W / 2, 60]), top: interpolate(tuck, [0, 1], [H / 2, 48]),
      transform: `translate(${interpolate(tuck, [0, 1], [-50, 0])}%, ${interpolate(tuck, [0, 1], [-50, 0])}%) scale(${scale})`,
      transformOrigin: "0 0", color, fontFamily: font, whiteSpace: "nowrap", zIndex: 5, textShadow: "0 8px 40px rgba(0,0,0,.35)",
      opacity: enter, clipPath: `inset(0 ${100 - enter * 100}% 0 0)`,
    }}>
      <div style={{ fontSize: 40, letterSpacing: 8, color: accent, fontFamily: fonts.mono, fontWeight: 700 }}>{index}</div>
      <div style={{ fontSize: v ? 128 : 150, lineHeight: 0.95 }}>{title}</div>
    </div>
  );
};

