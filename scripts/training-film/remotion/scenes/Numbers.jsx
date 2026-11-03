import React from "react";
import {
  AbsoluteFill, Easing, interpolate, useCurrentFrame,
} from "remotion";
import {
  Kicker, SceneWrap, clamp, countTo, fmt, prog,
} from "../parts";
import { C, LABEL, SERIF } from "../theme";

// Five facts, one slam each, on the beat the score hits: the inventory, the
// steps, the hour, the day of the week and the climb. Every number is the
// Facts tab's own (src/lib/trainingFacts.js), read when the film renders.

const Big = ({ children, color = C.ink, size = 190 }) => (
  <div style={{
    fontFamily: SERIF, fontWeight: 700, fontSize: size, lineHeight: 1, color, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums",
  }}
  >
    {children}
  </div>
);
const Label = ({ children, color = C.muted }) => (
  <div style={{
    fontFamily: LABEL, fontWeight: 700, fontSize: 32, letterSpacing: "0.16em", textTransform: "uppercase", color, marginTop: 14,
  }}
  >
    {children}
  </div>
);

/** A card's life: slam in, hold, leave upwards. */
const Card = ({
  a, b, children,
}) => {
  const frame = useCurrentFrame();
  // Out before the next card lands, so two never share the screen.
  if (frame < a || frame >= b) return null;
  const i = prog(frame, a, a + 9, Easing.out(Easing.back(1.6)));
  const o = prog(frame, b - 7, b, Easing.in(Easing.cubic));
  return (
    <AbsoluteFill style={{
      transform: `scale(${1.5 - 0.5 * i}) translateY(${-o * 260}px)`, opacity: Math.min(1, i * 1.5) * (1 - o), filter: `blur(${(1 - Math.min(1, i)) * 14 + o * 12}px)`,
    }}
    >
      {children}
    </AbsoluteFill>
  );
};

