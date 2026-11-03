import React from "react";
import PropTypes from "prop-types";
import { formatDistance } from "../../../lib/strava";
import { useInView } from "../shared";

// The shoe rack: every pair's mileage worn into its sole, against the
// ~800 km a running shoe is usually retired at; the bike's wheel turns.
// Mileage is summed from the imported activities that used each item.

const RETIRE = 800000;

const Sole = ({ fraction, run, delay }) => (
  <svg viewBox="0 0 220 80" className="w-full h-auto" aria-hidden="true">
    <defs>
      <clipPath id={`tr-sole-${delay}`}>
        <path d="M20 40 C20 12 70 8 120 12 C170 16 205 22 205 40 C205 58 170 64 120 68 C70 72 20 68 20 40 Z" />
      </clipPath>
      <pattern id="tr-tread" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
        <rect width="12" height="12" fill="#3a2a22" />
        <rect width="6" height="12" fill="#4d3a30" />
      </pattern>
    </defs>
    <path d="M20 40 C20 12 70 8 120 12 C170 16 205 22 205 40 C205 58 170 64 120 68 C70 72 20 68 20 40 Z" fill="url(#tr-tread)" />
    <g clipPath={`url(#tr-sole-${delay})`}>
      <rect
        x="0"
        y="0"
        height="80"
        width={run ? 20 + Math.min(1.15, fraction) * 185 : 0}
        fill={fraction >= 1 ? "#b22200" : "#eb6834"}
        fillOpacity="0.85"
        style={{ transition: `width 1.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms` }}
      />
    </g>
    <line x1="205" x2="205" y1="6" y2="74" stroke="#78716c" strokeDasharray="3 3" />
  </svg>
);
Sole.propTypes = { fraction: PropTypes.number.isRequired, run: PropTypes.bool.isRequired, delay: PropTypes.number.isRequired };

const ShoeRack = ({ gear }) => {
  const [ref, seen] = useInView(0.25);
  const shoes = gear.filter((g) => g.kind === "shoe" && g.distance > 0 && !g.retired);
  const retired = gear.filter((g) => g.kind === "shoe" && g.distance > 0 && g.retired);
  const bikes = gear.filter((g) => g.kind === "bike" && g.distance > 0);
  if (!shoes.length && !bikes.length && !retired.length) return null;
  return (
    <section ref={ref} className="rounded-3xl px-4 py-8 md:px-10 md:py-10 bg-[#f6efe6] dark:bg-stone-900 border border-[#e8dccb] dark:border-stone-800" aria-labelledby="tr-gear-title">
      <p className="tr-kicker mb-2 text-[#b22200]">Chapter six</p>
      <h2 id="tr-gear-title" className="font-headline text-3xl md:text-5xl mb-1 text-stone-900 dark:text-stone-100">The shoe rack</h2>
      <p className="text-sm mb-6 max-w-lg text-stone-600 dark:text-stone-400">
        Kilometres worn into every pair. The dashed line is the 800 km most shoes retire at.
      </p>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pl-0 mb-0 list-none">
        {shoes.map((g, i) => (
          <li key={g.id} className={`p-4 rounded-2xl bg-white dark:bg-stone-950 border border-[#e8dccb] dark:border-stone-800 tr-rise ${g.retired ? "opacity-75" : ""}`} style={{ animationDelay: `${i * 90}ms` }}>
            <Sole fraction={g.distance / RETIRE} run={seen} delay={i * 160} />
            <div className="flex items-baseline justify-between gap-2 mt-2">
              <span className="font-body text-sm text-stone-900 dark:text-stone-100 truncate">{g.name}</span>
              <span className="font-headline text-xl tabular-nums text-stone-900 dark:text-stone-100">{formatDistance(g.distance)}</span>
            </div>
            <p className="mb-0 font-label text-[10px] uppercase tracking-widest text-stone-500">
              {[g.brand_name, g.retired ? "retired" : null, g.is_primary ? "daily pair" : null, g.distance > RETIRE ? `${Math.round((g.distance / RETIRE) * 100)}% of a life` : null].filter(Boolean).join(" · ")}
            </p>
          </li>
        ))}
        {bikes.map((g) => (
          <li key={g.id} className="p-4 rounded-2xl bg-white dark:bg-stone-950 border border-[#e8dccb] dark:border-stone-800 flex items-center gap-4">
            <svg viewBox="0 0 60 60" className="w-16 h-16 shrink-0 text-stone-700 dark:text-stone-300" aria-hidden="true">
              <g className="tr-spin">
                <circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" strokeWidth="4" />
                {[0, 30, 60, 90, 120, 150].map((a) => (
                  <line key={a} x1="30" y1="30" x2={30 + 24 * Math.cos((a * Math.PI) / 90)} y2={30 + 24 * Math.sin((a * Math.PI) / 90)} stroke="currentColor" strokeWidth="1" />
                ))}
              </g>
            </svg>
            <span className="flex-1 min-w-0">
              <span className="block font-body text-sm text-stone-900 dark:text-stone-100 truncate">{g.name}</span>
              <span className="block font-label text-[10px] uppercase tracking-widest text-stone-500">{g.brand_name}</span>
            </span>
            <span className="font-headline text-xl tabular-nums text-stone-900 dark:text-stone-100">{formatDistance(g.distance)}</span>
          </li>
        ))}
      </ul>
      {retired.length > 0 && (
        <div className="mt-6">
          <p className="tr-kicker mb-2 text-stone-500">{`Retired · ${retired.length} pairs · ${formatDistance(retired.reduce((a, g) => a + g.distance, 0))}`}</p>
          <ul className="flex flex-wrap gap-2 pl-0 mb-0 list-none">
            {retired.map((g) => (
              <li key={g.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 dark:bg-stone-950 border border-[#e8dccb] dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300">
                <span className="material-symbols-outlined text-sm" aria-hidden="true">steps</span>
                {g.name}
                <span className="tabular-nums text-stone-400">{formatDistance(g.distance)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

ShoeRack.propTypes = { gear: PropTypes.arrayOf(PropTypes.shape({})).isRequired };

export default ShoeRack;
