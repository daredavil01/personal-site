import React from "react";

// "Worlds explored" progress pill (top-right of the globe). One dot per
// domain, filled with the domain color once visited.
const ExplorationTracker = ({ domains, visitedKeys }) => {
  const visitedCount = domains.filter((d) => visitedKeys.includes(d.key),).length;
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-stone-900/70 backdrop-blur-md border border-stone-200 dark:border-stone-700 shadow-lg"
      title={`Worlds explored: ${visitedCount} of ${domains.length}`}
    >
      <span
        className="material-symbols-outlined text-[14px] text-secondary"
        aria-hidden="true"
      >
        travel_explore
      </span>
      <span className="font-label text-[9px] uppercase tracking-widest font-bold text-stone-700 dark:text-stone-300">
        {visitedCount}/{domains.length}
      </span>
      <span className="flex items-center gap-1" aria-hidden="true">
        {domains.map((d) => (
          <span
            key={d.key}
            className="w-1.5 h-1.5 rounded-full transition-colors duration-500"
            style={{
              backgroundColor: visitedKeys.includes(d.key)
                ? d.color
                : "rgba(120,113,108,0.35)",
            }}
          />
        ))}
      </span>
    </div>
  );
};

export default ExplorationTracker;
