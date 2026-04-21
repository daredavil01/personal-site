import React from 'react';
import NowSectionHeader from './NowSectionHeader';

const NowRunningSection = ({ running }) => {
  if (!running?.length) return null;
  return (
    <div>
      <NowSectionHeader label="Running & Marathons" icon="directions_run" />
      <ul className="space-y-4">
        {running.map((run, i) => (
          <li key={i} className="flex flex-col gap-1.5">
            <div className="flex items-center flex-wrap gap-2">
              {run.link ? (
                <a
                  href={run.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-sm font-semibold text-stone-800 dark:text-stone-200 hover:text-secondary dark:hover:text-secondary transition-colors"
                >
                  {run.event}
                </a>
              ) : (
                <span className="font-body text-sm font-semibold text-stone-800 dark:text-stone-200">
                  {run.event}
                </span>
              )}
              {run.distance && (
                <span className="font-label text-[10px] bg-secondary/[0.08] text-secondary px-2 py-0.5 rounded font-bold">
                  {run.distance} km
                </span>
              )}
              {run.time && (
                <span className="font-label text-[10px] bg-secondary/[0.08] text-secondary px-2 py-0.5 rounded font-bold">
                  {run.time}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {run.date && (
                <span className="font-label text-[10px] text-stone-400 dark:text-stone-500">
                  {new Date(run.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
              {run.note && (
                <span className="font-body text-xs text-stone-500 dark:text-stone-400 italic">
                  {run.note}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NowRunningSection;
