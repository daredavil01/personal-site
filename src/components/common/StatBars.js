import React from "react";
import PropTypes from "prop-types";
import { colorForTag } from "../../lib/generativeArt";

// The KPI tile and horizontal bar chart shared by the /projects and /books
// statistics views. Lifted out of ProjectsStatistics.js when the books page
// needed the same two primitives — one definition, so the two dashboards can't
// drift apart visually.

const entryShape = PropTypes.shape({
  name: PropTypes.string,
  count: PropTypes.number,
});

export const Tile = ({ label, value, sub }) => (
  <div className="bg-stone-50 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800 rounded-2xl p-5">
    <p className="mb-1 font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">{label}</p>
    <p className="mb-0 font-headline text-3xl font-black text-stone-900 dark:text-stone-100">{value}</p>
    {sub && <p className="mb-0 mt-1 font-body text-xs text-stone-400 dark:text-stone-500">{sub}</p>}
  </div>
);

Tile.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  sub: PropTypes.string,
};
Tile.defaultProps = { sub: "" };

export const Bars = ({
  title, rows, onSelect, colored, formatValue,
}) => {
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <section className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl p-6">
      <h3 className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-4">{title}</h3>
      <div className="flex flex-col gap-2.5">
        {rows.map(({ name, count }) => {
          const width = `${Math.round((count / max) * 100)}%`;
          const color = colored ? colorForTag(name) : undefined;
          const body = (
            <>
              <span className="w-28 shrink-0 truncate font-body text-xs text-stone-600 dark:text-stone-300">{name}</span>
              <span className="flex-1 h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                <span
                  className="block h-full rounded-full bg-secondary"
                  style={{ width, backgroundColor: color }}
                />
              </span>
              <span className="w-10 shrink-0 text-right font-label text-[10px] text-stone-400">
                {formatValue ? formatValue(count) : count}
              </span>
            </>
          );
          return onSelect ? (
            <button
              key={name}
              type="button"
              onClick={() => onSelect(name)}
              className="flex items-center gap-3 text-left rounded-md hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              {body}
            </button>
          ) : (
            <div key={name} className="flex items-center gap-3">{body}</div>
          );
        })}
      </div>
    </section>
  );
};

Bars.propTypes = {
  title: PropTypes.string.isRequired,
  rows: PropTypes.arrayOf(entryShape).isRequired,
  onSelect: PropTypes.func,
  colored: PropTypes.bool,
  formatValue: PropTypes.func,
};
Bars.defaultProps = { onSelect: null, colored: false, formatValue: null };

/** Count rows by whatever `pick` returns, most-common first. */
export const tally = (rows, pick) => {
  const counts = new Map();
  rows.forEach((row) => {
    const value = pick(row);
    if (!value) return;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};
