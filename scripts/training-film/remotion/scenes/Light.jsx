import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  Kicker, Rise, SceneWrap, clamp, prog,
} from "../parts";
import { C, GLOW, LABEL } from "../theme";

// Light painting: the public routes (trimmed 400 m at each end) drawn one
// after another as trails of light, the camera drifting in.

const Light = ({ data, dur }) => {
  const frame = useCurrentFrame();
  const { routes } = data;
  const span = dur * 0.62;
  const zoom = interpolate(frame, [0, dur], [1.02, 1.22], clamp);
  const turn = interpolate(frame, [0, dur], [-3, 2], clamp);
  const lines = routes.map((r, k) => {
    const t0 = 8 + (k / routes.length) * span;
    const p = prog(frame, t0, t0 + 24);
    return { ...r, k, p, fresh: frame >= t0 && frame < t0 + 40 };
  }).filter((r) => r.p > 0);
  const drawn = lines.filter((r) => r.p >= 1).length;
  return (
    <SceneWrap dur={dur} enter="whip">
      <AbsoluteFill>
        <div style={{
          position: "absolute", left: 40, top: 470, width: 1000, height: 1000, transform: `scale(${zoom}) rotate(${turn}deg)`,
        }}
        >
          <svg viewBox="0 0 1000 1000" width="1000" height="1000" style={{ overflow: "visible" }}>
            <defs>
              <filter id="lglow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>
            <g filter="url(#lglow)" style={{ mixBlendMode: "screen" }}>
              {lines.map((r) => (
                <path key={r.k} d={r.d} fill="none" stroke={GLOW[r.fam] || C.other} strokeWidth="7" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - r.p} opacity={r.fresh ? 0.9 : 0.35} />
              ))}
            </g>
            <g style={{ mixBlendMode: "screen" }}>
              {lines.map((r) => (
                <path key={r.k} d={r.d} fill="none" stroke={r.fresh ? "#fff" : GLOW[r.fam] || C.other} strokeWidth={r.fresh ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - r.p} opacity={r.fresh ? 1 : 0.6} />
              ))}
            </g>
          </svg>
        </div>
        <div style={{ position: "absolute", left: 84, right: 84, top: 170 }}>
          <Kicker>Atlas · light painting</Kicker>
          <Rise text="Every route, as light." size={96} delay={6} style={{ marginTop: 16 }} />
        </div>
        <div style={{
          position: "absolute", left: 84, top: 1500, fontFamily: LABEL, fontWeight: 700, fontSize: 34, letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted,
        }}
        >
          <span style={{ color: C.ink, fontSize: 56 }}>{drawn}</span>
          {" routes from home ground"}
        </div>
      </AbsoluteFill>
    </SceneWrap>
  );
};

export default Light;
