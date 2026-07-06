import React from "react";
import { Link } from "react-router-dom";

// Glass card (top-left of the globe) describing the currently active domain.
// Re-renders as the camera drifts between worlds.
const DomainInfoCard = ({ domain, count }) => (
  <div
    className="max-w-[220px] sm:max-w-[280px] px-4 py-3 rounded-xl bg-white/80 dark:bg-stone-900/70 backdrop-blur-md border shadow-lg transition-colors duration-500"
    style={{ borderColor: `${domain.color}66` }}
  >
    <div className="flex items-center gap-2 mb-1">
      <span
        className="material-symbols-outlined text-[20px]"
        style={{ color: domain.color }}
        aria-hidden="true"
      >
        {domain.icon}
      </span>
      <p className="font-label text-[11px] uppercase tracking-[0.2em] font-bold text-stone-800 dark:text-stone-100 mb-0">
        {domain.label}
      </p>
      <span className="ml-auto font-label text-[9px] uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {count} {count === 1 ? "item" : "items"}
      </span>
    </div>
    <p className="hidden sm:block font-body text-xs text-stone-600 dark:text-stone-300 leading-relaxed mb-2">
      {domain.desc}
    </p>
    <Link
      to={domain.path}
      className="font-label text-[9px] uppercase tracking-[0.2em] font-bold inline-flex items-center gap-1 no-underline hover:gap-2 transition-all"
      style={{ color: domain.color }}
    >
      View all
      <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
        arrow_right_alt
      </span>
    </Link>
  </div>
);

export default DomainInfoCard;
