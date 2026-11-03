import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import {
  Body, Kicker, Rise, SceneWrap, prog,
} from "../parts";
import { C } from "../theme";

// A heartbeat drawing itself across the night, then the title.

const month = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

// One ECG beat, 180 px wide, baseline at 0.
const BEAT = "l40 0 l10 -14 l10 14 l12 0 l6 22 l10 -150 l10 168 l8 -40 l14 0 l14 -26 l16 26 l30 0";

const Pulse = ({ data, dur }) => {
  const frame = useCurrentFrame();
  const draw = prog(frame, 0, Math.min(70, dur * 0.6));
  const d = `M-20 820 ${Array.from({ length: 7 }, () => BEAT).join(" ")}`;
  const glow = 0.6 + 0.4 * Math.sin(frame / 4);
  return (
    <SceneWrap dur={dur} enter="drop">
      <AbsoluteFill>
        <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <filter id="pglow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
          </defs>
          <path d={d} fill="none" stroke={C.accent} strokeWidth="14" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} filter="url(#pglow)" opacity={0.7 * glow} />
          <path d={d} fill="none" stroke={C.accent} strokeWidth="5" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
        </svg>
        <div style={{ position: "absolute", left: 90, right: 90, top: 280 }}>
          <Kicker delay={12}>{`Strava · ${month(data.calendar.first)} – ${month(data.calendar.last)}`}</Kicker>
        </div>
        <div style={{ position: "absolute", left: 84, right: 60, top: 1000 }}>
          <Rise text="Training." size={210} delay={26} stagger={0} />
          <Body style={{ marginTop: 30, fontSize: 44 }}>
            <span style={{ opacity: prog(frame, 50, 70) }}>One watch. Every heartbeat. </span>
            <span style={{ opacity: prog(frame, 64, 84), color: C.ink }}>Every step.</span>
          </Body>
        </div>
      </AbsoluteFill>
    </SceneWrap>
  );
};

export default Pulse;
