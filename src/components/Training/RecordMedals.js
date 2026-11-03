import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { records } from "../../lib/training";
import {
  formatDistance, formatDuration, formatEffortSpeed, sportLabel,
} from "../../lib/strava";

// The records as medals: the number on the front, the activity behind it on
// the back. Hover, focus or tap to turn one over. A record with nothing to
// show is left out, never a zero. Used by both layouts; `dark` for the atlas.

const monthName = (ym) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const weekName = (iso) => `Week of ${new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`;

const RIBBONS = ["#b22200", "#2a78d6", "#d4a017", "#1baf7a", "#6250d6", "#eb6834", "#8a8783", "#b22200"];

const Medal = ({ m, i, dark }) => {
  const [flipped, setFlipped] = useState(false);
  const face = `tr-medal-face rounded-2xl border flex flex-col items-center justify-center text-center p-4 ${dark
    ? "bg-[#0f1830] border-white/10 text-slate-100"
    : "bg-white border-stone-200 text-stone-900 dark:bg-stone-900 dark:border-stone-700 dark:text-stone-100"}`;
  return (
    <li className={`tr-medal h-56 ${flipped ? "is-flipped" : ""}`} onMouseEnter={() => setFlipped(true)} onMouseLeave={() => setFlipped(false)}>
      <div className="tr-medal-inner">
        <button
          type="button"
          className={`${face} w-full cursor-pointer`}
          onClick={() => setFlipped(true)}
          tabIndex={flipped ? -1 : 0}
          aria-label={`${m.label}: ${m.value}. Turn over for the details.`}
        >
          <svg viewBox="0 0 60 70" className="w-14 h-16 mb-2" aria-hidden="true">
            <path d="M18 0 L30 22 L42 0 Z" fill={RIBBONS[i % RIBBONS.length]} />
            <path d="M14 0 L24 0 L32 20 L26 26 Z" fill={RIBBONS[i % RIBBONS.length]} opacity="0.7" />
            <circle cx="30" cy="44" r="22" fill="#e2b33b" stroke="#a87a12" strokeWidth="3" />
            <circle cx="30" cy="44" r="15" fill="none" stroke="#fff3" strokeWidth="2" />
            <text x="30" y="50" textAnchor="middle" fontSize="16" fontWeight="800" fill="#6b4a00" fontFamily="Plus Jakarta Sans, sans-serif">{i + 1}</text>
          </svg>
          <span className="font-headline text-2xl md:text-3xl leading-tight tabular-nums">{m.value}</span>
          <span className={`font-label text-[10px] uppercase tracking-widest mt-1 ${dark ? "text-slate-400" : "text-stone-500 dark:text-stone-400"}`}>{m.label}</span>
        </button>
        <div className={`${face} tr-medal-back`} aria-hidden={!flipped}>
          <span className={`font-label text-[10px] uppercase tracking-widest mb-2 ${dark ? "text-slate-400" : "text-stone-500"}`}>{m.label}</span>
          <span className="font-headline text-lg leading-snug mb-2 line-clamp-3">{m.back}</span>
          {m.to ? (
            <Link to={m.to} className="font-label text-[11px] uppercase tracking-widest font-bold no-underline" style={{ color: dark ? "#ff7a59" : "#b22200" }} tabIndex={flipped ? 0 : -1}>
              Open the activity →
            </Link>
          ) : <span className={`text-xs ${dark ? "text-slate-400" : "text-stone-500"}`}>{m.sub}</span>}
          <button type="button" onClick={() => setFlipped(false)} tabIndex={flipped ? 0 : -1} className={`mt-3 font-label text-[10px] uppercase tracking-widest ${dark ? "text-slate-400" : "text-stone-500"}`}>
            Turn back
          </button>
        </div>
      </div>
    </li>
  );
};
Medal.propTypes = {
  m: PropTypes.shape({
    label: PropTypes.string, value: PropTypes.string, back: PropTypes.string, to: PropTypes.string, sub: PropTypes.string,
  }).isRequired,
  i: PropTypes.number.isRequired,
  dark: PropTypes.bool.isRequired,
};

const RecordMedals = ({ rows, dark }) => {
  const rec = useMemo(() => records(rows), [rows]);
  const activity = (r) => ({ back: `${r.name} · ${r.date}`, to: `/training/${r.id}` });
  const medals = [
    rec.longest && { label: `Longest ${sportLabel(rec.longest.sport).toLowerCase()}`, value: formatDistance(rec.longest.distance), ...activity(rec.longest) },
    rec.longestRun && rec.longestRun !== rec.longest && { label: "Longest run", value: formatDistance(rec.longestRun.distance), ...activity(rec.longestRun) },
    rec.fastestRun && { label: "Fastest run (5 km+)", value: formatEffortSpeed(rec.fastestRun.sport, rec.fastestRun.averageSpeed), ...activity(rec.fastestRun) },
    rec.longestTime && { label: "Longest time out", value: formatDuration(rec.longestTime.movingTime), ...activity(rec.longestTime) },
    rec.biggestClimb && { label: "Biggest climb", value: `${Math.round(rec.biggestClimb.elevationGain).toLocaleString()} m`, ...activity(rec.biggestClimb) },
    rec.biggestWeek && { label: "Biggest week", value: formatDistance(rec.biggestWeek.value), back: weekName(rec.biggestWeek.key), sub: "Monday to Sunday" },
    rec.biggestMonth && { label: "Biggest month", value: formatDistance(rec.biggestMonth.value), back: monthName(rec.biggestMonth.key), sub: "Every sport together" },
    rec.streak > 1 && { label: "Longest streak", value: `${rec.streak} days`, back: "Consecutive days with at least one activity", sub: "No rest days" },
  ].filter(Boolean);
  if (!medals.length) return null;
  return (
    <ul className="grid grid-cols-2 md:grid-cols-4 gap-3 pl-0 mb-0 list-none">
      {medals.map((m, i) => <Medal key={m.label} m={m} i={i} dark={dark} />)}
    </ul>
  );
};

RecordMedals.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  dark: PropTypes.bool,
};
RecordMedals.defaultProps = { dark: false };

export default RecordMedals;
