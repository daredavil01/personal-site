import React, { useState } from "react";
import PropTypes from "prop-types";
import { projectShape } from "./shapes";
import StatusBadge from "./StatusBadge";
import TechChips from "./TechChips";
import { coverFor } from "./projectMedia";
import { formatProjectMonth } from "../../lib/projectDate";

// The featured hero. More than one featured project turns this into a manual
// rotator — no autoplay, since it sits at the top of the page and stealing
// focus from a reader is worse than an extra click.
const ProjectSpotlight = ({ projects, onOpen }) => {
  const [index, setIndex] = useState(0);
  if (!projects.length) return null;

  const active = projects[Math.min(index, projects.length - 1)];
  const cover = coverFor(active);

  return (
    <section className="border border-stone-100 dark:border-stone-800 rounded-3xl overflow-hidden bg-stone-50 dark:bg-stone-900/50">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[22rem] bg-stone-100 dark:bg-stone-900">
          {cover ? (
            <img src={cover} alt={active.title} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-stone-300 dark:text-stone-600 text-6xl">wallpaper</span>
            </div>
          )}
          <div className="absolute top-5 left-5 flex items-center gap-2">
            <span className="bg-stone-900/90 backdrop-blur px-3 py-1 font-label text-[10px] uppercase tracking-widest text-white rounded-full">
              Featured
            </span>
            <StatusBadge status={active.status} />
          </div>
        </div>

        <div className="p-8 lg:p-10 flex flex-col gap-5 justify-center">
          <div>
            <p className="mb-2 font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
              {[active.category, active.org, formatProjectMonth(active.date)].filter(Boolean).join(" · ")}
            </p>
            <h2 className="font-headline text-3xl md:text-4xl font-black text-stone-900 dark:text-stone-100 leading-tight mb-2">
              {active.title}
            </h2>
            {active.subtitle && (
              <p className="font-body text-stone-500 dark:text-stone-400 mb-0">{active.subtitle}</p>
            )}
          </div>

          {active.highlights?.length > 0 && (
            <ul className="flex flex-col gap-1.5 m-0 pl-0 list-none">
              {active.highlights.slice(0, 3).map((h) => (
                <li key={h} className="flex gap-2 font-body text-sm text-stone-600 dark:text-stone-300">
                  <span className="material-symbols-outlined text-secondary text-[16px] mt-0.5">check_small</span>
                  {h}
                </li>
              ))}
            </ul>
          )}

          <TechChips tech={active.techStack} size="sm" max={6} />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onOpen(active)}
              className="px-6 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 font-label text-xs uppercase tracking-widest font-bold rounded-xl hover:opacity-90 transition-all"
            >
              Quick look
            </button>
            {active.link && (
              <a
                href={active.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-label text-xs uppercase tracking-widest text-secondary border-b border-secondary/30 pb-1 hover:border-secondary transition-colors"
              >
                View project ↗
              </a>
            )}
          </div>

          {projects.length > 1 && (
            <div className="flex items-center gap-2 pt-1">
              {projects.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  aria-label={`Show ${p.title}`}
                  aria-current={i === index}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                    i === index ? "w-8 bg-secondary" : "w-1.5 bg-stone-300 dark:bg-stone-700"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

ProjectSpotlight.propTypes = {
  projects: PropTypes.arrayOf(projectShape).isRequired,
  onOpen: PropTypes.func.isRequired,
};

export default ProjectSpotlight;
