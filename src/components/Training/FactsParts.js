import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import CountUp from "../Stats/CountUp";
import { SOURCES } from "../../lib/trainingFacts";

// The pieces both Facts layouts draw with: one fact, the 24-hour strip, the
// weekday bars, the heart-rate zone bar, and the variable inventory. `dark`
// switches them to the atlas's night panels.

export const GROUP_ICONS = {
  volume: "straighten", habits: "schedule", bests: "military_tech", heart: "favorite", form: "directions_run", conditions: "thermostat", strength: "fitness_center",
};

const ink = (dark) => (dark ? "text-slate-100" : "text-stone-900 dark:text-stone-100");
const muted = (dark) => (dark ? "text-slate-400" : "text-stone-500 dark:text-stone-400");

/** One fact. Counts up when it has a plain number and `animate` is on. */
export const Fact = ({ f, dark, animate }) => {
  const big = animate && f.n != null && Number.isFinite(f.n) && f.n >= 1
    ? (
      <>
        <CountUp value={Math.round(f.n)} />
        {f.unit ? <span className={`text-base ml-1 ${muted(dark)}`}>{f.unit}</span> : null}
      </>
    )
    : f.value;
  const body = (
    <>
      <span className={`block font-label text-[10px] uppercase tracking-widest ${muted(dark)}`}>{f.label}</span>
      <span className={`block font-headline text-2xl md:text-3xl leading-tight tabular-nums ${ink(dark)}`}>{big}</span>
      {f.detail && <span className={`block text-xs mt-1 leading-snug ${muted(dark)}`}>{f.detail}</span>}
    </>
  );
  return f.to ? (
    <Link to={f.to} className={`group block no-underline rounded-lg -m-2 p-2 transition-colors ${dark ? "hover:bg-white/5" : "hover:bg-stone-50 dark:hover:bg-stone-800/50"}`}>
      {body}
      <span className={`block font-label text-[10px] uppercase tracking-widest mt-1 ${dark ? "text-[#ff7a59]" : "text-secondary"} opacity-70 group-hover:opacity-100`}>{`${f.when} →`}</span>
    </Link>
  ) : <div>{body}</div>;
};
Fact.propTypes = {
  f: PropTypes.shape({
    label: PropTypes.string, value: PropTypes.string, detail: PropTypes.string, to: PropTypes.string, when: PropTypes.string, n: PropTypes.number, unit: PropTypes.string,
  }).isRequired,
  dark: PropTypes.bool,
  animate: PropTypes.bool,
};
Fact.defaultProps = { dark: false, animate: false };

const HOUR_LABELS = { 0: "12a", 6: "6a", 12: "12p", 18: "6p" };

/** Starts per hour of the day; the peak is the accent, the rest one muted hue. */
export const HourStrip = ({ hours, dark }) => {
  const max = Math.max(1, ...hours);
  const peak = hours.indexOf(max);
  return (
    <figure className="m-0">
      <div className="flex items-end gap-[2px] h-16" role="img" aria-label={`Activity starts by hour; most at ${peak}:00`}>
        {hours.map((n, h) => (
          <span
            // eslint-disable-next-line react/no-array-index-key
            key={h}
            title={`${h}:00 — ${n} starts`}
            className={`flex-1 rounded-t-sm tr-grow ${h === peak ? "bg-[#f5b400]" : dark ? "bg-slate-500/60" : "bg-stone-300 dark:bg-stone-600"}`} // eslint-disable-line no-nested-ternary
            style={{ height: `${Math.max(3, (n / max) * 100)}%`, animationDelay: `${h * 25}ms` }}
          />
        ))}
      </div>
      <div className={`flex justify-between font-label text-[9px] mt-1 ${muted(dark)}`} aria-hidden="true">
        {[0, 6, 12, 18].map((h) => <span key={h}>{HOUR_LABELS[h]}</span>)}
        <span>12a</span>
      </div>
    </figure>
  );
};
HourStrip.propTypes = { hours: PropTypes.arrayOf(PropTypes.number).isRequired, dark: PropTypes.bool };
HourStrip.defaultProps = { dark: false };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Kilometres by weekday, Monday first. */
export const WeekdayBars = ({ weekdayKm, dark }) => {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const max = Math.max(1, ...weekdayKm);
  return (
    <ul className="flex flex-col gap-1 pl-0 mb-0 list-none" aria-label="Kilometres by weekday">
      {order.map((d) => (
        <li key={d} className="flex items-center gap-2 text-xs">
          <span className={`w-8 ${muted(dark)}`}>{DAYS[d]}</span>
          <span className={`flex-1 h-2 rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-stone-100 dark:bg-stone-800"}`}>
            <span className="block h-full rounded-full bg-[#f5b400]" style={{ width: `${(weekdayKm[d] / max) * 100}%`, transition: "width 1s" }} />
          </span>
          <span className={`w-14 text-right tabular-nums ${muted(dark)}`}>{`${Math.round(weekdayKm[d])} km`}</span>
        </li>
      ))}
    </ul>
  );
};
WeekdayBars.propTypes = { weekdayKm: PropTypes.arrayOf(PropTypes.number).isRequired, dark: PropTypes.bool };
WeekdayBars.defaultProps = { dark: false };

