// 55.6–60 s: the chalk runner breaks the tape, confetti, and the URL.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { T } from "../timeline";
import { fonts, out, pop, prog, track, useLayout, useTime, Wipe } from "../kit";
import { Runner } from "../Runner";
import { STATS } from "../data";

const GOLD = "#ffd23f";

let s = 99;
const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
const CONFETTI = Array.from({ length: 140 }, () => ({
  vx: (rnd() - 0.5) * 1700, vy: -400 - rnd() * 1300, rot: rnd() * 720, c: ["#ffd23f", "#ff6b35", "#3de0ff", "#c6ff3d", "#ff4fa3", "#fff"][Math.floor(rnd() * 6)],
  w: 10 + rnd() * 14,
}));

export const Outro = ({ start }) => {
  const t = useTime(start);
  const frame = useCurrentFrame();
  const { W, H, v } = useLayout();
  const GROUND = v ? 1560 : 900;
  const wipe = prog(t, 55.6, 56.05);
  const rx = v ? track(t, [[55.6, 120], [T.outro, 260], [58, 500], [60, 640]], (x) => x) : track(t, [[55.6, 380], [T.outro, 520], [58, 760], [60, 900]], (x) => x);
  const snapped = t >= T.outro + 0.05;
  const since = t - T.outro;
  const tapeX = v ? 350 : 610;
  const url = pop(t, 56.9, 9, 6);
  const mark = prog(t, 57.4, 57.9, out);
  const fadeOut = prog(t, 59.4, T.end);

  return (
    <Wipe p={wipe} colors={[GOLD, "#111"]}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #2a2a2a 0%, #0b0b0b 70%)", overflow: "hidden" }}>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {/* chalk ground and checkered finish line */}
          <path d={`M0 ${GROUND} L${W} ${GROUND}`} stroke="#eee" strokeWidth="4" strokeDasharray="30 8" opacity="0.6" />
          {Array.from({ length: 16 }, (_, i) => <rect key={i} x={tapeX + 30 - 20 + (i % 2) * 20} y={GROUND + 2 + Math.floor(i / 2) * 20} width={20} height={20} fill="#eee" opacity="0.8" />)}
          {/* posts and tape */}
          <path d={`M${tapeX + 30} ${GROUND} L${tapeX + 30} ${GROUND - 330}`} stroke="#eee" strokeWidth="6" />
          {!snapped && <path d={`M${tapeX + 30} ${GROUND - 250} Q${tapeX + 30 + (rx - 480) * 0.3} ${GROUND - 240} ${tapeX + 30} ${GROUND - 230}`} stroke={GOLD} strokeWidth="10" fill="none" />}
          {snapped && [-1, 1].map((d) => (
            <path key={d} d={`M${tapeX + 30} ${GROUND - 250 + d * 10} q${-120 - since * 60} ${40 + since * 160} ${-200 - since * 40} ${180 + since * 90}`}
              stroke={GOLD} strokeWidth="10" fill="none" strokeLinecap="round" opacity={1 - prog(t, 57.5, 58.5)} />
          ))}
          <Runner t={t} frame={frame} x={rx} y={GROUND - 202} scale={1.4} ink="#f4f1ea" cadence={2} id="outro" width={8} />
          {snapped && CONFETTI.map((c, i) => {
            const x = tapeX + 30 + c.vx * since;
            const y = GROUND - 250 + c.vy * since + 900 * since * since;
            if (y > H + 40) return null;
            return <rect key={i} x={x} y={y} width={c.w} height={c.w * 0.45} fill={c.c} transform={`rotate(${c.rot + since * 600} ${x} ${y})`} />;
          })}
        </svg>

        <div style={{ position: "absolute", left: v ? 80 : 900, top: v ? 200 : 230, width: v ? 940 : 960 }}>
          <div style={{ fontFamily: fonts.slam, fontSize: v ? 190 : 150, color: "#fff", lineHeight: 0.9 }}>
            {["EVERY", "RACE IS", "A STORY."].map((w, i) => (
              <div key={w} style={{ transform: `translateX(${(1 - prog(t, 56.15 + i * 0.15, 56.55 + i * 0.15, out)) * 800}px)`, opacity: prog(t, 56.15 + i * 0.15, 56.4 + i * 0.15), color: i === 2 ? GOLD : "#fff" }}>{w}</div>
            ))}
          </div>
          <div style={{ fontFamily: fonts.mono, fontSize: 26, color: "#bbb", marginTop: 18, letterSpacing: 3, opacity: prog(t, 56.7, 57) }}>
            {STATS.races} RACES · {STATS.km} KM · {STATS.cities} CITIES · ONE PAGE
          </div>
          <div style={{
            marginTop: 40, display: "inline-block", position: "relative", fontFamily: fonts.mono, fontWeight: 700, fontSize: 62, color: "#111",
            transform: `scale(${url})`, transformOrigin: "left center",
          }}>
            <div style={{ position: "absolute", left: -18, right: -18, top: -6, bottom: -6, background: GOLD, borderRadius: 14, transform: `scaleX(${0.15 + 0.85 * mark}) skewX(-6deg)`, transformOrigin: "left" }} />
            <span style={{ position: "relative" }}>sankettambare.in/sports</span>
          </div>
          <div style={{ fontFamily: fonts.hand, fontWeight: 700, fontSize: 48, color: "#eee", marginTop: 26, opacity: prog(t, 57.9, 58.3), transform: "rotate(-2deg)" }}>
            Physical Endurance — Sanket Tambare
          </div>
        </div>
        <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} />
      </AbsoluteFill>
    </Wipe>
  );
};
