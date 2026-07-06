import React from "react";

// Always-visible chip strip under the globe: one chip per domain with item
// count. Clicking a chip flies the camera to that domain.
const DomainLegend = ({ domains, counts, activeIndex, visitedKeys, onSelect }) => (
  <div
    className="globe-chip-scroll flex items-center gap-2 overflow-x-auto -mx-1 px-1 py-1"
    role="group"
    aria-label="Globe worlds"
  >
    {domains.map((d, i) => {
      const isActive = activeIndex === i;
      return (
        <button
          key={d.key}
          type="button"
          onClick={() => onSelect(i)}
          aria-pressed={isActive}
          className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border font-label text-[9px] uppercase tracking-widest font-bold transition-all duration-300 ${
            isActive
              ? "shadow-md"
              : "border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:border-stone-400 dark:hover:border-stone-500"
          }`}
          style={
            isActive
              ? { borderColor: d.color, color: d.color, backgroundColor: `${d.color}14` }
              : undefined
          }
        >
          <span
            className="material-symbols-outlined text-[14px]"
            style={{ color: d.color }}
            aria-hidden="true"
          >
            {d.icon}
          </span>
          {d.label}
          <span
            className={`px-1.5 py-0.5 rounded-full text-[8px] ${
              isActive
                ? "bg-white/60 dark:bg-stone-900/60"
                : "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400"
            }`}
          >
            {counts[d.key] || 0}
          </span>
          {visitedKeys.includes(d.key) && (
            <span
              className="material-symbols-outlined text-[12px]"
              style={{ color: d.color }}
              title="Explored"
              aria-label="Explored"
            >
              check_circle
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default DomainLegend;
