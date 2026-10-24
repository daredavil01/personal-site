// 44–56 s, theme "trail map": the default view's filters, played with.
// 21 km → Hyderabad → 2025 narrows to one race; clear, then 50 km.
import React from "react";
import { AbsoluteFill } from "remotion";
import { CLICKS } from "../timeline";
import { Browser, Cursor, fonts, out, pop, prog, Ring, SceneTitle, Shot, toView, track, UrlChip, useLayout, useTime, Wipe, VW } from "../kit";
import { RACES, SHOTS } from "../data";

const FOREST = "#1f5b3a";
const EMBER = "#ff6b35";
const D = SHOTS.default;
const SEL = D.default.selects; // year, city, distance
const OPTS = D.default.options;
const RESULT = { x: 32, y: 822, w: 325, h: 712 };
const CLEAR = { x: 470, y: 668, w: 62, h: 24 };
const mid = (b) => [b.x + b.w / 2, b.y + b.h / 2];
const ITEM = 30;
const optAt = (s, i) => [SEL[s].x + 50, SEL[s].y + SEL[s].h + 4 + 8 + i * ITEM + ITEM / 2];

const SCREENS = [
  [0, "default"],
  [CLICKS.distancePick, "filter-21"],
  [CLICKS.cityPick, "filter-21-hyd"],
  [CLICKS.yearPick, "filter-21-hyd-2025"],
  [CLICKS.clear, "default"],
  [CLICKS.distance2Pick, "filter-50"],
];

// [select, opened at, picked at, option index]
const DROPS = [
  [2, CLICKS.distance, CLICKS.distancePick, OPTS[2].indexOf("21 km")],
  [1, CLICKS.city, CLICKS.cityPick, OPTS[1].indexOf("Hyderabad")],
  [0, CLICKS.year, CLICKS.yearPick, OPTS[0].indexOf("2025")],
  [2, CLICKS.distance2, CLICKS.distance2Pick, OPTS[2].indexOf("50 km")],
];

const km = (r) => parseInt(r.distance, 10);
const city = (r) => r.place.split(",").pop().trim();
const year = (r) => String(new Date(r.date).getFullYear());
const n21 = RACES.filter((r) => km(r) === 21);
const nHyd = n21.filter((r) => city(r) === "Hyderabad");
const n2025 = nHyd.filter((r) => year(r) === "2025");
const n50 = RACES.filter((r) => km(r) === 50);

const Contours = ({ t }) => (
  <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
    {Array.from({ length: 14 }, (_, i) => {
      const r = 80 + i * 70;
      const pts = Array.from({ length: 49 }, (_, k) => {
        const a = (k / 48) * Math.PI * 2;
        const rr = r + 26 * Math.sin(a * 3 + i * 0.7 + t * 0.3) + 14 * Math.sin(a * 5 - i);
        return `${k ? "L" : "M"}${(300 + Math.cos(a) * rr * 1.3).toFixed(1)} ${(820 + Math.sin(a) * rr).toFixed(1)}`;
      }).join(" ");
      return <path key={i} d={`${pts} Z`} fill="none" stroke={FOREST} strokeOpacity={i % 5 === 0 ? 0.32 : 0.14} strokeWidth={i % 5 === 0 ? 3 : 2} />;
    })}
    <path d="M60 140 C 400 300, 700 60, 1100 220 S 1700 120, 1900 300" fill="none" stroke={EMBER} strokeWidth="5" strokeDasharray="4 16" strokeLinecap="round" strokeDashoffset={-t * 40} opacity="0.6" />
  </svg>
);

