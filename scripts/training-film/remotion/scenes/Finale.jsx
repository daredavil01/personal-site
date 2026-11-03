import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  Figure, Kicker, Rise, SceneWrap, clamp, gait, prog,
} from "../parts";
import {
  C, GLOW, LABEL,
} from "../theme";

// The ten run across the horizon and out of frame; the title and the address
// hold; the last hit lands and the picture fades.

const POSES = ["run", "walk", "run", "hike", "run", "walk", "run", "run", "walk", "run"];
const COLORS = ["run", "walk", "run", "hike", "run", "walk", "run", "run", "hike", "run"];

const Finale = ({ data, dur }) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [dur - 20, dur], [1, 0], clamp);
  const horizon = 1240;
  return (
    <SceneWrap dur={dur + 20} enter="zoom">
      <AbsoluteFill style={{ opacity: fade }}>
        <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <linearGradient id="fsun" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={C.gold} stopOpacity="0.9" />
              <stop offset="1" stopColor={C.accent} stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <circle cx="540" cy={horizon + 40 - 120 * prog(frame, 0, dur * 0.7)} r="210" fill="url(#fsun)" opacity="0.5" />
          <rect x="0" y={horizon} width="1080" height="700" fill={C.bg} />
          <line x1="0" x2="1080" y1={horizon} y2={horizon} stroke={C.gold} strokeWidth="3" opacity="0.8" />
          {POSES.map((pose, k) => {
            const speed = pose === "run" ? 9 : 6;
            const x = -80 - k * 70 + frame * speed;
            return <Figure key={k} pose={gait(pose, frame, pose === "run" ? 4 : 6, k * 2)} x={x} y={horizon} scale={1.7} color={k % 3 ? C.ink : GLOW[COLORS[k]]} frame={frame} />; // eslint-disable-line react/no-array-index-key
          })}
        </svg>
        <div style={{ position: "absolute", left: 84, right: 84, top: 330 }}>
          <Kicker>{`${data.totals.count} activities · ${data.totals.km.toLocaleString("en-GB")} km`}</Kicker>
          <Rise text="Find your day." size={150} delay={6} style={{ marginTop: 22 }} />
        </div>
        <div style={{
          position: "absolute", left: 0, right: 0, top: 1360, textAlign: "center", opacity: prog(frame, 22, 36), transform: `scale(${0.9 + 0.1 * prog(frame, 22, 40)})`,
        }}
        >
          <span style={{
            display: "inline-block", fontFamily: LABEL, fontWeight: 700, fontSize: 50, color: C.bg, background: C.ink, padding: "22px 44px", borderRadius: 999,
          }}
          >
            sankettambare.in/training
          </span>
        </div>
      </AbsoluteFill>
    </SceneWrap>
  );
};

export default Finale;
