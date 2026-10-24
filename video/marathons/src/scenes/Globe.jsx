// 0–14 s: a globe in space and the line; the dive into India; a pin per city
// the races were run in, strung together; then the question.
import React from "react";
import { AbsoluteFill } from "remotion";
import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/countries-50m.json";
import { CITY_BEATS, T } from "../timeline";
import { fonts, out, pop, prog, track, useLayout, useTime } from "../kit";
import { CITIES } from "../data";

const LAND = feature(world, world.objects.countries).features;
const INDIA = LAND.find((c) => c.id === "356");
const GRAT = geoGraticule10();
const FOCUS = [75.7, 18.3];

// Seeded stars.
let s = 42;
const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
const STARS = Array.from({ length: 360 }, () => ({ x: rnd() * 1920, y: rnd() * 1920, r: rnd() * 1.8 + 0.3, ph: rnd() * 6 }));

const camera = (t, v) => {
  const lon = track(t, [[0, 5], [5, 52], [7.6, FOCUS[0] + (v ? -0.4 : 0)]]);
  const lat = track(t, [[0, 0], [5, 8], [7.6, FOCUS[1]]]);
  // Zoom in log space so it never lurches.
  const logS = track(t, [[0, Math.log(380)], [4.6, Math.log(430)], [7.6, Math.log(1700)], [10, Math.log(7800)], [13.4, Math.log(8600)], [14, Math.log(40000)]]);
  // Portrait is narrower: pull back so Mumbai to Hyderabad still fits.
  return { lon, lat, scale: Math.exp(logS) * (v && t > 5 ? 0.82 : 1) };
};

