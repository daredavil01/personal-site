import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { formatDistance, formatDuration, formatEffortSpeed } from "../../../lib/strava";
import { prefersReducedMotion, useInView } from "../shared";

// The latest activities on a split-flap departures board. Every character
// flips through the alphabet and settles left to right, row by row, the first
// time the board is on screen. Each row is a link; the real text is its label.

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:./-";
const COLS = [
  { key: "date", label: "Date", width: 6 },
  { key: "time", label: "Dep", width: 5 },
  { key: "name", label: "Activity", width: 22 },
  { key: "dist", label: "Km", width: 6 },
  { key: "pace", label: "Pace", width: 9 },
];

const cellsOf = (a) => {
  const d = new Date(`${a.date}T00:00:00Z`);
  return {
    date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }).toUpperCase().replace(" ", ""),
    time: a.startLocal ? a.startLocal.slice(11, 16) : "",
    name: a.name.toUpperCase(),
    dist: formatDistance(a.distance).replace(" km", "").replace(" m", "M"),
    pace: (formatEffortSpeed(a.sport, a.averageSpeed) || formatDuration(a.movingTime)).toUpperCase().replace(" ", ""),
  };
};

const Flap = ({ ch, settleAt, tick }) => {
  const settled = tick >= settleAt;
  const shown = settled ? ch : GLYPHS[(tick * 7 + settleAt * 3) % GLYPHS.length];
  return <span className={`tr-flap${settled ? "" : " tr-flipping"}`}>{ch === " " && settled ? " " : shown}</span>;
};
Flap.propTypes = { ch: PropTypes.string.isRequired, settleAt: PropTypes.number.isRequired, tick: PropTypes.number.isRequired };

const Departures = ({ rows }) => {
  const [ref, seen] = useInView(0.3);
  const [tick, setTick] = useState(prefersReducedMotion() ? 9999 : 0);
  const list = rows.slice(0, 7);

  useEffect(() => {
    if (!seen || tick >= 9999) return undefined;
    const id = setInterval(() => setTick((t) => (t > 80 ? 9999 : t + 1)), 45);
    return () => clearInterval(id);
  }, [seen]);

  return (
    <section ref={ref} className="rounded-3xl p-4 md:p-8" style={{ background: "#07090f", boxShadow: "inset 0 0 0 1px #1f2433" }} aria-labelledby="tr-dep-title">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 id="tr-dep-title" className="font-mono text-xl md:text-2xl tracking-[0.3em] mb-0" style={{ color: "#ffc861" }}>DEPARTURES</h2>
        <span className="font-mono text-xs tracking-widest" style={{ color: "#8fa0bf" }}>LATEST {list.length}</span>
      </div>
      <div className="overflow-x-auto tr-scroll-x">
        <div className="min-w-[640px] font-mono text-sm md:text-base">
          <div className="flex gap-3 px-2 pb-2" style={{ color: "#8fa0bf" }} aria-hidden="true">
            {COLS.map((c) => (
              <span key={c.key} style={{ width: `${c.width * 0.78}em` }}>
                <span className="text-[10px] tracking-widest">{c.label.toUpperCase()}</span>
              </span>
            ))}
          </div>
          <ul className="pl-0 mb-0 list-none flex flex-col gap-1.5">
            {list.map((a, row) => {
              const cells = cellsOf(a);
              let col = 0;
              return (
                <li key={a.id}>
                  <Link
                    to={`/training/${a.id}`}
                    aria-label={`${a.date} ${cells.time}: ${a.name}, ${formatDistance(a.distance)}`}
                    className="flex gap-3 px-2 py-1.5 rounded-md no-underline hover:bg-white/5 transition-colors"
                  >
                    {COLS.map((c) => {
                      const text = (cells[c.key] || "").slice(0, c.width).padEnd(c.width, " ");
                      return (
                        <span key={c.key} className="whitespace-nowrap" aria-hidden="true" style={{ width: `${c.width * 0.78}em` }}>
                          {text.split("").map((ch, i) => {
                            col += 1;
                            // eslint-disable-next-line react/no-array-index-key
                            return <Flap key={i} ch={ch} tick={tick} settleAt={8 + row * 6 + Math.floor(col / 3)} />;
                          })}
                        </span>
                      );
                    })}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};

Departures.propTypes = { rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired };

export default Departures;
