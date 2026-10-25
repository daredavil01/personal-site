// 0–8 s: a terminal line, then every project's cover pops onto the screen,
// then the caption.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Hud, fonts, LIME, INK, prog, pop, rand, out, useTime, Typed, Glitch } from "../kit";
import { COVERS, STATS } from "../data";
import { T, POP_STEP } from "../timeline";

const COLS = 4;
const CELL_W = 1080 / COLS;
const ROWS = Math.ceil(COVERS.length / COLS);
const CELL_H = 1500 / ROWS;

// Cell order is shuffled so neighbours do not pop one after another.
const ORDER = COVERS.map((_, i) => i).sort((a, b) => rand(a, 9) - rand(b, 9));

export const Intro = ({ start }) => {
  const t = useTime(start);
  const zoom = 1 + 0.08 * prog(t, T.collage, T.stats);
  const dim = 1 - 0.65 * prog(t, T.caption - 0.1, T.caption + 0.3);
  const capIn = (k) => prog(t, T.caption + k * 0.25, T.caption + k * 0.25 + 0.35, out);
  const term = 1 - prog(t, T.collage - 0.1, T.collage + 0.3);

  return (
    <Glitch t={t} at={T.stats - 0.25} len={0.25}>
      <Hud t={t}>
        {/* Terminal */}
        <div style={{
          position: "absolute", left: 80, right: 80, top: 760, fontFamily: fonts.mono, fontSize: 44, color: "#e8f0ff",
          opacity: term, lineHeight: 1.6,
        }}>
          <div><span style={{ color: LIME }}>$ </span><Typed t={t} at={0.15} text="open sankettambare.in/projects" cps={34} cursor={t < 1.05} /></div>
          {t > 1.05 && (
            <div style={{ color: "#8b97b5", fontSize: 34 }}>
              loading {Math.round(STATS.projects * prog(t, 1.05, 1.45))} projects
              <div style={{ marginTop: 18, height: 10, background: "#ffffff14", borderRadius: 5 }}>
                <div style={{ height: 10, width: `${100 * prog(t, 1.05, 1.45)}%`, background: LIME, borderRadius: 5, boxShadow: `0 0 20px ${LIME}` }} />
              </div>
            </div>
          )}
        </div>

        {/* Collage */}
        <AbsoluteFill style={{ transform: `scale(${zoom})`, opacity: dim, top: 210 }}>
          {COVERS.map((p, k) => {
            const i = ORDER[k];
            const at = T.collage + k * POP_STEP;
            const s = pop(t, at);
            if (s <= 0) return null;
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const w = CELL_W * (1.18 + rand(i, 2) * 0.3);
            const h = w * 0.62;
            const flash = 1 - prog(t, at, at + 0.25);
            return (
              <div key={p.id} style={{
                position: "absolute", width: w, height: h,
                left: col * CELL_W + CELL_W / 2 - w / 2 + (rand(i, 3) - 0.5) * 50,
                top: row * CELL_H + CELL_H / 2 - h / 2 + (rand(i, 4) - 0.5) * 40,
                transform: `scale(${s}) rotate(${(rand(i, 5) - 0.5) * 14}deg)`,
                zIndex: k, borderRadius: 14, overflow: "hidden", border: "4px solid #f4f7ff",
                boxShadow: "0 24px 60px rgba(0,0,0,.6)", background: "#111",
              }}>
                <Img src={staticFile(p.cover)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                <div style={{ position: "absolute", inset: 0, background: LIME, opacity: flash * 0.8, mixBlendMode: "screen" }} />
                <div style={{
                  position: "absolute", left: 0, right: 0, bottom: 0, padding: "6px 10px", fontFamily: fonts.mono, fontSize: 17,
                  fontWeight: 700, color: "#fff", background: "linear-gradient(transparent, rgba(0,0,0,.85))", whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis",
                }}>{p.title}</div>
              </div>
            );
          })}
        </AbsoluteFill>

        {/* Caption */}
        {t > T.caption && (
          <div style={{ position: "absolute", left: 70, right: 70, top: 640, fontFamily: fonts.slam, color: "#fff", lineHeight: 0.92 }}>
            {["HERE'S WHAT", "SANKET", "HAS BUILT", "SO FAR."].map((line, k) => (
              <div key={line} style={{
                fontSize: k === 1 ? 230 : 150, opacity: capIn(k), transform: `translateY(${(1 - capIn(k)) * 60}px)`,
                color: k === 1 ? INK : "#fff", textShadow: k === 1 ? "none" : "0 10px 40px rgba(0,0,0,.6)",
              }}>
                <span style={{
                  display: "inline-block", lineHeight: k === 1 ? 0.86 : 0.92, margin: k === 1 ? "18px 0 14px" : 0,
                  background: k === 1 ? LIME : "transparent", padding: k === 1 ? "14px 18px 0" : 0,
                  boxShadow: k === 1 ? `0 0 60px ${LIME}88` : "none",
                }}>{line}</span>
              </div>
            ))}
            <div style={{
              marginTop: 40, fontFamily: fonts.mono, fontSize: 36, color: LIME, opacity: capIn(4),
            }}>
              {STATS.projects} projects · {STATS.from} → {STATS.to}
            </div>
          </div>
        )}
      </Hud>
    </Glitch>
  );
};
