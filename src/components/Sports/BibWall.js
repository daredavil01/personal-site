import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import {
  distanceName, formatDelta, formatDuration, formatPace, formatRaceDay,
} from "../../lib/raceLog";

// The bib wall: every race as its photo — shown whole, anchored to the top so
// faces are never cropped — with the bib it was run in pinned under it.
// The number is the real bib number where the row has one, the race's place
// in the log ("No. 22") where it does not (self-paced runs have no bib). The
// band is the distance; the PB at each distance is stamped. A card opens the
// race page.

/** One band colour per distance. Decoration only: the distance is always named in text. */
export const DISTANCE_COLORS = {
  10: "#12946a", 21: "#e2571f", 35: "#6250d6", 42: "#b22200", 50: "#b9820a",
};
export const distanceColor = (key) => DISTANCE_COLORS[key] || "#57534e";

const realBib = (v) => (v && !/^n\/?a$/i.test(String(v).trim()) ? String(v).trim() : null);

/** The bib itself — also the header of a race page. `size` scales the number. */
export const Bib = ({ race, ordinal, size, className }) => {
  const no = realBib(race.bibNumber);
  return (
    <div className={`ar-bib ${className}`} style={{ "--ar-band": distanceColor(race.distKey) }}>
      <p className="mb-1 mx-4 text-center font-label text-[9px] font-bold uppercase tracking-[0.18em] text-stone-500 truncate">{race.title}</p>
      <div className="ar-bib-band" />
      <p className="ar-bib-no mb-0 mt-2 text-center" style={{ fontSize: size }}>
        {no || (
          <>
            <span style={{ fontSize: "0.42em", verticalAlign: "0.5em", marginRight: "0.12em", letterSpacing: "0.04em" }}>No.</span>
            {ordinal}
          </>
        )}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-dashed border-stone-300 pt-1.5">
        <span className="font-label text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: "#14110f" }}>{distanceName(race.distKey)}</span>
        <span className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500 truncate">{race.city || race.place}</span>
      </div>
    </div>
  );
};
Bib.propTypes = {
  race: PropTypes.shape({}).isRequired,
  ordinal: PropTypes.number,
  size: PropTypes.string,
  className: PropTypes.string,
};
Bib.defaultProps = { ordinal: null, size: "3.4rem", className: "" };

export const BibCards = ({ races, ordinals }) => (
  <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-8 pl-0 mb-0 list-none">
    {races.map((r, i) => {
      const photo = r.slideImages?.[0]?.url;
      return (
        <li key={r.id} className="ar-swap" style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}>
          <Link to={`/sports/${r.id}`} className="ar-card group block no-underline rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary" aria-label={`${r.title}, ${formatRaceDay(r.dateObj)}, ${r.distance}, ${formatDuration(r.secs) || r.time}`}>
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden" style={{ background: "#0d1228" }}>
              {photo ? (
                <img src={photo} alt={r.slideImages[0].alt || ""} loading="lazy" className="ar-card-photo w-full h-full object-cover object-top" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center ar-display font-extrabold text-8xl text-white/10 whitespace-nowrap" aria-hidden="true">{r.distKey != null ? `${r.distKey}K` : ""}</span>
              )}
              <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" aria-hidden="true" />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur font-label text-[10px] font-bold uppercase tracking-wider text-white">{formatRaceDay(r.dateObj) || r.date}</span>
              {r.isBest && <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full font-label text-[10px] font-black uppercase tracking-wider" style={{ background: "#ffc861", color: "#1c1917" }}>Personal best</span>}
              {!r.isBest && r.wasPB && !r.firstAtDistance && <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/85 font-label text-[10px] font-black uppercase tracking-wider text-stone-800" title="A personal best when it was run">Was PB</span>}
              <span className="absolute left-4 bottom-3 right-4 flex items-end justify-between gap-3 text-white">
                <span className="ar-num text-5xl">{formatDuration(r.secs) || r.time}</span>
                {r.pace && <span className="ar-display text-lg font-semibold opacity-90 whitespace-nowrap">{`${formatPace(r.pace)} /km`}</span>}
              </span>
            </div>
            <Bib race={r} ordinal={ordinals.get(r.id)} className="relative mt-3 mx-2 -rotate-1 group-hover:rotate-0 transition-transform duration-500" />
            <p className="mb-0 mt-3 mx-4 flex items-center justify-between gap-3 font-label text-[10px] uppercase tracking-widest" style={{ color: "var(--ar-muted)" }}>
              <span className="truncate">{r.place}</span>
              <span className="whitespace-nowrap font-bold">{r.isBest || r.gapToBest == null ? "" : `${formatDelta(r.gapToBest)} off PB`}</span>
            </p>
          </Link>
        </li>
      );
    })}
  </ul>
);
BibCards.propTypes = {
  races: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  /** race id → its place in the log, oldest = 1. */
  ordinals: PropTypes.instanceOf(Map).isRequired,
};
