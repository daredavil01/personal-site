import React from 'react';
import NowSectionHeader from './NowSectionHeader';

const NowProjectsSection = ({ projects }) => {
  if (!projects?.length) return null;
  return (
    <div>
      <NowSectionHeader label="Projects" icon="terminal" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((project, i) => (
          <div
            key={i}
            className="bg-secondary/[0.03] dark:bg-secondary/[0.05] border border-secondary/10 dark:border-secondary/20 rounded-lg p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-headline text-sm font-bold text-stone-800 dark:text-stone-200">
                {project.name}
              </span>
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-secondary hover:text-secondary/70 transition-colors"
                  aria-label={`Open ${project.name}`}
                >
                  <span className="material-symbols-outlined text-base">arrow_outward</span>
                </a>
              )}
            </div>
            {project.description && (
              <p className="font-body text-xs text-stone-500 dark:text-stone-400 mt-2 leading-relaxed">
                {project.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NowProjectsSection;
