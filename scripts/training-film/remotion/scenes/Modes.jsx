import React from "react";
import {
  AbsoluteFill, Easing, Img, spring, staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";
import { Kicker, SceneWrap, prog } from "../parts";
import { C, LABEL } from "../theme";

// Two ways in: the real page at phone size (capture.mjs), atlas and classic,
// swinging in on either side and scrolling; the classic tabs light up in turn.

const PW = 380;
const PH = 790;
const TABS = ["Overview", "Log", "Calendar", "Facts", "Stats & PRs", "Routes"];

const Phone = ({
  shot, x, from, turn, delay, scroll, label,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 90 } });
  const imgH = (PW - 28) * (7200 / 828);
  return (
    <div style={{
      position: "absolute",
      left: x - PW / 2 + (1 - s) * from,
      top: 470,
      width: PW,
      height: PH,
      transform: `perspective(1800px) rotateY(${turn * (1 - 0.4 * s)}deg) rotateZ(${(1 - s) * turn * 0.4}deg)`,
      opacity: Math.min(1, s * 1.4),
    }}
    >
      <div style={{
        fontFamily: LABEL, fontWeight: 700, fontSize: 28, letterSpacing: "0.2em", textTransform: "uppercase", color: C.gold, textAlign: "center", marginBottom: 18,
      }}
      >
        {label}
      </div>
      <div style={{
        width: PW, height: PH, borderRadius: 52, background: "#05070c", padding: 14, boxShadow: "0 40px 90px rgba(0,0,0,0.6), 0 0 0 2px #2a3550 inset",
      }}
      >
        <div style={{
          width: "100%", height: "100%", borderRadius: 40, overflow: "hidden", position: "relative", background: C.bg,
        }}
        >
          <Img src={staticFile(shot)} style={{ width: "100%", height: imgH, transform: `translateY(${-scroll * (imgH - PH + 28)}px)` }} />
        </div>
      </div>
    </div>
  );
};

const Modes = ({ dur }) => {
  const frame = useCurrentFrame();
  const scroll = prog(frame, 16, dur - 6, Easing.inOut(Easing.cubic)) * 0.62;
  const tabAt = (k) => 22 + k * ((dur - 40) / TABS.length);
  const active = TABS.reduce((acc, _, k) => (frame >= tabAt(k) ? k : acc), -1);
  return (
    <SceneWrap dur={dur} enter="whip">
      <AbsoluteFill>
        <div style={{ position: "absolute", left: 84, right: 84, top: 160 }}>
          <Kicker>Two ways in</Kicker>
          <div style={{
            fontFamily: "'Noto Serif', serif", fontWeight: 700, fontSize: 84, color: C.ink, lineHeight: 1.05, marginTop: 14, opacity: prog(frame, 4, 18),
          }}
          >
            A story to watch.
            <br />
            <span style={{ color: C.muted }}>Tabs to dig through.</span>
          </div>
        </div>
        <Phone shot="shot-atlas.jpg" label="Atlas" x={300} from={-700} turn={16} delay={4} scroll={scroll} />
        <Phone shot="shot-classic.jpg" label="Classic" x={780} from={700} turn={-16} delay={10} scroll={scroll * 0.9} />
        <div style={{
          position: "absolute", left: 60, right: 60, top: 1340, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14,
        }}
        >
          {TABS.map((t, k) => {
            const on = k === active;
            const p = prog(frame, 14 + k * 2, 24 + k * 2);
            return (
              <span
                key={t}
                style={{
                  fontFamily: LABEL,
                  fontWeight: 700,
                  fontSize: 30,
                  padding: "12px 24px",
                  borderRadius: 999,
                  background: on ? C.ink : "rgba(255,255,255,0.06)",
                  color: on ? C.bg : C.muted,
                  border: `2px solid ${on ? C.ink : C.line}`,
                  transform: `translateY(${(1 - p) * 30}px) scale(${on ? 1.08 : 1})`,
                  opacity: p,
                }}
              >
                {t}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    </SceneWrap>
  );
};

export default Modes;