const Dropdown = ({ t, s, at, pick, target }) => {
  if (t < at || t > pick + 0.2) return null;
  const k = prog(t, at, at + 0.18, out) * (1 - prog(t, pick + 0.05, pick + 0.2));
  const hi = Math.round(track(t, [[at + 0.2, 0], [pick - 0.15, target]]));
  const b = SEL[s];
  return (
    <div style={{
      position: "absolute", left: b.x, top: b.y + b.h + 4, width: Math.max(170, b.w + 30), padding: "8px 0", background: "#fff", borderRadius: 10,
      boxShadow: "0 18px 40px rgba(0,0,0,.25)", border: "1px solid #ddd", transformOrigin: "top", transform: `scaleY(${k})`, opacity: k,
      fontFamily: fonts.ui, fontSize: 14,
    }}>
      {OPTS[s].map((o, i) => (
        <div key={o} style={{
          height: ITEM, lineHeight: `${ITEM}px`, padding: "0 14px", textTransform: "uppercase", letterSpacing: 1,
          background: i === hi ? (t > pick ? EMBER : FOREST) : "transparent", color: i === hi ? "#fff" : "#333", fontWeight: i === hi ? 700 : 400,
        }}>{o}</div>
      ))}
    </div>
  );
};

const Stamp = ({ t, at, text, sub, box }) => {
  const k = pop(t, at, 14, 9);
  if (k <= 0) return null;
  return (
    <div style={{
      position: "absolute", left: box.x + 20, top: box.y + 230, width: box.w - 40, padding: "10px 0", textAlign: "center",
      border: `7px solid ${EMBER}`, borderRadius: 12, color: EMBER, background: "rgba(255,255,255,.85)", fontFamily: fonts.slam,
      transform: `rotate(-11deg) scale(${3 - 2 * Math.min(k, 1.05)})`, opacity: Math.min(1, k * 2),
    }}>
      <div style={{ fontSize: 64, lineHeight: 0.95 }}>{text}</div>
      <div style={{ fontSize: 30, letterSpacing: 2 }}>{sub}</div>
    </div>
  );
};

const Chip = ({ t, at, until, children, color = FOREST }) => {
  const k = pop(t, at, 12, 8) * (1 - prog(t, until, until + 0.25));
  if (k <= 0) return null;
  return (
    <div style={{
      padding: "12px 24px", borderRadius: 40, background: color, color: "#fff", fontFamily: fonts.mono, fontWeight: 700, fontSize: 30,
      transform: `scale(${k})`, transformOrigin: "left", alignSelf: "flex-start", boxShadow: "0 10px 24px rgba(0,0,0,.2)",
    }}>{children}</div>
  );
};

