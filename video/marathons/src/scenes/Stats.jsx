// 26–34 s, theme "night scoreboard": the statistics view under a moving
// camera, each block ringed in neon while its number is called out.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Browser, fonts, out, pop, prog, Ring, SceneTitle, Shot, track, UrlChip, useLayout, useTime, Wipe, VW, VH } from "../kit";
import { RACES, SHOTS } from "../data";

const LIME = "#c6ff3d";
const CYAN = "#3de0ff";
const ORANGE = "#ff8a3d";
const PINK = "#ff4fa3";

const S = SHOTS.stats;
const card = (b) => ({ x: b.x - 25, y: b.y - 38, w: b.w + 50, h: b.h + 98 });
const BIG = S.big.slice(1).map(card);
const SUB = S.sub.slice(0, 4);
const PR = S.cards.find((c) => /Personal Records/.test(c.text));
const PACE = S.cards.find((c) => /Average Pace/.test(c.text));
const pace21 = (S.sub.find((b) => /^21 km/.test(b.text)) || { text: "" }).text.split("\n").pop();

const secs = (s) => s.split(":").map(Number).reduce((a, v) => a * 60 + v, 0);
const fastest = (d) => RACES.filter((r) => parseInt(r.distance, 10) === d).sort((a, b) => secs(a.time) - secs(b.time))[0];
const best21 = fastest(21);
const best42 = fastest(42);

const CALLOUTS = [
  { at: 27.7, until: 29.3, color: LIME, big: S.big[1].text, label: "RACES FINISHED" },
  { at: 27.95, until: 29.3, color: LIME, big: S.big[2].text.replace("K", " KM"), label: "ON FOOT" },
  { at: 28.2, until: 29.3, color: LIME, big: S.big[3].text, label: "KM PER RACE" },
  { at: 29.5, until: 31.0, color: CYAN, big: SUB[0].text.split("\n")[0], label: SUB[0].text.split("\n").slice(1).join(" · ") },
  { at: 29.75, until: 31.0, color: CYAN, big: SUB[1].text.split("\n")[0], label: SUB[1].text.split("\n").slice(1).join(" · ") },
  { at: 31.2, until: 32.7, color: ORANGE, big: best21.time.replace(/^0/, ""), label: `FASTEST HALF · ${best21.title.toUpperCase()}` },
  { at: 31.45, until: 32.7, color: ORANGE, big: best42.time.replace(/^0/, ""), label: `FASTEST FULL · ${best42.title.toUpperCase()}` },
  { at: 32.9, until: 34.5, color: PINK, big: pace21.split(" ")[0], label: "MIN/KM · AVERAGE 21K PACE" },
];

export const Stats = ({ start }) => {
  const t = useTime(start);
  const { v } = useLayout();
  const wipe = prog(t, 25.6, 26.25);
  const cam = {
    cx: track(t, [[27.0, 720], [27.6, 544], [29.3, 544], [30.9, 560], [32.6, 560]]),
    cy: track(t, [[27.0, 405], [27.6, 530], [29.3, 530], [29.6, 700], [30.9, 1360], [32.6, 1830]]),
    z: track(t, [[27.0, 1], [27.6, 1.32], [29.3, 1.32], [30.9, 0.95], [32.6, 1.18], [34.4, 1.24]]),
  };
  const enter = pop(t, 26.85, 7, 5);

  return (
    <Wipe p={wipe} colors={[LIME, "#0b0f24"]}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 70% 40%, #17205a 0%, #070b1f 65%)", overflow: "hidden" }}>
        {/* moving floor grid */}
        <div style={{
          position: "absolute", left: -600, right: -600, bottom: -300, height: 900, transform: "perspective(500px) rotateX(62deg)",
          backgroundImage: `linear-gradient(${LIME}33 2px, transparent 2px), linear-gradient(90deg, ${LIME}33 2px, transparent 2px)`,
          backgroundSize: "80px 80px", backgroundPosition: `0 ${t * 160}px`,
        }} />
        <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(255,255,255,.025) 0 2px, transparent 2px 5px)" }} />

        <div style={{ position: "absolute", left: v ? 36 : 560, top: v ? 500 : 150, width: VW, perspective: 1600 }}>
          <div style={{
            transform: `translateY(${(1 - enter) * 700}px) rotateX(${(1 - Math.min(enter, 1)) * 35}deg) scale(${v ? 0.7 : 0.92})`, transformOrigin: "0 0",
            boxShadow: `0 0 80px ${LIME}44`, borderRadius: 18,
          }}>
            <Browser dark style={{ position: "relative" }}>
              <Shot src="shots/stats.jpg" pageH={S.height} cam={cam}>
                {BIG.map((b, i) => <Ring key={i} box={b} p={prog(t, 27.7 + i * 0.25, 28.1 + i * 0.25, out) * (1 - prog(t, 29.3, 29.5))} color={LIME} />)}
                {SUB.map((b, i) => <Ring key={i} box={b} p={prog(t, 29.5 + i * 0.2, 29.9 + i * 0.2, out) * (1 - prog(t, 30.9, 31.1))} color={CYAN} />)}
                <Ring box={PR} p={prog(t, 31.1, 31.6, out) * (1 - prog(t, 32.6, 32.8))} color={ORANGE} width={7} />
                <Ring box={PACE} p={prog(t, 32.8, 33.3, out)} color={PINK} width={7} />
              </Shot>
              {/* scanning sweep */}
              <div style={{
                position: "absolute", left: 0, right: 0, height: 120, top: ((t * 500) % (VH + 240)) - 120,
                background: `linear-gradient(transparent, ${LIME}22, transparent)`,
              }} />
            </Browser>
          </div>
        </div>

        {/* call-outs */}
        <div style={{ position: "absolute", left: 60, top: v ? 1210 : 300, width: v ? 960 : 470, display: "flex", flexDirection: "column", gap: 18 }}>
          {CALLOUTS.filter((c) => t >= c.at && t < c.until + 0.3).map((c) => {
            const k = prog(t, c.at, c.at + 0.4, out) * (1 - prog(t, c.until, c.until + 0.3));
            return (
              <div key={c.at} style={{ transform: `translateX(${(1 - k) * -520}px)`, opacity: k, borderLeft: `6px solid ${c.color}`, paddingLeft: 20 }}>
                <div style={{ fontFamily: fonts.slam, fontSize: 104, lineHeight: 0.9, color: c.color, textShadow: `0 0 24px ${c.color}88` }}>{c.big}</div>
                <div style={{ fontFamily: fonts.mono, fontSize: 21, color: "#e7ecff", letterSpacing: 2, fontWeight: 700 }}>{c.label}</div>
              </div>
            );
          })}
        </div>

        <SceneTitle t={t} at={26.05} index="01 / THE NUMBERS" title="STATISTICS" color="#fff" accent={LIME} />
        <UrlChip p={prog(t, 26.6, 27.1, out)} bg={LIME} fg="#070b1f" />
      </AbsoluteFill>
    </Wipe>
  );
};
