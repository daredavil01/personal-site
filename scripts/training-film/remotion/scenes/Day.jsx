import React from "react";
import {
  AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig,
} from "remotion";
import { positionAt } from "../../../../src/lib/dayStory";
import {
  Figure, Kicker, Rise, SceneWrap, clamp, gait, prog,
} from "../parts";
import {
  C, GLOW, LABEL, SERIF,
} from "../theme";

// The hero scene: the longest day replayed on its own clock. Its terrain line
// draws itself; a group of ten walks at the tip; one stays behind at each of
// the day's moments (pickSlots, the page's own rule) until, at the finish,
// they are spread along the whole ridge. The camera rides with the group and
// pulls back to show them all.

const X0 = 60;
const W = 960;
const LOW = 1330;
const HIGH = 330; // terrain height in px

const clock = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};
const date = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});

const Day = ({ data, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = data.day;
  const pts = d.points;
  const endKm = pts[pts.length - 1].km;
  const endAt = pts[pts.length - 1].at;
  const lo = Math.min(...d.terrain.map((q) => q.elev));
  const hi = Math.max(...d.terrain.map((q) => q.elev));
  const xOf = (km) => X0 + (km / endKm) * W;
  const elevAt = (km) => {
    const T = d.terrain;
    for (let k = 1; k < T.length; k += 1) {
      if (km <= T[k].km) {
        const f = (km - T[k - 1].km) / ((T[k].km - T[k - 1].km) || 1);
        return T[k - 1].elev + (T[k].elev - T[k - 1].elev) * f;
      }
    }
    return T[T.length - 1].elev;
  };
  const yOf = (km) => LOW - ((elevAt(km) - lo) / ((hi - lo) || 1)) * HIGH;

  // The activity's clock, played between these frames.
  const A = 18;
  const B = Math.round(dur * 0.8);
  const p = prog(frame, A, B, (x) => x);
  const t = p * endAt;
  const pos = positionAt(pts, t);
  const k0 = Math.max(0, Math.min(pts.length - 2, Math.floor(pos.p)));
  const f0 = Math.max(0, Math.min(1, pos.p - k0));
  const tipKm = pts[k0].km + (pts[k0 + 1].km - pts[k0].km) * f0;
  const tipX = xOf(tipKm);
  const tipY = yOf(tipKm);

  // Slots fill in order as the tip passes them.
  const slots = d.slots.map((s) => {
    const km = pts[s.i].km;
    const reachedAt = A + (pts[s.i].at / endAt) * (B - A);
    return {
      ...s, km, x: xOf(km), y: yOf(km), reachedAt, stayed: frame >= reachedAt,
    };
  });
  const stayed = slots.filter((s) => s.stayed).length;
  const moving = Math.max(0, 10 - stayed);

  // Camera: ride close with the group, then pull back over the last stretch.
  const z = interpolate(frame, [0, A, B - 30, B + 10], [1, 1.85, 1.85, 1], { ...clamp, easing: (x) => x * x * (3 - 2 * x) });
  const m = (z - 1) / 0.85;
  const fx = 540;
  const fy = 1130;
  const ax = tipX + m * (fx - tipX);
  const ay = tipY + m * (fy - tipY);
  const cam = `translate(${ax} ${ay}) scale(${z}) translate(${-tipX} ${-tipY})`;

  // The terrain as a path, and the part drawn so far.
  const line = d.terrain.map((q, k) => `${k ? "L" : "M"}${xOf(q.km).toFixed(1)} ${yOf(q.km).toFixed(1)}`).join("");
  const area = `${line}L${X0 + W} ${LOW + 60}L${X0} ${LOW + 60}Z`;
  const walker = d.walkPose === "run" ? "run" : d.walkPose;
  const color = GLOW[d.family] || C.ink;

  return (
    <SceneWrap dur={dur} enter="zoom">
      <AbsoluteFill>
        <div style={{ position: "absolute", left: 84, right: 84, top: 150 }}>
          <Kicker>A day, replayed</Kicker>
          <Rise text={d.name} size={92} delay={4} style={{ marginTop: 14 }} />
          <div style={{
            fontFamily: LABEL, fontWeight: 700, fontSize: 30, color: C.muted, marginTop: 10, opacity: prog(frame, 10, 24),
          }}
          >
            {`${date(d.date)} · ${d.km} km · ${d.climb} m up`}
          </div>
        </div>
        <div style={{
          position: "absolute", left: 84, right: 84, top: 520, display: "flex", justifyContent: "space-between", alignItems: "flex-end", opacity: prog(frame, 8, 22),
        }}
        >
          <div>
            <div style={{
              fontFamily: SERIF, fontWeight: 700, fontSize: 112, color: C.gold, lineHeight: 1, fontVariantNumeric: "tabular-nums",
            }}
            >
              {clock(t)}
            </div>
            <div style={{
              fontFamily: LABEL, fontWeight: 700, fontSize: 26, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, marginTop: 8,
            }}
            >
              {`km ${tipKm.toFixed(1)}`}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontFamily: SERIF, fontWeight: 700, fontSize: 112, color: C.ink, lineHeight: 1,
            }}
            >
              {moving}
            </div>
            <div style={{
              fontFamily: LABEL, fontWeight: 700, fontSize: 26, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, marginTop: 8,
            }}
            >
              still moving
            </div>
          </div>
        </div>
        <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <linearGradient id="dterr" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.45" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
            <clipPath id="dclip">
              <rect x="0" y="0" width={tipX} height="1920" />
            </clipPath>
            <filter id="dglow"><feGaussianBlur stdDeviation="6" /></filter>
          </defs>
          <g transform={cam}>
            <path d={line} fill="none" stroke={C.line} strokeWidth="3" strokeDasharray="6 8" />
            {[10, 20, 30, 40, 50].filter((km) => km < endKm).map((km) => (
              <g key={km} opacity="0.6">
                <line x1={xOf(km)} x2={xOf(km)} y1={LOW + 30} y2={LOW + 42} stroke={C.muted} strokeWidth="2" />
                <text x={xOf(km)} y={LOW + 70} textAnchor="middle" fill={C.muted} fontFamily={LABEL} fontWeight="700" fontSize="22">{`${km} km`}</text>
              </g>
            ))}
            <g clipPath="url(#dclip)">
              <path d={area} fill="url(#dterr)" />
              <path d={line} fill="none" stroke={color} strokeWidth="10" filter="url(#dglow)" opacity="0.7" />
              <path d={line} fill="none" stroke={color} strokeWidth="4" strokeLinejoin="round" />
            </g>
            {slots.filter((s) => s.stayed).map((s, k) => {
              const settle = spring({ frame: frame - s.reachedAt, fps, config: { damping: 10, stiffness: 160 } });
              const lab = s.label && prog(frame, s.reachedAt + 4, s.reachedAt + 14);
              // Labels alternate high and low so neighbours never sit on each other.
              const nth = slots.filter((x) => x.label && x.i < s.i).length;
              const lift = 80 + (nth % 2) * 56;
              return (
                <g key={s.i}>
                  <Figure pose={s.pose} x={s.x} y={s.y} scale={0.55 + 0.35 * settle} color={k % 2 ? C.ink : color} frame={frame} />
                  {s.label && (
                    <line x1={s.x} x2={s.x} y1={s.y - 62} y2={s.y - lift + 10} stroke={C.gold} strokeWidth="1.5" opacity={lab * 0.7} />
                  )}
                  {s.label && (
                    <g opacity={lab} transform={`translate(${s.x} ${s.y - lift - 12 * lab})`}>
                      <rect x={-s.label.length * 6.5 - 14} y="-26" width={s.label.length * 13 + 28} height="36" rx="18" fill={C.bg} stroke={C.gold} strokeWidth="2" />
                      <text x="0" y="0" textAnchor="middle" fill={C.ink} fontFamily={LABEL} fontWeight="700" fontSize="20">{s.label}</text>
                    </g>
                  )}
                </g>
              );
            })}
            {Array.from({ length: moving }, (_, k) => {
              const km = Math.max(0, tipKm - (k * 0.55 * endKm) / 51);
              const pose = pos.stopped ? "stand" : gait(walker, frame, 5, k * 3);
              return <Figure key={`m${k}`} pose={pose} x={xOf(km) - k * 2} y={yOf(km)} scale={0.9} color={k % 2 ? C.ink : color} frame={frame} />;
            })}
            <circle cx={tipX} cy={tipY} r={7 + 2 * Math.sin(frame / 3)} fill="#fff" opacity={p < 1 ? 1 : 0} />
          </g>
        </svg>
      </AbsoluteFill>
    </SceneWrap>
  );
};

export default Day;