export const Default = ({ start }) => {
  const t = useTime(start);
  const { v } = useLayout();
  const wipe = prog(t, 43.6, 44.25);
  const enter = pop(t, 44.6, 8, 5);
  const cam = {
    cx: track(t, [[44.5, 720], [45.0, 420]]),
    cy: track(t, [[44.5, 405], [45.0, 690], [51.0, 690], [51.6, 1000], [52.2, 1000], [52.6, 720], [54.2, 720], [54.7, 1000]]),
    // Portrait shows the frame smaller, so the camera leans in.
    z: track(t, [[44.5, 1], [45.0, 1.45], [51.0, 1.45], [51.6, 0.95], [52.2, 0.95], [52.6, 1.4], [54.2, 1.4], [54.7, 0.95], [56, 1.0]]) * (v && t > 44.5 ? 1.2 : 1),
  };
  const page = (tt) => track(tt, [
    [44.4, 700], [44.9, mid(SEL[2])[0]], [45.85, optAt(2, DROPS[0][3])[0]], [47.25, mid(SEL[1])[0]], [48.25, optAt(1, DROPS[1][3])[0]],
    [49.65, mid(SEL[0])[0]], [50.65, optAt(0, DROPS[2][3])[0]], [51.4, 230], [52.45, mid(CLEAR)[0]], [53.15, mid(SEL[2])[0]], [53.95, optAt(2, DROPS[3][3])[0]], [54.8, 230],
  ]);
  const pageY = (tt) => track(tt, [
    [44.4, 400], [44.9, mid(SEL[2])[1]], [45.85, optAt(2, DROPS[0][3])[1]], [47.25, mid(SEL[1])[1]], [48.25, optAt(1, DROPS[1][3])[1]],
    [49.65, mid(SEL[0])[1]], [50.65, optAt(0, DROPS[2][3])[1]], [51.4, 1150], [52.45, mid(CLEAR)[1]], [53.15, mid(SEL[2])[1]], [53.95, optAt(2, DROPS[3][3])[1]], [54.8, 1150],
  ]);
  const [cx, cy] = toView(cam, page(t), pageY(t));

  const shown = SCREENS.filter(([at]) => t >= at);
  const cur = shown[shown.length - 1];
  const prev = shown[shown.length - 2];
  const fade = prog(t, cur[0], cur[0] + 0.2);

  return (
    <Wipe p={wipe} colors={[EMBER, FOREST]}>
      <AbsoluteFill style={{ background: "#eef2df", overflow: "hidden" }}>
        <Contours t={t} />

        <div style={{ position: "absolute", left: v ? 36 : 540, top: v ? 500 : 170, width: VW, perspective: 1800 }}>
          <div style={{ transform: `translateX(${(1 - enter) * -1900}px) rotateY(${(1 - Math.min(1, enter)) * 40}deg) scale(${v ? 0.7 : 0.92})`, transformOrigin: "0 0" }}>
            <Browser style={{ position: "relative", boxShadow: `0 40px 100px rgba(31,91,58,.45), 0 0 0 4px ${FOREST}` }}>
              {prev && fade < 1 && <Shot src={`shots/${prev[1]}.jpg`} pageH={D[prev[1]].height} cam={cam} />}
              <Shot src={`shots/${cur[1]}.jpg`} pageH={D[cur[1]].height} cam={cam} opacity={prev ? fade : 1}>
                {DROPS.map(([s, at, pick, target]) => <Dropdown key={at} t={t} s={s} at={at} pick={pick} target={target} />)}
                <Ring box={RESULT} p={prog(t, 51.2, 51.6, out) * (1 - prog(t, 52.3, 52.5))} color={EMBER} width={6} glow={false} />
                <Ring box={RESULT} p={prog(t, 54.5, 54.9, out)} color={EMBER} width={6} glow={false} />
                {t < CLICKS.clear && <Stamp t={t} at={51.7} text={`${n2025[0]?.time.replace(/^0/, "")}`} sub="FIRST SUB-2 HALF" box={RESULT} />}
                {t > CLICKS.distance2Pick && <Stamp t={t} at={54.9} text="FIRST ULTRA" sub={`50 KM · ${n50[0]?.time}`} box={RESULT} />}
              </Shot>
              {t > 44.4 && <Cursor x={cx} y={cy} t={t} clicks={Object.entries(CLICKS).filter(([k]) => !/card|next/.test(k)).map(([, v]) => v)} color={EMBER} />}
            </Browser>
          </div>
        </div>

        {/* the active filters, as chips */}
        <div style={{ position: "absolute", left: 60, top: v ? 1210 : 320, width: v ? 960 : 440, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 22, color: FOREST, letterSpacing: 4, fontWeight: 700, opacity: prog(t, 45.8, 46.2) }}>FILTERS</div>
          <Chip t={t} at={CLICKS.distancePick} until={CLICKS.clear}>21 KM · {n21.length} races</Chip>
          <Chip t={t} at={CLICKS.cityPick} until={CLICKS.clear}>HYDERABAD · {nHyd.length}</Chip>
          <Chip t={t} at={CLICKS.yearPick} until={CLICKS.clear} color={EMBER}>2025 · {n2025.length} race</Chip>
          <Chip t={t} at={CLICKS.distance2Pick} until={60} color={EMBER}>50 KM · {n50.length} race</Chip>
        </div>

        <SceneTitle t={t} at={43.85} hold={0.6} index="03 / FIND ANY RACE" title="DEFAULT VIEW" color={FOREST} accent={EMBER} />
        <UrlChip p={1} bg={FOREST} fg="#fff" />
      </AbsoluteFill>
    </Wipe>
  );
};
