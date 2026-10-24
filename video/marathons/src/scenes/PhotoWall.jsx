// 14–20 s: the answer. One photo per race pops onto the screen on the beat
// until the wall is full, then the word slams across it.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { PHOTO_BEATS, T } from "../timeline";
import { fonts, out, pop, prog, track, useLayout, useTime } from "../kit";
import { PHOTOS, STATS } from "../data";

// 24 cells either way: 6×4 landscape, 4×6 portrait.
const CELLS = 24;

let s = 7;
const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
// A shuffled cell for each photo, plus its flight in.
const ORDER = Array.from({ length: CELLS }, (_, i) => i).sort(() => rnd() - 0.5);
const CARDS = PHOTOS.slice(0, CELLS).map((r, i) => ({
  race: r,
  cell: ORDER[i],
  rot: (rnd() - 0.5) * 7,
  from: [(rnd() - 0.5) * 1400, (rnd() - 0.5) * 900],
  spin: (rnd() - 0.5) * 60,
}));

const Count = ({ t, at, to, label, size = 120 }) => {
  const k = prog(t, at, at + 0.9, out);
  return (
    <div style={{ textAlign: "center", opacity: prog(t, at, at + 0.2) }}>
      <div style={{ fontFamily: fonts.slam, fontSize: size, color: "#ffe14d", lineHeight: 0.9 }}>{Math.round(to * k)}</div>
      <div style={{ fontFamily: fonts.mono, fontSize: 24, color: "#fff", letterSpacing: 4 }}>{label}</div>
    </div>
  );
};

export const PhotoWall = ({ start }) => {
  const t = useTime(start);
  const { W, H, v } = useLayout();
  const COLS = v ? 4 : 6;
  const CW = W / COLS;
  const CH = H / (CELLS / COLS);
  const zoom = track(t, [[T.drop, 1.15], [17.3, 1], [20, 1.07]]);
  const word = pop(t, 17.45, 11, 7);
  const shake = t > 17.45 && t < 17.8 ? Math.sin(t * 90) * 14 * (1 - prog(t, 17.45, 17.8)) : 0;
  const shade = prog(t, 17.4, 17.7) * 0.62;

  return (
    <AbsoluteFill style={{ background: "#111", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom}) rotate(${(zoom - 1) * 8}deg) translate(${shake}px, ${shake * 0.5}px)` }}>
        {CARDS.map((c, i) => {
          const at = PHOTO_BEATS[i];
          const k = pop(t, at, 13, 8);
          if (k <= 0) return null;
          const col = c.cell % COLS;
          const row = Math.floor(c.cell / COLS);
          const land = Math.min(1, prog(t, at, at + 0.35, out));
          const x = col * CW + c.from[0] * (1 - land);
          const y = row * CH + c.from[1] * (1 - land);
          const flash = 1 - prog(t, at, at + 0.25);
          return (
            <div key={c.race.id} style={{
              position: "absolute", left: x - 6, top: y - 6, width: CW + 12, height: CH + 12,
              transform: `scale(${0.2 + 0.8 * k}) rotate(${c.rot + c.spin * (1 - land)}deg)`,
              background: "#fbf7ef", padding: 8, boxShadow: "0 18px 40px rgba(0,0,0,.55)", zIndex: i,
            }}>
              <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
                <Img src={staticFile(c.race.photo)} style={{
                  width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 25%",
                  transform: `scale(${1.15 - 0.1 * prog(t, at, at + 4)})`, filter: `brightness(${1 + flash * 1.5})`,
                }} />
                <div style={{
                  position: "absolute", left: 10, bottom: 8, fontFamily: fonts.mono, fontWeight: 700, fontSize: 17, color: "#fff",
                  background: "rgba(0,0,0,.55)", padding: "3px 9px", borderRadius: 6,
                }}>
                  {new Date(c.race.date).getFullYear()} · {c.race.distance.replace(/\s*kms?/i, "K")}
                </div>
              </div>
            </div>
          );
        })}
      </AbsoluteFill>

      <AbsoluteFill style={{ background: `linear-gradient(135deg, rgba(217,72,15,${shade}), rgba(10,10,10,${shade + 0.1}))` }} />
      {word > 0 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 10 }}>
          <div style={{
            fontFamily: fonts.slam, fontSize: v ? 250 : 330, color: "#fff", lineHeight: 0.85, letterSpacing: 6,
            transform: `scale(${3 - 2 * Math.min(1.04, word)})`, opacity: Math.min(1, word * 2),
            textShadow: "0 20px 60px rgba(0,0,0,.6)",
          }}>
            RUNNING<span style={{ color: "#ffe14d" }}>.</span>
          </div>
          <div style={{ display: "flex", gap: v ? 44 : 90, marginTop: 10 }}>
            <Count t={t} at={18.1} to={STATS.races} label="RACES" size={v ? 96 : 120} />
            <Count t={t} at={18.3} to={STATS.km} label="KM" size={v ? 96 : 120} />
            <Count t={t} at={18.5} to={STATS.cities} label="CITIES" size={v ? 96 : 120} />
            <Count t={t} at={18.7} to={STATS.years} label="YEARS" size={v ? 96 : 120} />
          </div>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: "#fff", opacity: 1 - prog(t, T.drop, T.drop + 0.3) }} />
    </AbsoluteFill>
  );
};
