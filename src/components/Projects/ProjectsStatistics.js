import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { facetsShape, projectShape } from "./shapes";
import { Bars, Tile, tally } from "../common/StatBars";
import { projectYear } from "../../lib/projectDate";

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
