import React, { useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useWidth } from "../Logbook/shared";
import { ChartTip } from "../common/LogKit";
import {
  distanceName, formatDuration, formatPace, formatRaceDay,
} from "../../lib/raceLog";

// Finish times at one distance over time, faster at the top, with the
// personal-best staircase drawn through them: the trajectory, not just the
// wins. Every dot is a button that opens the race.

const H = 280;
const PAD = {
  top: 24, right: 20, bottom: 32, left: 56,
};

const PaceProgression = ({ races, onOpen }) => {
  const keys = useMemo(() => {
    const counts = new Map();
    races.forEach((r) => { if (r.secs && r.dateObj) counts.set(r.distKey, (counts.get(r.distKey) ?? 0) + 1); });
    return [...counts].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [races]);
  const [picked, setPicked] = useState(null);
  const key = keys.includes(picked) ? picked : keys[0];
  const ref = useRef(null);
  const width = useWidth(ref, 640);
  const [hover, setHover] = useState(null);

  const points = useMemo(() => races.filter((r) => r.distKey === key && r.secs && r.dateObj), [races, key]);

  if (!keys.length) {
    return <p className="mb-0 font-body text-sm text-stone-500 dark:text-stone-400">Run a distance twice and its progression appears here.</p>;
  }

  const t0 = points[0].dateObj.getTime();
  const t1 = points[points.length - 1].dateObj.getTime();
  const span = Math.max(t1 - t0, 86400000 * 30);
  const lo = Math.min(...points.map((p) => p.secs));
  const hi = Math.max(...points.map((p) => p.secs));
  const pad = Math.max(60, (hi - lo) * 0.12);
  const yMin = lo - pad;
  const yMax = hi + pad;
  const innerW = Math.max(120, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const x = (r) => PAD.left + ((r.dateObj.getTime() - t0) / span) * innerW;
  const y = (secs) => PAD.top + ((secs - yMin) / (yMax - yMin)) * innerH; // faster = higher

  // Running best as a step line.
  let best = Infinity;
  const steps = [];
  points.forEach((p) => {
    const px = x(p);
    if (best !== Infinity) steps.push(`L${px},${y(best)}`);
    best = Math.min(best, p.secs);
    steps.push(`${steps.length ? "L" : "M"}${px},${y(best)}`);
  });
  steps.push(`L${PAD.left + innerW},${y(best)}`);

  const ticks = [0, 1, 2, 3].map((i) => yMin + ((yMax - yMin) * (i + 0.5)) / 4);
  const years = [];
  for (let yr = new Date(t0).getFullYear() + 1; yr <= new Date(t1).getFullYear(); yr += 1) years.push(yr);
  const hp = hover != null ? points[hover] : null;

  return (
    <div>
      {keys.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Distance">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={k === key}
              onClick={() => { setPicked(k); setHover(null); }}
              className={`px-3 py-1.5 rounded-full text-xs font-label font-bold border transition-colors ${
                k === key ? "bg-secondary text-white border-secondary" : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-secondary"
              }`}
            >
              {distanceName(k)}
            </button>
          ))}
        </div>
      )}
      <div ref={ref} className="relative w-full" onMouseLeave={() => setHover(null)}>
        <svg width={width} height={H} role="img" aria-label={`${distanceName(key)} finish times over time, faster at the top`} className="block overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + innerW} y1={y(t)} y2={y(t)} className="stroke-stone-100 dark:stroke-stone-800" />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="fill-stone-400 text-[11px] font-label tabular-nums">{formatDuration(Math.round(t / 60) * 60)}</text>
            </g>
          ))}
          {years.map((yr) => {
            const xx = PAD.left + ((new Date(yr, 0, 1).getTime() - t0) / span) * innerW;
            return (
              <g key={yr}>
                <line x1={xx} x2={xx} y1={PAD.top} y2={PAD.top + innerH} className="stroke-stone-200 dark:stroke-stone-700" strokeDasharray="3 4" />
                <text x={xx + 4} y={H - 10} className="fill-stone-400 text-[11px] font-label font-bold">{yr}</text>
              </g>
            );
          })}
          <text x={PAD.left} y={12} className="fill-stone-400 text-[10px] font-label uppercase tracking-widest">↑ faster</text>
          <path d={steps.join(" ")} fill="none" className="stroke-secondary" strokeWidth={2.5} strokeLinejoin="round" />
          <polyline
            points={points.map((p) => `${x(p)},${y(p.secs)}`).join(" ")}
            fill="none"
            className="stroke-stone-300 dark:stroke-stone-600"
            strokeWidth={1}
          />
          {points.map((p, i) => (
            <g
              key={p.id}
              role="button"
              tabIndex={0}
              aria-label={`${p.title}, ${formatDuration(p.secs)}${p.wasPB ? ", personal best at the time" : ""}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={() => onOpen(p)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(p); } }}
              className="cursor-pointer focus:outline-none group"
            >
              <circle cx={x(p)} cy={y(p.secs)} r={14} fill="transparent" />
              <circle
                cx={x(p)}
                cy={y(p.secs)}
                r={hover === i ? 7 : 5}
                strokeWidth={2}
                className={p.wasPB ? "fill-secondary stroke-white dark:stroke-stone-900" : "fill-white dark:fill-stone-900 stroke-stone-400"}
              />
              {p.isBest && (
                <text x={x(p)} y={y(p.secs) - 12} textAnchor="middle" className="fill-secondary text-[10px] font-label font-black">PB</text>
              )}
            </g>
          ))}
        </svg>
        {hp && (
          <ChartTip x={x(hp)} y={y(hp.secs)} width={width}>
            <strong className="block">{hp.title}</strong>
            {`${formatDuration(hp.secs)} · ${formatPace(hp.pace)}/km · ${formatRaceDay(hp.dateObj)}`}
            {hp.wasPB && !hp.firstAtDistance && <span className="block text-secondary-fixed-dim dark:text-secondary">{`New PB, ${formatDuration(hp.improvedBy)} faster`}</span>}
          </ChartTip>
        )}
      </div>
      <p className="mt-3 mb-0 flex flex-wrap gap-4 font-body text-xs text-stone-500 dark:text-stone-400">
        <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-secondary" aria-hidden="true" />Personal best at the time</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-stone-400" aria-hidden="true" />Other finishes</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-secondary" aria-hidden="true" />Best so far</span>
      </p>
    </div>
  );
};

PaceProgression.propTypes = {
  races: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onOpen: PropTypes.func.isRequired,
};

export default PaceProgression;
