import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { facetEntryShape, facetsShape, projectShape } from "./shapes";
import { colorForTag } from "../../lib/generativeArt";
import { projectYear } from "../../lib/projectDate";

const Tile = ({ label, value, sub }) => (
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

const Bars = ({ title, rows, onSelect, colored }) => {
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
              <span className="w-6 shrink-0 text-right font-label text-[10px] text-stone-400">{count}</span>
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
  rows: PropTypes.arrayOf(facetEntryShape).isRequired,
  onSelect: PropTypes.func,
  colored: PropTypes.bool,
};
Bars.defaultProps = { onSelect: null, colored: false };

const tally = (projects, pick) => {
  const counts = new Map();
  projects.forEach((p) => {
    const value = pick(p);
    if (!value) return;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};

// Dashboard over whatever is currently filtered, so the numbers always describe
// what the visitor is actually looking at.
const ProjectsStatistics = ({ projects, facets, onSelectTech }) => {
  const stats = useMemo(() => {
    const years = projects.map((p) => projectYear(p.date)).filter(Boolean).sort();
    const live = projects.filter((p) => p.status === "Live").length;
    return {
      total: projects.length,
      live,
      tech: facets.tech.length,
      span: years.length ? `${years[0]}–${years[years.length - 1]}` : "—",
      topTech: facets.tech[0]?.name ?? "—",
    };
  }, [projects, facets]);

  const byYear = useMemo(
    () => tally(projects, (p) => projectYear(p.date)).sort((a, b) => b.name.localeCompare(a.name)),
    [projects],
  );

  if (!projects.length) return null;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Projects" value={stats.total} />
        <Tile label="Live" value={stats.live} sub="Shipped and running" />
        <Tile label="Technologies" value={stats.tech} sub={`Most used: ${stats.topTech}`} />
        <Tile label="Years active" value={stats.span} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Bars title="Projects per year" rows={byYear} />
        <Bars
          title="Tech stack — click to filter"
          rows={facets.tech.slice(0, 10)}
          onSelect={onSelectTech}
          colored
        />
        <Bars title="By category" rows={tally(projects, (p) => p.category)} />
        <Bars title="By status" rows={tally(projects, (p) => p.status)} />
      </div>
    </div>
  );
};

ProjectsStatistics.propTypes = {
  projects: PropTypes.arrayOf(projectShape).isRequired,
  facets: facetsShape.isRequired,
  onSelectTech: PropTypes.func.isRequired,
};

export default ProjectsStatistics;