/** Share of heart-rate time in Z1–Z5: one hue, lighter to darker. */
export const ZoneBar = ({ zones, dark }) => (
  <figure className="m-0">
    <div className="flex h-5 rounded-md overflow-hidden gap-[2px]" role="img" aria-label={zones.map((z) => `Z${z.zone} ${Math.round(z.share * 100)}%`).join(", ")}>
      {zones.map((z) => (
        <span
          key={z.zone}
          title={`Z${z.zone} (${z.from}+ bpm): ${Math.round(z.share * 100)}%`}
          style={{ width: `${z.share * 100}%`, background: "#dc2626", opacity: 0.18 + z.zone * 0.16 }}
        />
      ))}
    </div>
    <figcaption className={`grid grid-cols-5 mt-1 font-label text-[9px] uppercase tracking-wider ${muted(dark)}`}>
      {zones.map((z) => (
        <span key={z.zone} className="tabular-nums">{`Z${z.zone} ${Math.round(z.share * 100)}%`}</span>
      ))}
    </figcaption>
  </figure>
);
ZoneBar.propTypes = {
  zones: PropTypes.arrayOf(PropTypes.shape({ zone: PropTypes.number, share: PropTypes.number, from: PropTypes.number })).isRequired,
  dark: PropTypes.bool,
};
ZoneBar.defaultProps = { dark: false };

/** Every variable, by where it comes from, with how many activities have it. */
export const Inventory = ({ items, total, dark }) => (
  <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
    {Object.entries(SOURCES).map(([source, title]) => {
      const vars = items.filter((v) => v.source === source);
      if (!vars.length) return null;
      return (
        <section key={source}>
          <h4 className={`font-label text-[10px] uppercase tracking-widest font-bold mb-2 ${dark ? "text-[#ff7a59]" : "text-secondary"}`}>{`${title} · ${vars.length}`}</h4>
          <ul className="flex flex-col gap-1.5 pl-0 mb-0 list-none">
            {vars.map((v) => (
              <li key={v.key} className="grid grid-cols-[1fr_5rem_3.5rem] items-center gap-2 text-xs">
                <span className={`truncate ${ink(dark)}`}>
                  {v.label}
                  {v.unit && <span className={muted(dark)}>{` · ${v.unit}`}</span>}
                </span>
                <span className={`h-1.5 rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-stone-100 dark:bg-stone-800"}`}>
                  <span className="block h-full rounded-full bg-[#f5b400]" style={{ width: `${(v.count / total) * 100}%` }} />
                </span>
                <span className={`text-right tabular-nums ${muted(dark)}`}>{`${v.count}/${total}`}</span>
              </li>
            ))}
          </ul>
        </section>
      );
    })}
  </div>
);
Inventory.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string, label: PropTypes.string, unit: PropTypes.string, source: PropTypes.string, count: PropTypes.number })).isRequired,
  total: PropTypes.number.isRequired,
  dark: PropTypes.bool,
};
Inventory.defaultProps = { dark: false };

/** The figure a group carries, if any. */
export const GroupViz = ({ group, dark }) => {
  if (group.id === "habits" && group.viz) {
    return (
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <HourStrip hours={group.viz.hours} dark={dark} />
        <WeekdayBars weekdayKm={group.viz.weekdayKm} dark={dark} />
      </div>
    );
  }
  if (group.id === "heart" && group.viz) return <div className="mt-4"><ZoneBar zones={group.viz.zones} dark={dark} /></div>;
  return null;
};
GroupViz.propTypes = { group: PropTypes.shape({ id: PropTypes.string, viz: PropTypes.shape({}) }).isRequired, dark: PropTypes.bool };
GroupViz.defaultProps = { dark: false };
