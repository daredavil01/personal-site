import React, { useMemo } from "react";
import PropTypes from "prop-types";
import Odometer from "./Odometer";
import { SampleRibbon, useInView } from "../shared";
import { howFar, totals, yearsOf } from "../../../lib/training";

// The opening frame: a night sky, a heartbeat line that keeps beating, and
// the whole log on an odometer that rolls up when the page opens. Under it,
// what the distance means — laps of the Earth, the way to the Moon, Everests.

const EVEREST = 8849;

// One heartbeat, drawn in a 400-wide box, repeated four times.
const BEAT = "M0 50 L60 50 L72 50 L80 30 L88 66 L98 12 L108 80 L116 50 L140 50 L150 44 L160 50 L200 50";
const beats = [0, 200, 400, 600].map((x) => BEAT.replace(/([ML])(\d+)/g, (_, c, n) => `${c}${Number(n) + x}`)).join(" ");

const Gauge = ({
  value, label, sub, fraction, delay, run,
}) => {
  const c = 2 * Math.PI * 42;
  const f = Math.max(0.02, Math.min(1, fraction));
  return (
    <figure className="flex items-center gap-4 m-0">
      <svg viewBox="0 0 100 100" className="w-20 h-20 shrink-0 -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--tr-line)" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="var(--tr-accent)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={run ? c * (1 - f) : c}
          style={{ transition: `stroke-dashoffset 2.2s cubic-bezier(0.16,1,0.3,1) ${delay}ms` }}
        />
      </svg>
      <figcaption>
        <span className="block font-headline text-3xl leading-none">{value}</span>
        <span className="block tr-kicker mt-1" style={{ color: "var(--tr-ink)" }}>{label}</span>
        <span className="block text-xs mt-0.5" style={{ color: "var(--tr-muted)" }}>{sub}</span>
      </figcaption>
    </figure>
  );
};
Gauge.propTypes = {
  value: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  sub: PropTypes.string.isRequired,
  fraction: PropTypes.number.isRequired,
  delay: PropTypes.number.isRequired,
  run: PropTypes.bool.isRequired,
};

const AtlasHero = ({ rows, demo }) => {
  const [ref, seen] = useInView(0.2);
  const t = useMemo(() => totals(rows), [rows]);
  const years = yearsOf(rows);
  const far = howFar(t.distance);
  const hours = t.movingTime / 3600;
  const everests = t.elevationGain / EVEREST;
  const span = years.length > 1 ? `${years[years.length - 1]}–${years[0]}` : String(years[0] || "");

  return (
    <section ref={ref} className="tr-night tr-stars px-6 py-10 md:px-12 md:py-14" aria-labelledby="tr-title">
      <svg viewBox="0 0 800 100" preserveAspectRatio="none" className="absolute inset-x-0 top-[38%] w-full h-24 opacity-60 pointer-events-none" aria-hidden="true">
        <path d={beats} fill="none" stroke="var(--tr-accent)" strokeWidth="2" pathLength="1" className="tr-pulse-line" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="relative flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="tr-kicker mb-0" style={{ color: "var(--tr-accent)" }}>{`Strava · ${span}`}</p>
          {demo && <SampleRibbon dark />}
        </div>
        <div>
          <h1 id="tr-title" className="font-headline text-6xl md:text-8xl font-black leading-none tracking-tight mb-4" style={{ color: "var(--tr-ink)" }}>
            Training.
          </h1>
          <p className="max-w-xl text-lg font-light leading-relaxed mb-0" style={{ color: "var(--tr-muted)" }}>
            {`${t.count.toLocaleString()} early mornings, long Sundays and race days — replayed. Scroll, press play, race your past selves.`}
          </p>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <Odometer value={t.distance / 1000} run={seen} className="font-headline font-black text-7xl md:text-9xl" />
          <span className="tr-kicker pb-3" style={{ color: "var(--tr-muted)" }}>kilometres</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Gauge
            run={seen}
            delay={300}
            value={`${far.earth.toFixed(2)}×`}
            label="Around the Earth"
            sub={far.earth >= 1 ? `${Math.floor(far.earth)} lap${far.earth >= 2 ? "s" : ""} done, ring shows the next` : "of one lap of the equator"}
            fraction={far.earth >= 1 ? far.earth % 1 : far.earth}
          />
          <Gauge
            run={seen}
            delay={500}
            value={`${Math.round(hours).toLocaleString()} h`}
            label="On the move"
            sub={`${(hours / 24).toFixed(1)} days without stopping`}
            fraction={Math.min(1, hours / 24 / 30)}
          />
          {everests >= 0.1 && (
            <Gauge
              run={seen}
              delay={700}
              value={`${everests.toFixed(1)}×`}
              label="Everest climbed"
              sub={`${Math.round(t.elevationGain).toLocaleString()} m of up`}
              fraction={everests % 1 || 1}
            />
          )}
        </div>
        <p className="tr-kicker mb-0 flex items-center gap-2" style={{ color: "var(--tr-muted)" }}>
          <span className="material-symbols-outlined text-base animate-bounce" aria-hidden="true">south</span>
          Scroll to replay
        </p>
      </div>
    </section>
  );
};

AtlasHero.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  demo: PropTypes.bool.isRequired,
};

export default AtlasHero;