const Line = ({ text, t, at, size, color = "#f4efe6", font = fonts.serif, italic = false, max = 1800 }) => {
  const words = text.split(" ");
  return (
    <div style={{ fontFamily: font, fontSize: size, color, fontStyle: italic ? "italic" : "normal", lineHeight: 1.15, textAlign: "center", maxWidth: max }}>
      {words.map((w, i) => {
        const k = prog(t, at + i * 0.09, at + i * 0.09 + 0.6, out);
        return (
          <span key={i} style={{ display: "inline-block", opacity: k, filter: `blur(${(1 - k) * 12}px)`, transform: `translateY(${(1 - k) * 30}px)`, marginRight: size * 0.25 }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const Globe = ({ start }) => {
  const t = useTime(start);
  const { W, H, v } = useLayout();
  const cam = camera(t, v);
  const proj = geoOrthographic().rotate([-cam.lon, -cam.lat]).scale(cam.scale).translate([W / 2, H / 2]).precision(0.3);
  const path = geoPath(proj);
  const at = (c) => proj(c.coord);

  const tagOut = 1 - prog(t, 4.6, 5.4);
  const indiaGlow = prog(t, 5.6, 7.2);
  const qIn = prog(t, T.question, T.question + 0.4, out);
  const dim = 1 - 0.55 * qIn * (1 - prog(t, 13.5, 13.9));
  const flash = prog(t, 13.75, 14);
  const strings = CITIES.flatMap((a, i) => CITIES.slice(i + 1).map((b) => [a, b]));

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 60%, #0e1a3a 0%, #050814 60%, #020308 100%)", overflow: "hidden" }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="atmo">
            <stop offset="80%" stopColor="#4aa3ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4aa3ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sea" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#173a6b" />
            <stop offset="100%" stopColor="#081a36" />
          </radialGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {STARS.map((st, i) => (
          <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#fff" opacity={(0.35 + 0.35 * Math.sin(t * 2 + st.ph)) * (1 - prog(t, 6, 8))} />
        ))}
        <g opacity={dim}>
          {cam.scale < 2500 && <circle cx={W / 2} cy={H / 2} r={cam.scale * 1.12} fill="url(#atmo)" />}
          <path d={path({ type: "Sphere" })} fill="url(#sea)" />
          <path d={path(GRAT)} fill="none" stroke="#3d6aa8" strokeOpacity={0.25} strokeWidth={1} />
          {LAND.map((c) => (
            <path key={c.id || c.properties.name} d={path(c)} fill={c === INDIA ? "#1f4f5e" : "#1a3d4f"} stroke="#5fb3c9" strokeOpacity={0.35} strokeWidth={0.8} />
          ))}
          <path d={path(INDIA)} fill="#f2a33a" fillOpacity={(0.18 + 0.5 * indiaGlow) * (1 - 0.6 * prog(t, 7.6, 9.5))} stroke="#ffcf6b" strokeWidth={1.5 + 2 * indiaGlow} filter="url(#glow)" />
          {/* "a speck": one dot on the planet while the line plays */}
          {t < 5.8 && (() => {
            const [x, y] = proj(CITIES[2].coord) || [0, 0];
            const k = prog(t, 1.4, 2.0) * (1 - prog(t, 5.2, 5.8));
            return <g opacity={k}><circle cx={x} cy={y} r={4} fill="#ffe14d" /><circle cx={x} cy={y} r={6 + ((t * 18) % 22)} fill="none" stroke="#ffe14d" opacity={1 - ((t * 18) % 22) / 22} /></g>;
          })()}

          {/* Strings between every pair of cities. */}
          {strings.map(([a, b], i) => {
            const [x1, y1] = at(a);
            const [x2, y2] = at(b);
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const len = Math.hypot(x2 - x1, y2 - y1);
            const lift = Math.min(160, len * 0.28);
            const cx = mx - ((y2 - y1) / len) * lift;
            const cy = my + ((x2 - x1) / len) * lift;
            const d = `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`;
            const k = prog(t, 8.7 + i * 0.12, 9.6 + i * 0.12, out);
            const dot = ((t - 9.6 - i * 0.12) * 0.6) % 1;
            const bx = (1 - dot) ** 2 * x1 + 2 * (1 - dot) * dot * cx + dot ** 2 * x2;
            const by = (1 - dot) ** 2 * y1 + 2 * (1 - dot) * dot * cy + dot ** 2 * y2;
            return (
              <g key={i}>
                <path d={d} fill="none" stroke="#ffd46b" strokeWidth={3} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - k} filter="url(#glow)" opacity={0.85} />
                {k >= 1 && <circle cx={bx} cy={by} r={6} fill="#fff" filter="url(#glow)" />}
              </g>
            );
          })}

          {CITIES.map((c, i) => {
            const [x, y] = at(c);
            const k = pop(t, CITY_BEATS[i], 12, 7);
            if (k <= 0) return null;
            const ring = ((t - CITY_BEATS[i]) * 0.9) % 1;
            const [lx, ly, anchor] = v && c.name === "Hyderabad" ? [0, 80, "middle"] : c.label;
            return (
              <g key={c.name} transform={`translate(${x} ${y})`}>
                <circle r={14 + ring * 50} fill="none" stroke="#ff6b3d" strokeWidth={3} opacity={(1 - ring) * 0.8} />
                <circle r={13 * k} fill="#ff6b3d" stroke="#fff" strokeWidth={4} filter="url(#glow)" />
                <g transform={`translate(${lx} ${ly}) scale(${Math.min(1, k)})`} opacity={Math.min(1, k * 1.5)}>
                  <text textAnchor={anchor} fontFamily={fonts.slam} fontSize={58} fill="#fff" letterSpacing={2} style={{ paintOrder: "stroke" }} stroke="#050814" strokeWidth={8}>{c.name.toUpperCase()}</text>
                  <text textAnchor={anchor} y={36} fontFamily={fonts.mono} fontSize={24} fill="#ffd46b" style={{ paintOrder: "stroke" }} stroke="#050814" strokeWidth={6}>{c.count} {c.count === 1 ? "race" : "races"}</text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      {/* The line */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 28, opacity: tagOut, paddingBottom: 40 }}>
        <Line text="On a planet this vast," t={t} at={0.4} size={78} max={W - 120} />
        <Line text="we are mostly a speck." t={t} at={1.1} size={78} italic max={W - 120} />
        <div style={{ height: 30 }} />
        <Line text="The journey is what makes us significant." t={t} at={2.7} size={64} color="#ffd46b" max={v ? 760 : W - 120} />
      </AbsoluteFill>

      {/* The question */}
      {t >= T.question && (
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: v ? 320 : 110, opacity: 1 - prog(t, 13.5, 13.8) }}>
          <div style={{
            background: "rgba(255,250,240,.96)", borderRadius: 26, boxShadow: "0 30px 80px rgba(0,0,0,.6)",
            transform: `scale(${0.6 + 0.4 * pop(t, T.question, 10, 6)}) rotate(${-2 + 2 * prog(t, T.question, T.question + 0.6)}deg)`, opacity: qIn,
            display: "flex", alignItems: "center", gap: v ? 12 : 30, maxWidth: W - 80, padding: v ? "30px 40px" : "34px 60px",
          }}>
            <div style={{ fontFamily: fonts.serif, fontSize: v ? 50 : 64, color: "#151515", fontWeight: 700, lineHeight: 1.1 }}>
              {"What connects all these cities".split(" ").map((w, i) => (
                <span key={i} style={{ opacity: prog(t, T.question + 0.15 + i * 0.12, T.question + 0.3 + i * 0.12), marginRight: 16 }}>{w}</span>
              ))}
              <br />
              <span style={{ opacity: prog(t, 12.2, 12.5), fontStyle: "italic", color: "#d9480f" }}>for Sanket</span>
            </div>
            <div style={{
              fontFamily: fonts.slam, fontSize: v ? 150 : 200, color: "#d9480f", lineHeight: 0.8,
              transform: `scale(${pop(t, 12.5, 14, 5)}) rotate(${Math.sin(t * 6) * 8}deg)`,
            }}>?</div>
          </div>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </AbsoluteFill>
  );
};

