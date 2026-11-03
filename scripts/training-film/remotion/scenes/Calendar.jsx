import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import {
  Kicker, SceneWrap, countTo, fmt, prog,
} from "../parts";
import { C, LABEL, SERIF } from "../theme";

// Every day of the log as a cell, filling week by week down the screen; then
// the longest unbroken run lights up cell by cell while its counter climbs.

const CELL = 24;
const GAP = 4;

const Calendar = ({ data, dur }) => {
  const frame = useCurrentFrame();
  const { days, streak, first } = data.calendar;
  const offset = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday first
  const max = Math.max(...days);
  const fillEnd = dur * 0.42;
  const runA = fillEnd + 4;
  const runB = dur * 0.86;
  const rows = Math.ceil((days.length + offset) / 7);
  const gridH = rows * (CELL + GAP);
  const top = Math.max(200, (1520 - gridH) / 2 + 60);
  const left = 96;
  const lit = Math.floor(prog(frame, runA, runB, (x) => x) * streak.length);
  const active = days.filter((v) => v > 0).length;
  return (
    <SceneWrap dur={dur} enter="rise">
      <AbsoluteFill>
        <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <filter id="cglow"><feGaussianBlur stdDeviation="5" /></filter>
          </defs>
          {days.map((v, i) => {
            const at = i + offset;
            const x = left + (at % 7) * (CELL + GAP);
            const y = top + Math.floor(at / 7) * (CELL + GAP);
            const t0 = (i / days.length) * fillEnd;
            const p = prog(frame, t0, t0 + 8);
            const inRun = i >= streak.start && i <= streak.end;
            const on = inRun && i - streak.start < lit;
            const fill = v > 0 ? C.gold : C.line;
            const o = v > 0 ? 0.35 + 0.65 * Math.min(1, Math.sqrt(v / max) * 1.3) : 0.55;
            return (
              // eslint-disable-next-line react/no-array-index-key
              <g key={i} opacity={p}>
                {on && <rect x={x - 3} y={y - 3} width={CELL + 6} height={CELL + 6} rx="7" fill={C.accent} filter="url(#cglow)" opacity="0.8" />}
                <rect x={x} y={y} width={CELL} height={CELL} rx="5" fill={on ? C.accent : fill} opacity={on ? 1 : o * (lit && !inRun ? 0.45 : 1)} transform={`translate(${x + CELL / 2} ${y + CELL / 2}) scale(${0.4 + 0.6 * p}) translate(${-x - CELL / 2} ${-y - CELL / 2})`} />
              </g>
            );
          })}
          {["M", "T", "W", "T", "F", "S", "S"].map((d, k) => (
            // eslint-disable-next-line react/no-array-index-key
            <text key={k} x={left + k * (CELL + GAP) + CELL / 2} y={top - 16} textAnchor="middle" fill={C.muted} fontFamily={LABEL} fontWeight="700" fontSize="20">{d}</text>
          ))}
        </svg>
        <div style={{ position: "absolute", left: 400, right: 70, top: 300 }}>
          <Kicker>The calendar</Kicker>
          <div style={{
            fontFamily: SERIF, fontWeight: 700, fontSize: 150, color: C.ink, lineHeight: 1, marginTop: 20,
          }}
          >
            {fmt(countTo(frame, 4, fillEnd, active))}
          </div>
          <div style={{
            fontFamily: LABEL, fontWeight: 700, fontSize: 30, letterSpacing: "0.16em", textTransform: "uppercase", color: C.gold, marginTop: 8,
          }}
          >
            days on the move
          </div>
          <div style={{ opacity: prog(frame, runA - 6, runA + 8), marginTop: 140 }}>
            <div style={{
              fontFamily: SERIF, fontWeight: 700, fontSize: 210, color: C.accent, lineHeight: 1,
              textShadow: `0 0 ${20 + 20 * prog(frame, runB - 10, runB)}px rgba(255,122,89,0.6)`,
            }}
            >
              {lit}
            </div>
            <div style={{
              fontFamily: LABEL, fontWeight: 700, fontSize: 30, letterSpacing: "0.16em", textTransform: "uppercase", color: C.ink, marginTop: 8,
            }}
            >
              days in a row
            </div>
            {data.calendar.current > 1 && (
              <div style={{
                fontFamily: LABEL, fontSize: 28, color: C.muted, marginTop: 18, opacity: prog(frame, runB - 6, runB + 8),
              }}
              >
                {`The current run: ${data.calendar.current} days`}
              </div>
            )}
          </div>
        </div>
      </AbsoluteFill>
    </SceneWrap>
  );
};

export default Calendar;
