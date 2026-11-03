import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { FAMILY_LABELS, totalsByFamily, totalsByYear } from "../../lib/training";
import { formatDistance, formatDuration } from "../../lib/strava";
import { getBestEfforts, getGear } from "../../lib/api/training";

// Totals per year and sport, the fastest time at each standard distance per
// year (activity_best_efforts RPC), and the shoes and bikes with their mileage.
// Every number is computed from the public rows except gear distance, which is
// Strava's own figure. A figure with no value is left out, never shown as 0.

// Strava's best-effort names, shortest first.
const EFFORT_ORDER = ["400m", "1/2 mile", "1K", "1 mile", "2 mile", "5K", "10K", "15K", "10 mile", "20K",
  "Half-Marathon", "30K", "Marathon", "50K"];
const effortRank = (name) => {
  const i = EFFORT_ORDER.findIndex((n) => n.toLowerCase() === String(name).toLowerCase());
  return i < 0 ? 99 : i;
};

const th = "px-3 py-2 font-label text-[10px] uppercase tracking-widest text-stone-400 text-left";
const td = "px-3 py-2 text-sm tabular-nums whitespace-nowrap";

const Section = ({ title, children }) => (
  <section className="flex flex-col gap-3">
    <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100 mb-0">{title}</h2>
    {children}
  </section>
);

Section.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node.isRequired };

const StatsPRs = ({ rows }) => {
  const [efforts, setEfforts] = useState(null);
  const [gear, setGear] = useState(null);

  useEffect(() => {
    let live = true;
    getBestEfforts().then((d) => live && setEfforts(d)).catch(() => live && setEfforts([]));
    getGear().then((d) => live && setGear(d)).catch(() => live && setGear([]));
    return () => { live = false; };
  }, []);

  const years = useMemo(() => totalsByYear(rows), [rows]);
  const families = useMemo(() => totalsByFamily(rows), [rows]);

  // name → { year → effort }, and every year that has one.
  const effortTable = useMemo(() => {
    const byName = new Map();
    const ys = new Set();
    (efforts || []).forEach((e) => {
      if (!byName.has(e.name)) byName.set(e.name, {});
      byName.get(e.name)[e.year] = e;
      ys.add(e.year);
    });
    const names = [...byName.keys()].sort((a, b) => effortRank(a) - effortRank(b));
    const best = (name) => Object.values(byName.get(name)).reduce((m, e) => (!m || e.elapsed_time < m.elapsed_time ? e : m), null);
    return {
      names, years: [...ys].sort((a, b) => b - a), byName, best,
    };
  }, [efforts]);

  return (
    <div className="flex flex-col gap-10">
      <Section title="By sport">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {families.map((f) => (
            <div key={f.family} className="p-4 rounded-xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900">
              <p className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">{FAMILY_LABELS[f.family]}</p>
              <p className="font-headline text-3xl text-stone-900 dark:text-stone-100 mb-1">{f.count}</p>
              <p className="font-body text-xs text-stone-500 dark:text-stone-400 mb-0">
                {[f.distance ? formatDistance(f.distance) : null, f.movingTime ? `${Math.round(f.movingTime / 3600)} h` : null]
                  .filter(Boolean).join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="By year">
        <div className="overflow-x-auto border border-stone-100 dark:border-stone-800 rounded-xl">
          <table className="w-full border-collapse">
            <thead className="bg-stone-50 dark:bg-stone-900/60">
              <tr>
                <th className={th} scope="col">Year</th>
                <th className={th} scope="col">Activities</th>
                <th className={th} scope="col">Distance</th>
                <th className={th} scope="col">Time</th>
                <th className={th} scope="col">Climb</th>
                <th className={th} scope="col">Run km</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.year} className="border-t border-stone-100 dark:border-stone-800">
                  <td className={td}><Link to={`/training?year=${y.year}`} className="text-secondary no-underline">{y.year}</Link></td>
                  <td className={td}>{y.count}</td>
                  <td className={td}>{formatDistance(y.distance) || "—"}</td>
                  <td className={td}>{y.movingTime ? `${Math.round(y.movingTime / 3600)} h` : "—"}</td>
                  <td className={td}>{y.elevationGain ? `${Math.round(y.elevationGain).toLocaleString()} m` : "—"}</td>
                  <td className={td}>{y.byFamily.run ? formatDistance(y.byFamily.run.distance) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {effortTable.names.length > 0 && (
        <Section title="Best efforts">
          <p className="font-body text-sm text-stone-500 dark:text-stone-400 mb-0">
            The fastest stretch at each distance inside any run, per year — Strava&apos;s best efforts.
          </p>
          <div className="overflow-x-auto border border-stone-100 dark:border-stone-800 rounded-xl">
            <table className="w-full border-collapse">
              <thead className="bg-stone-50 dark:bg-stone-900/60">
                <tr>
                  <th className={th} scope="col">Distance</th>
                  <th className={th} scope="col">Best</th>
                  {effortTable.years.map((y) => <th key={y} className={th} scope="col">{y}</th>)}
                </tr>
              </thead>
              <tbody>
                {effortTable.names.map((name) => {
                  const best = effortTable.best(name);
                  return (
                    <tr key={name} className="border-t border-stone-100 dark:border-stone-800">
                      <th scope="row" className={`${td} text-left font-normal`}>{name}</th>
                      <td className={`${td} font-bold`}>
                        <Link to={`/training/${best.activity_id}`} className="text-secondary no-underline">
                          {formatDuration(best.elapsed_time)}
                        </Link>
                      </td>
                      {effortTable.years.map((y) => {
                        const e = effortTable.byName.get(name)[y];
                        return (
                          <td key={y} className={`${td} text-stone-500 dark:text-stone-400`}>
                            {e ? <Link to={`/training/${e.activity_id}`} className="text-inherit no-underline hover:text-secondary">{formatDuration(e.elapsed_time)}</Link> : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {gear && gear.length > 0 && (
        <Section title="Gear">
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-0 mb-0 list-none">
            {gear.map((g) => (
              <li key={g.id} className="p-4 rounded-xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center gap-4">
                <span className="material-symbols-outlined text-3xl text-secondary" aria-hidden="true">
                  {g.kind === "bike" ? "pedal_bike" : "steps"}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-body text-sm text-stone-900 dark:text-stone-100 truncate">
                    {g.name || [g.brand_name, g.model_name].filter(Boolean).join(" ")}
                  </span>
                  <span className="block font-label text-[10px] uppercase tracking-widest text-stone-400">
                    {[g.kind, g.retired ? "retired" : null, g.is_primary ? "primary" : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {g.distance > 0 && <span className="font-headline text-xl tabular-nums">{formatDistance(g.distance)}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
};

StatsPRs.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number })).isRequired,
};

export default StatsPRs;
