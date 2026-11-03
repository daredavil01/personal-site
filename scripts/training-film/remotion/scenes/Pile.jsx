import React from "react";
import {
  AbsoluteFill, random, spring, useCurrentFrame, useVideoConfig,
} from "remotion";
import {
  Kicker, SceneWrap, countTo, fmt, prog,
} from "../parts";
import {
  C, GLOW, LABEL, SERIF,
} from "../theme";

// Every activity as a dot falling into its sport's column, oldest first,
// while the odometer rolls up the kilometres.

const Odometer = ({ value, p, size = 190 }) => {
  const chars = fmt(value).split("");
  const digits = chars.filter((c) => /\d/.test(c)).length;
  let d = 0;
  return (
    <div style={{
      display: "flex", fontFamily: SERIF, fontWeight: 700, fontSize: size, lineHeight: 1.05, color: C.ink, height: size * 1.05, overflow: "hidden", clipPath: "inset(0)", marginTop: 10,
    }}
    >
      {chars.map((c, k) => {
        if (!/\d/.test(c)) return <span key={k}>{c}</span>; // eslint-disable-line react/no-array-index-key
        d += 1;
        // Left columns turn more slowly and settle last, like a real counter.
        const turns = 1 + (digits - d);
        const target = turns * 10 + Number(c);
        const q = Math.min(1, p * (1 + (d - 1) * 0.08));
        const at = q * target;
        return (
          // eslint-disable-next-line react/no-array-index-key
          <span key={k} style={{ display: "inline-block", height: size * 1.05, overflow: "hidden" }}>
            <span style={{ display: "block", transform: `translateY(${-at * size * 1.05}px)` }}>
              {Array.from({ length: target + 1 }, (_, i) => <span key={i} style={{ display: "block", height: size * 1.05 }}>{i % 10}</span>)}
            </span>
          </span>
        );
      })}
    </div>
  );
};

const PER_ROW = 8;
const GAP = 24;

const Pile = ({ data, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fams = data.families;
  const colW = PER_ROW * GAP;
  const space = (1080 - 120 - fams.length * colW) / Math.max(1, fams.length - 1);
  const colX = (j) => 60 + j * (colW + space);
  const BASE = 1390;
  const seen = {};
  const span = Math.max(40, dur * 0.55);
  const dots = data.dots.map((f, k) => {
    const j = fams.findIndex((x) => x.family === f);
    seen[f] = (seen[f] || 0) + 1;
    const n = seen[f] - 1;
    const tx = colX(j) + (n % PER_ROW) * GAP + GAP / 2;
    const ty = BASE - Math.floor(n / PER_ROW) * GAP - GAP / 2;
    const t0 = 14 + (k / data.dots.length) * span;
    const s = spring({
      frame: frame - t0, fps, config: { damping: 11, stiffness: 120, mass: 0.6 },
    });
    const sx = random(`px${k}`) * 1080;
    return {
      k, f, x: sx + (tx - sx) * s, y: -40 + (ty + 40) * s, on: frame >= t0, landed: frame >= t0 + 10,
    };
  });
  const landed = dots.filter((d) => d.landed).length;
  const odo = prog(frame, 6, span + 20);
  return (
    <SceneWrap dur={dur} enter="zoom">
      <AbsoluteFill>
        <div style={{ position: "absolute", left: 80, top: 170 }}>
          <Kicker>Kilometres, all of them</Kicker>
          <Odometer value={data.totals.km} p={odo} />
        </div>
        <div style={{
          position: "absolute", left: 84, top: 520, fontFamily: LABEL, fontWeight: 700, fontSize: 44, color: C.muted,
        }}
        >
          <span style={{ color: C.ink, fontSize: 64 }}>{fmt(landed)}</span>
          {" activities"}
        </div>
        <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
          {dots.filter((d) => d.on).map((d) => (
            <circle key={d.k} cx={d.x} cy={d.y} r={9.5} fill={GLOW[d.f] || C.other} />
          ))}
          <line x1="50" x2="1030" y1={BASE + 4} y2={BASE + 4} stroke={C.line} strokeWidth="3" />
        </svg>
        {fams.map((f, j) => {
          const p = prog(frame, 20 + j * 8 + span * 0.5, 40 + j * 8 + span * 0.5);
          return (
            <div
              key={f.family}
              style={{
                position: "absolute", left: colX(j), width: colW, top: BASE + 24, textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * 30}px)`,
              }}
            >
              <div style={{
                fontFamily: SERIF, fontWeight: 700, fontSize: 64, color: GLOW[f.family] || C.other, lineHeight: 1.1,
              }}
              >
                {countTo(frame, 20 + span * 0.5, 50 + span * 0.5, f.count)}
              </div>
              <div style={{
                fontFamily: LABEL, fontWeight: 700, fontSize: 26, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted,
              }}
              >
                {f.label}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </SceneWrap>
  );
};

export default Pile;