const Numbers = ({ data, dur, scene }) => {
  const frame = useCurrentFrame();
  const n = data.numbers;
  // Card starts follow the narration (render.mjs); evenly spaced without it.
  const starts = scene?.cards?.length === 5 ? scene.cards : [0, 1, 2, 3, 4].map((k) => Math.round((k * dur) / 5));
  const at = (k) => (k < 5 ? starts[k] : dur);
  const step = 50; // frames a card's own motion takes
  const hoursMax = Math.max(1, ...n.hours);
  const peak = n.hours.indexOf(hoursMax);
  const order = [1, 2, 3, 4, 5, 6, 0];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const wkMax = Math.max(1, ...n.weekdayKm);
  const top = n.weekdayKm.indexOf(wkMax);
  const share = Math.round((wkMax / n.weekdayKm.reduce((s, v) => s + v, 0)) * 100);
  const climb = n.climb?.n || data.totals.climb;
  const EVEREST = 8849;
  return (
    <SceneWrap dur={dur} enter="drop">
      <AbsoluteFill>
        <div style={{ position: "absolute", left: 84, top: 160 }}>
          <Kicker>By the numbers</Kicker>
        </div>
        <div style={{ position: "absolute", right: 84, top: 166, display: "flex", gap: 12 }}>
          {[0, 1, 2, 3, 4].map((k) => (
            <span key={k} style={{
              width: 44, height: 8, borderRadius: 4, background: frame >= at(k) ? C.gold : C.line,
            }}
            />
          ))}
        </div>

        {/* 1 · the inventory */}
        <Card a={at(0)} b={at(1)}>
          <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
            {Array.from({ length: n.variableCount }, (_, k) => {
              const p = prog(frame, at(0) + 4 + k * 0.6, at(0) + 12 + k * 0.6);
              const x = 120 + (k % 11) * 78;
              const y = 980 + Math.floor(k / 11) * 78;
              const isFact = k < n.factCount;
              const q = prog(frame, at(0) + step * 0.55, at(0) + step * 0.8);
              return (
                // eslint-disable-next-line react/no-array-index-key
                <rect key={k} x={x} y={y} width="56" height="56" rx="14" fill={isFact ? (q > 0 ? C.gold : C.ink) : C.line} opacity={p * (isFact ? 0.4 + 0.6 * q : 0.6)} transform={`rotate(${(1 - p) * 45} ${x + 28} ${y + 28})`} />
              );
            })}
          </svg>
          <div style={{ position: "absolute", left: 84, right: 84, top: 420 }}>
            <Big>{countTo(frame, at(0), at(0) + step * 0.5, n.variableCount)}</Big>
            <Label>variables, recorded</Label>
            <div style={{ opacity: prog(frame, at(0) + step * 0.5, at(0) + step * 0.7), marginTop: 18 }}>
              <Big color={C.gold} size={110}>{`→ ${n.factCount} facts`}</Big>
            </div>
          </div>
        </Card>

        {/* 2 · steps */}
        <Card a={at(1)} b={at(2)}>
          <div style={{ position: "absolute", left: 60, right: 60, top: 520, textAlign: "center" }}>
            <Big size={170}>{fmt(countTo(frame, at(1), at(1) + step * 0.75, n.steps?.n || 0))}</Big>
            <Label color={C.gold}>steps</Label>
            <Label>{n.steps?.detail || ""}</Label>
          </div>
          <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
            {Array.from({ length: 14 }, (_, k) => {
              const p = prog(frame, at(1) + k * 2.6, at(1) + k * 2.6 + 6);
              const x = 90 + k * 68;
              const y = 1180 + (k % 2 ? 54 : 0);
              return (
                // eslint-disable-next-line react/no-array-index-key
                <g key={k} opacity={p * (0.35 + 0.65 * (k / 14))} transform={`translate(${x} ${y}) rotate(90) scale(1.5)`}>
                  <ellipse cx="0" cy="0" rx="13" ry="22" fill={C.ink} />
                  <circle cx="-6" cy="-32" r="5" fill={C.ink} />
                  <circle cx="5" cy="-31" r="4.5" fill={C.ink} />
                </g>
              );
            })}
          </svg>
        </Card>

        {/* 3 · the hour */}
        <Card a={at(2)} b={at(3)}>
          <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
            <defs><filter id="nglow"><feGaussianBlur stdDeviation="8" /></filter></defs>
            {n.hours.map((v, h) => {
              const ang = (h / 24) * Math.PI * 2 - Math.PI / 2;
              const g = prog(frame, at(2) + h * 0.7, at(2) + h * 0.7 + 14);
              const r0 = 170;
              const r1 = r0 + 20 + (v / hoursMax) * 230 * g;
              const cx = 540;
              const cy = 1010;
              const isPeak = h === peak;
              const pts = [cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0, cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1];
              return (
                <g key={h}>
                  {isPeak && <line x1={pts[0]} y1={pts[1]} x2={pts[2]} y2={pts[3]} stroke={C.gold} strokeWidth="34" strokeLinecap="round" filter="url(#nglow)" opacity={g} />}
                  <line x1={pts[0]} y1={pts[1]} x2={pts[2]} y2={pts[3]} stroke={isPeak ? C.gold : C.muted} strokeWidth="22" strokeLinecap="round" opacity={isPeak ? 1 : 0.45} />
                </g>
              );
            })}
            {[0, 6, 12, 18].map((h) => {
              const ang = (h / 24) * Math.PI * 2 - Math.PI / 2;
              return <text key={h} x={540 + Math.cos(ang) * 125} y={1010 + Math.sin(ang) * 125 + 10} textAnchor="middle" fill={C.muted} fontFamily={LABEL} fontWeight="700" fontSize="26">{["midnight", "6", "noon", "18"][h / 6]}</text>;
            })}
          </svg>
          <div style={{ position: "absolute", left: 84, right: 84, top: 300 }}>
            <Big color={C.gold}>{n.hour?.value || ""}</Big>
            <Label>favourite hour to start</Label>
          </div>
          <div style={{
            position: "absolute", left: 84, right: 84, top: 1360, fontFamily: LABEL, fontSize: 32, color: C.muted, textAlign: "center",
          }}
          >
            {n.hour?.detail || ""}
          </div>
        </Card>

        {/* 4 · the day of the week */}
        <Card a={at(3)} b={at(4)}>
          <div style={{ position: "absolute", left: 84, right: 84, top: 300 }}>
            <Big color={C.gold}>{DAYS[top] === "Sun" ? "Sunday" : DAYS[top]}</Big>
            <Label>{`carries ${share}% of every kilometre`}</Label>
          </div>
          <div style={{ position: "absolute", left: 84, right: 84, top: 720 }}>
            {order.map((dIdx, k) => {
              const g = prog(frame, at(3) + 4 + k * 2, at(3) + 20 + k * 2);
              const isTop = dIdx === top;
              return (
                <div key={dIdx} style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 26 }}>
                  <span style={{
                    width: 90, fontFamily: LABEL, fontWeight: 700, fontSize: 34, color: isTop ? C.gold : C.muted,
                  }}
                  >
                    {DAYS[dIdx]}
                  </span>
                  <span style={{
                    height: 46, borderRadius: 23, width: `${(n.weekdayKm[dIdx] / wkMax) * 660 * g + 10}px`, background: isTop ? C.gold : C.line, boxShadow: isTop ? `0 0 30px ${C.gold}88` : "none",
                  }}
                  />
                  <span style={{
                    fontFamily: LABEL, fontWeight: 700, fontSize: 28, color: isTop ? C.ink : C.muted, opacity: g,
                  }}
                  >
                    {`${Math.round(n.weekdayKm[dIdx])}`}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 5 · the climb, in Everests */}
        <Card a={at(4)} b={dur + 20}>
          <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
            {(() => {
              const g = prog(frame, at(4) + 4, at(4) + step * 0.8, Easing.out(Easing.cubic));
              const H = 820;
              const scaleH = H / Math.max(climb, EVEREST * 2);
              const h = climb * scaleH * g;
              const base = 1460;
              const ev = EVEREST * scaleH;
              return (
                <g>
                  <path d={`M140 ${base} L540 ${base - h} L940 ${base} Z`} fill={C.accent} opacity="0.9" />
                  <path d={`M440 ${base - h * 0.75} L540 ${base - h} L640 ${base - h * 0.75} L590 ${base - h * 0.7} L540 ${base - h * 0.8} L490 ${base - h * 0.7} Z`} fill="#fff" opacity="0.85" />
                  {[1, 2].map((e) => (
                    <g key={e} opacity={interpolate(h, [ev * e - 40, ev * e], [0.35, 1], clamp)}>
                      <line x1="80" x2="1000" y1={base - ev * e} y2={base - ev * e} stroke={C.ink} strokeWidth="2" strokeDasharray="10 10" />
                      <text x="1000" y={base - ev * e - 14} textAnchor="end" fill={C.ink} fontFamily={LABEL} fontWeight="700" fontSize="26">{`${e}× Everest`}</text>
                    </g>
                  ))}
                </g>
              );
            })()}
          </svg>
          <div style={{ position: "absolute", left: 84, right: 84, top: 300 }}>
            <Big>{`${fmt(countTo(frame, at(4), at(4) + step * 0.8, climb))} m`}</Big>
            <Label color={C.accent}>{n.climb?.detail ? `climbed · ${n.climb.detail}` : "climbed"}</Label>
          </div>
        </Card>
      </AbsoluteFill>
    </SceneWrap>
  );
};

export default Numbers;
