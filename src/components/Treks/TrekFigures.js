import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import { useWidth } from "../Logbook/shared";
import { ChartTip } from "../common/LogKit";
import { LEVELS, formatTrekDay, formatTrekHours } from "../../lib/trekLog";

// The /treks figures. Difficulty has one colour per level everywhere on the
// page (fill classes below, swatches in the legend), and text never wears it.

export const LEVEL_STYLE = {
  Easy: {
    fill: "fill-emerald-500", bg: "bg-emerald-500", soft: "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  Medium: {
    fill: "fill-amber-500", bg: "bg-amber-500", soft: "bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  },
  Hard: {
    fill: "fill-rose-600", bg: "bg-rose-600", soft: "bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  },
};
const NONE = { fill: "fill-stone-400", bg: "bg-stone-400", soft: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300" };
export const levelStyle = (level) => LEVEL_STYLE[level] ?? NONE;

export const LevelBadge = ({ level }) => (level ? (
  <span className={`px-2 py-0.5 rounded-full font-label text-[10px] font-black uppercase tracking-wider ${levelStyle(level).soft}`}>{level}</span>
) : null);

LevelBadge.propTypes = { level: PropTypes.string };

export const LevelLegend = () => (
  <span className="flex flex-wrap gap-3 font-body text-xs text-stone-500 dark:text-stone-400">
    {LEVELS.map((l) => (
      <span key={l} className="flex items-center gap-1.5"><span className={`inline-block w-2.5 h-2.5 rounded-sm ${LEVEL_STYLE[l].bg}`} aria-hidden="true" />{l}</span>
    ))}
  </span>
);

const H = 240;
const BASE = 200;

/**
 * Every trek as a peak, in the order they happened: height is hours on the
 * trail (square-root scale, so a 22-hour traverse does not flatten the rest),
 * colour is difficulty, a flag marks a place reached for the first time.
 */
export const Ridgeline = ({ treks, onOpen }) => {
  const ref = useRef(null);
  const width = useWidth(ref, 720);
  const [hover, setHover] = useState(null);
  if (!treks.length) return null;

  const minStep = 34;
  const drawW = Math.max(width, treks.length * minStep + 40);
  const step = (drawW - 40) / treks.length;
  const maxH = Math.max(...treks.map((t) => t.hours ?? 1));
  const peak = (t) => 26 + (Math.sqrt(t.hours ?? 1) / Math.sqrt(maxH)) * (BASE - 60);
  const cx = (i) => 20 + step * (i + 0.5);
  const half = Math.min(step * 0.95, 46);
  const ht = hover != null ? treks[hover] : null;

  return (
    <div ref={ref} className="relative w-full">
      <div className="overflow-x-auto" onMouseLeave={() => setHover(null)}>
        <svg width={drawW} height={H} role="img" aria-label="Every trek as a peak, oldest on the left; taller means longer on the trail" className="block">
          <defs>
            <linearGradient id="tk-sky" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0.08" />
            </linearGradient>
          </defs>
          <rect x={0} y={0} width={drawW} height={BASE} fill="url(#tk-sky)" className="text-sky-500" />
          {treks.map((t, i) => {
            const prev = treks[i - 1];
            if (!prev || prev.year === t.year) return null;
            const xx = 20 + step * i;
            return (
              <g key={`y${t.year}`}>
                <line x1={xx} x2={xx} y1={14} y2={BASE} className="stroke-stone-300 dark:stroke-stone-700" strokeDasharray="2 4" />
                <text x={xx + 4} y={24} className="fill-stone-400 text-[11px] font-label font-bold">{t.year}</text>
              </g>
            );
          })}
          {treks[0]?.year && <text x={24} y={24} className="fill-stone-400 text-[11px] font-label font-bold">{treks[0].year}</text>}
          {treks.map((t, i) => {
            const x = cx(i);
            const top = BASE - peak(t);
            const d = `M${x - half},${BASE} C${x - half * 0.45},${BASE - (BASE - top) * 0.55} ${x - 6},${top} ${x},${top} C${x + 6},${top} ${x + half * 0.45},${BASE - (BASE - top) * 0.55} ${x + half},${BASE} Z`;
            const on = hover === i;
            return (
              <g
                key={t.id}
                role="button"
                tabIndex={0}
                aria-label={`${t.title}, ${formatTrekDay(t.dateObj)}, ${t.level ?? ""} ${formatTrekHours(t.hours)}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => onOpen(t)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(t); } }}
                className="cursor-pointer focus:outline-none"
              >
                <path d={d} className={`${levelStyle(t.level).fill} stroke-white dark:stroke-stone-900 transition-opacity`} strokeWidth={1.5} opacity={hover == null || on ? 0.92 : 0.45} />
                {t.newPlaces > 0 && (
                  <g aria-hidden="true">
                    <line x1={x} x2={x} y1={top} y2={top - 14} className="stroke-stone-700 dark:stroke-stone-300" strokeWidth={1.2} />
                    <path d={`M${x},${top - 14} l8,3 l-8,3 z`} className="fill-secondary" />
                  </g>
                )}
                <text x={x} y={BASE + 16} textAnchor="middle" className={`text-[10px] font-label font-bold ${on ? "fill-secondary" : "fill-stone-400"}`}>{t.number}</text>
              </g>
            );
          })}
          <line x1={0} x2={drawW} y1={BASE} y2={BASE} className="stroke-stone-300 dark:stroke-stone-600" />
        </svg>
      </div>
      {ht && (
        <ChartTip x={Math.min(cx(hover), width - 10)} y={BASE - peak(ht)} width={width}>
          <strong className="block">{`#${ht.number} ${ht.title}`}</strong>
          {`${formatTrekDay(ht.dateObj)} · ${formatTrekHours(ht.hours)}${ht.level ? ` · ${ht.level}` : ""}`}
          {ht.newPlaces === 0 && <span className="block opacity-80">A return visit</span>}
        </ChartTip>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <LevelLegend />
        <span className="flex items-center gap-1.5 font-body text-xs text-stone-500 dark:text-stone-400">
          <svg width="12" height="14" aria-hidden="true"><line x1="2" x2="2" y1="1" y2="14" stroke="currentColor" /><path d="M2,1 l8,3 l-8,3 z" className="fill-secondary" /></svg>
          First time at that place
        </span>
      </div>
    </div>
  );
};

Ridgeline.propTypes = {
  treks: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onOpen: PropTypes.func.isRequired,
};

/** Treks per year, stacked by difficulty; a bar picks its year. */
export const YearLevels = ({ years, onPick }) => {
  const max = Math.max(1, ...years.map((y) => y.count));
  return (
    <ul className="m-0 p-0 list-none flex flex-col gap-2.5">
      {years.map((y) => (
        <li key={y.year}>
          <button type="button" onClick={() => onPick(String(y.year))} className="w-full text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded" aria-label={`${y.year}: ${y.count} treks, ${Math.round(y.hours)} hours`}>
            <span className="flex justify-between text-sm mb-1">
              <span className="font-body text-stone-700 dark:text-stone-300 group-hover:text-secondary">{y.year}</span>
              <span className="font-label font-bold text-stone-500 tabular-nums">{`${y.count} · ${Math.round(y.hours)} h`}</span>
            </span>
            <span className="flex h-3 rounded-full overflow-hidden bg-stone-100 dark:bg-stone-800" style={{ width: `${Math.max(8, (y.count / max) * 100)}%` }}>
              {LEVELS.map((l, i) => (y.levels[i] ? <span key={l} className={LEVEL_STYLE[l].bg} style={{ width: `${(y.levels[i] / y.count) * 100}%` }} /> : null))}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};

YearLevels.propTypes = {
  years: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onPick: PropTypes.func.isRequired,
};

export const ReturnVisits = ({ groups, onOpen }) => {
  if (!groups.length) return <p className="mb-0 text-sm text-stone-500">No place visited twice in this selection.</p>;
  return (
    <ul className="m-0 p-0 list-none flex flex-col gap-4">
      {groups.map((g) => (
        <li key={g.label}>
          <p className="mb-1.5 font-body font-bold text-stone-800 dark:text-stone-200">
            {g.label}
            <span className="ml-2 font-label text-[10px] uppercase tracking-widest text-stone-400">{`${g.visits.length} visits`}</span>
          </p>
          <ol className="m-0 p-0 list-none flex flex-wrap gap-2">
            {g.visits.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => onOpen(t)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:border-secondary text-left text-xs transition-colors">
                  <span className={`w-2 h-2 rounded-full ${levelStyle(t.level).bg}`} aria-hidden="true" />
                  <span className="text-stone-700 dark:text-stone-200 font-bold">{t.title}</span>
                  <span className="text-stone-400 tabular-nums">{t.year}</span>
                </button>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ul>
  );
};

ReturnVisits.propTypes = {
  groups: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onOpen: PropTypes.func.isRequired,
};
