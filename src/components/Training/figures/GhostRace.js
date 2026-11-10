import React, {
  useEffect, useMemo, useRef, useState,
} from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { formatDuration } from "../../../lib/strava";
import { prefersReducedMotion, useInView } from "../shared";

// Race your past selves: each year's fastest effort at one distance, run
// side by side, fast-forwarded so the slowest finishes in about ten seconds.
// The clock shows race time. Every lane is a real effort (Strava's best
// efforts, computed from the GPS at import) and links to its run.

const ORDER = ["400m", "1K", "1 mile", "5K", "10K", "15K", "10 mile", "20K", "Half-Marathon", "30K", "Marathon", "50K"];
const REAL_SECONDS = 9;
const START = "3.25rem";
const FINISH = "2.25rem";

const medal = ["#d4a017", "#b8b8c0", "#c07a3a"];

const GhostRace = ({ efforts }) => {
  const [ref, seen] = useInView(0.35);
  const byName = useMemo(() => {
    const m = new Map();
    efforts.forEach((e) => {
      if (!m.has(e.name)) m.set(e.name, []);
      m.get(e.name).push(e);
    });
    return m;
  }, [efforts]);
  const names = ORDER.filter((n) => (byName.get(n) || []).length >= 2);
  const [name, setName] = useState(null);
  const fallback = names.includes("5K") ? "5K" : names[0];
  const chosen = name && names.includes(name) ? name : fallback;
  const lanes = useMemo(() => [...(byName.get(chosen) || [])].sort((a, b) => b.year - a.year), [byName, chosen]);
  const slowest = Math.max(0, ...lanes.map((l) => l.elapsed_time));
  const fastest = Math.min(...lanes.map((l) => l.elapsed_time));

  const [t, setT] = useState(0); // race seconds
  const [running, setRunning] = useState(false);
  const raf = useRef(0);

  const start = () => {
    cancelAnimationFrame(raf.current);
    if (prefersReducedMotion()) { setT(slowest); return; }
    setT(0);
    setRunning(true);
    const t0 = performance.now();
    const tick = (now) => {
      const race = ((now - t0) / 1000) * (slowest / REAL_SECONDS);
      if (race >= slowest) { setT(slowest); setRunning(false); return; }
      setT(race);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  useEffect(() => { if (seen && lanes.length) start(); }, [seen, chosen]);

  if (!names.length) return null;

  const finished = lanes.filter((l) => l.elapsed_time <= t).sort((a, b) => a.elapsed_time - b.elapsed_time);
  const place = (l) => finished.indexOf(l);
  const done = t >= slowest && !running;
  const newest = lanes[0];
  const oldest = lanes[lanes.length - 1];
  const gapSec = oldest.elapsed_time - newest.elapsed_time;
  const gapMetres = Math.round(newest.distance * (1 - newest.elapsed_time / oldest.elapsed_time));

  return (
    <section ref={ref} className="tr-night px-4 py-8 md:px-10 md:py-10" aria-labelledby="tr-race-title">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <p className="tr-kicker mb-2" style={{ color: "var(--tr-accent)" }}>Same start gun</p>
          <h2 id="tr-race-title" className="font-headline text-3xl md:text-5xl mb-1" style={{ color: "var(--tr-ink)" }}>Race your past selves</h2>
          <p className="text-sm mb-0 max-w-lg" style={{ color: "var(--tr-muted)" }}>
            Each lane is my fastest effort of that year. Same start gun, different years.
          </p>
        </div>
        <p className="font-mono text-4xl md:text-5xl mb-0 tabular-nums" style={{ color: "#ffc861" }} aria-label={`Race clock ${formatDuration(t)}`}>
          {formatDuration(t)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Distance">
        {names.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={chosen === n}
            onClick={() => setName(n)}
            className="px-3 h-8 rounded-full tr-kicker border"
            style={{
              borderColor: chosen === n ? "var(--tr-accent)" : "var(--tr-line)",
              background: chosen === n ? "var(--tr-accent)" : "transparent",
              color: chosen === n ? "#fff" : "var(--tr-ink)",
            }}
          >
            {n}
          </button>
        ))}
      </div>

      <div
        className="relative rounded-2xl overflow-hidden py-2"
        style={{ background: "linear-gradient(180deg, #b0492f, #9c3b25)" }}
        role="img"
        aria-label={`${chosen}: ${lanes.map((l) => `${l.year} ${formatDuration(l.elapsed_time)}`).join(", ")}`}
      >
        {/* start line and the chequered finish */}
        <span aria-hidden="true" className="absolute top-0 bottom-0 w-[3px] bg-white/90" style={{ left: START }} />
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 w-3"
          style={{ right: FINISH, backgroundImage: "repeating-conic-gradient(#111 0 25%, #fff 0 50%)", backgroundSize: "8px 8px" }}
        />
        {lanes.map((l, i) => {
          const p = Math.min(1, t / l.elapsed_time);
          const pl = place(l);
          const isNew = i === 0;
          return (
            <div key={l.year} className="relative h-14 border-b-2 border-white/50 last:border-b-0" aria-hidden="true">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 font-label text-xs md:text-sm font-extrabold text-white">{l.year}</span>
              <span className="absolute inset-y-0" style={{ left: START, right: `calc(${FINISH} + 12px)` }}>
                <span
                  className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full left-0"
                  style={{ width: `${p * 100}%`, background: "linear-gradient(90deg, transparent, rgba(255,255,255,.6))" }}
                />
                <span className="absolute top-1/2" style={{ left: `${p * 100}%`, transform: "translate(-50%, -50%)" }}>
                  <span
                    className={`flex items-center justify-center w-9 h-9 rounded-full border-[3px] border-white shadow-lg font-label text-[11px] font-extrabold ${running && p < 1 ? "tr-bob" : ""}`}
                    style={{
                      background: isNew ? "#ff7a59" : `rgba(231,225,218,${0.45 + 0.5 * (1 - i / lanes.length)})`,
                      color: isNew ? "#fff" : "#2b1a14",
                    }}
                  >
                    {`'${String(l.year).slice(2)}`}
                  </span>
                </span>
              </span>
              {pl >= 0 && (
                <span
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center font-label text-[11px] font-extrabold text-stone-900 tr-pop"
                  style={{ background: medal[pl] || "rgba(255,255,255,.35)" }}
                >
                  {pl + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 pl-0 mt-4 mb-0 list-none">
        {lanes.map((l) => (
          <li key={l.year}>
            <Link to={`/training/${l.activity_id}`} className="flex items-baseline justify-between gap-2 px-3 py-2 rounded-lg no-underline border hover:border-[color:var(--tr-accent)] transition-colors" style={{ borderColor: "var(--tr-line)", color: "var(--tr-ink)" }}>
              <span className="tr-kicker" style={{ color: "var(--tr-muted)" }}>{l.year}</span>
              <span className="font-mono tabular-nums">{formatDuration(l.elapsed_time)}</span>
              {l.elapsed_time === fastest && <span className="tr-kicker text-[10px]" style={{ color: "#ffc861" }}>Best</span>}
            </Link>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-4 mt-5 min-h-[3rem]">
        <p className="mb-0 font-headline text-xl md:text-2xl" style={{ color: "var(--tr-ink)" }} aria-live="polite">
          {done && (gapSec > 0
            ? `${newest.year} me finishes ${formatDuration(gapSec)} ahead of ${oldest.year} me — about ${gapMetres.toLocaleString()} m at the line.`
            : `${oldest.year} me still holds this one. Next year.`)}
        </p>
        <button
          type="button"
          onClick={start}
          disabled={running}
          className="inline-flex items-center gap-2 px-5 h-11 rounded-full text-white tr-kicker shadow-lg disabled:opacity-50 hover:scale-105 transition-transform"
          style={{ background: "var(--tr-accent)" }}
        >
          <span className="material-symbols-outlined text-lg" aria-hidden="true">sports_score</span>
          {done ? "Run it again" : "Start gun"}
        </button>
      </div>
    </section>
  );
};

GhostRace.propTypes = {
  efforts: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string, year: PropTypes.number, elapsed_time: PropTypes.number,
  })).isRequired,
};

export default GhostRace;
