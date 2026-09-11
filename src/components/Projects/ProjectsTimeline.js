import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { projectShape } from "./shapes";
import StatusBadge from "./StatusBadge";
import TechChips from "./TechChips";
import { formatProjectMonth, projectYear } from "../../lib/projectDate";

const UNDATED = "No date yet";

// Chronological spine, grouped by year. Undated projects collect in their own
// group at the end rather than being dropped — they still exist.
const ProjectsTimeline = ({ projects, onOpen }) => {
  const groups = useMemo(() => {
    const byYear = new Map();
    projects.forEach((p) => {
      const key = projectYear(p.date) ?? UNDATED;
      if (!byYear.has(key)) byYear.set(key, []);
      byYear.get(key).push(p);
    });
    return [...byYear.entries()].sort(([a], [b]) => {
      if (a === UNDATED) return 1;
      if (b === UNDATED) return -1;
      return b.localeCompare(a);
    });
  }, [projects]);

  return (
    <div className="relative w-full">
      {/* The spine */}
      <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-stone-200 dark:bg-stone-800" aria-hidden="true" />

      <div className="flex flex-col gap-10">
        {groups.map(([year, items]) => (
          <section key={year}>
            <div className="relative flex md:justify-center mb-6">
              <h3 className="ml-10 md:ml-0 font-headline text-2xl font-black text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-950 px-4 z-10 mb-0">
                {year}
              </h3>
            </div>

            <div className="flex flex-col gap-6">
              {items.map((project, i) => (
                <div
                  key={project.id}
                  className={`relative pl-10 md:pl-0 md:w-1/2 ${
                    i % 2 === 0 ? "md:pr-10 md:text-right" : "md:ml-auto md:pl-10"
                  }`}
                >
                  {/* Node */}
                  <span
                    className={`absolute top-6 w-3 h-3 rounded-full bg-secondary ring-4 ring-white dark:ring-stone-950 left-[0.65rem] ${
                      i % 2 === 0 ? "md:left-auto md:-right-1.5" : "md:-left-1.5"
                    }`}
                    aria-hidden="true"
                  />

                  <button
                    type="button"
                    onClick={() => onOpen(project)}
                    className="w-full text-left md:text-inherit bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl p-5 hover:border-secondary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary transition-colors"
                  >
                    <div className={`flex items-center gap-2 mb-2 ${i % 2 === 0 ? "md:justify-end" : ""}`}>
                      <span className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
                        {formatProjectMonth(project.date) || "Undated"}
                      </span>
                      <StatusBadge status={project.status} />
                    </div>
                    <h4 className="font-headline text-lg font-bold text-stone-800 dark:text-stone-100 mb-1">
                      {project.title}
                    </h4>
                    {project.subtitle && (
                      <p className="font-body text-sm text-stone-500 dark:text-stone-400 mb-2">{project.subtitle}</p>
                    )}
                    <div className={`flex ${i % 2 === 0 ? "md:justify-end" : ""}`}>
                      <TechChips tech={project.techStack} size="xs" max={4} />
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

ProjectsTimeline.propTypes = {
  projects: PropTypes.arrayOf(projectShape).isRequired,
  onOpen: PropTypes.func.isRequired,
};

export default ProjectsTimeline;
