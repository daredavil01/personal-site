import React, { useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { weeklyTotals, yearsOf } from "../../../lib/training";
import { Tip, useInView } from "../shared";

// Tides: weekly distance as a ridgeline, one wave per year, newest at the
// front. The swells are training blocks, the troughs monsoon and taper. Each
// wave rolls in from the left the first time it is on screen; moving across
// the chart reads every year's same week together.

const W = 1000;
const ROW = 64;
const AMP = 110;

const WeeklyTides = ({ rows }) => {
  const [ref, seen] = useInView(0.25);
  const box = useRef(null);
  const [hover, setHover] = useState(null);
  const years = useMemo(() => [...yearsOf(rows)].reverse(), [rows]);
  const series = useMemo(() => years.map((y) => ({ y, weeks: weeklyTotals(rows, y) })), [rows, years]);
  const max = Math.max(1, ...series.flatMap((s) => s.weeks.map((w) => w.distance)));
  const H = AMP + years.length * ROW + 24;
  const xOf = (i) => 40 + (i / 52) * (W - 60);
  const base = (k) => AMP + k * ROW;

  const area = (s, k) => {
    const b = base(k);
    const pts = s.weeks.map((w, i) => [xOf(i), b - (w.distance / max) * AMP]);
    if (!pts.length) return { fill: "", line: "" };
    // Smooth with a Catmull-Rom → Bézier pass so it reads as water.
    let line = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      line += `C${c1[0].toFixed(1)} ${Math.min(b, c1[1]).toFixed(1)} ${c2[0].toFixed(1)} ${Math.min(b, c2[1]).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    const last = pts[pts.length - 1];
    return { line, fill: `${line}L${last[0]} ${b}L${pts[0][0]} ${b}Z` };
  };

  const onMove = (e) => {
    const r = box.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(51, Math.round(((x - 40) / (W - 60)) * 52)));
    const px = e.clientX - r.left;
    setHover({
      i, at: { x: px, y: e.clientY - r.top, flip: px > r.width * 0.6 },
    });
  };

  const peak = useMemo(() => series.reduce((best, s) => s.weeks.reduce((b, w) => (w.distance > (b?.distance || 0) ? { ...w, y: s.y } : b), best), null), [series]);

  return (
    <section ref={ref} className="tr-night px-4 py-8 md:px-10 md:py-10" aria-labelledby="tr-tide-title">
      <p className="tr-kicker mb-2" style={{ color: "var(--tr-accent)" }}>Chapter four</p>
      <h2 id="tr-tide-title" className="font-headline text-3xl md:text-5xl mb-1" style={{ color: "var(--tr-ink)" }}>Tides</h2>
      <p className="text-sm mb-5 max-w-lg" style={{ color: "var(--tr-muted)" }}>
        {`Kilometres per week, one wave per year. ${peak ? `The highest swell: ${Math.round(peak.distance / 1000)} km in the week of ${new Date(`${peak.week}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}.` : ""}`}
      </p>
      <div className="overflow-x-auto tr-scroll-x -mx-2 px-2">
      <div ref={box} className="relative min-w-[620px]" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" role="img" aria-label="Weekly distance per year as overlapping waves">
          <defs>
            <linearGradient id="tr-wave" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#3987e5" stopOpacity="0.85" />
              <stop offset="1" stopColor="#0b1220" stopOpacity="0.95" />
            </linearGradient>
            {series.map((s, k) => (
              <clipPath key={s.y} id={`tr-clip-${s.y}`}>
                <rect
                  x="0"
                  y="0"
                  height={H}
                  width={seen ? W : 0}
                  style={{ transition: `width 1.8s cubic-bezier(0.16,1,0.3,1) ${k * 260}ms` }}
                />
              </clipPath>
            ))}
          </defs>
          {["Jan", "Apr", "Jul", "Oct"].map((m, i) => (
            <text key={m} x={xOf(i * 13)} y={H - 4} fontSize="12" fill="var(--tr-muted)" fontFamily="Plus Jakarta Sans, sans-serif">{m}</text>
          ))}
          {series.map((s, k) => {
            const { fill, line } = area(s, k);
            const newest = k === series.length - 1;
            return (
              <g key={s.y} clipPath={`url(#tr-clip-${s.y})`}>
                <path d={fill} fill="url(#tr-wave)" />
                <path d={line} fill="none" stroke={newest ? "#ff7a59" : "#cfe0ff"} strokeWidth={newest ? 2.4 : 1.4} strokeOpacity={newest ? 1 : 0.7} />
                <text x="0" y={base(k) - 4} fontSize="13" fontWeight="700" fill="var(--tr-ink)" fontFamily="Plus Jakarta Sans, sans-serif">{s.y}</text>
              </g>
            );
          })}
          {hover && <line x1={xOf(hover.i)} x2={xOf(hover.i)} y1="0" y2={H - 20} stroke="#fff" strokeOpacity="0.5" strokeDasharray="3 4" />}
        </svg>
        <Tip at={hover?.at} dark>
          {hover && (
            <>
              <strong className="block mb-1">{`Week ${hover.i + 1}`}</strong>
              {[...series].reverse().map((s) => (
                <span key={s.y} className="flex justify-between gap-4 tabular-nums">
                  <span className="opacity-70">{s.y}</span>
                  <span>{s.weeks[hover.i] ? `${Math.round(s.weeks[hover.i].distance / 1000)} km` : "—"}</span>
                </span>
              ))}
            </>
          )}
        </Tip>
      </div>
      </div>
    </section>
  );
};

WeeklyTides.propTypes = { rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired };

export default WeeklyTides;
