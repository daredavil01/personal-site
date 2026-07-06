import React from "react";

// One-time "drag to explore" hint shown centered over the globe until the
// visitor interacts (dismissal + persistence handled by the parent).
const CoachMark = () => (
  <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
    <div className="globe-pop-in flex flex-col items-center gap-3 px-6 py-5 rounded-2xl bg-stone-900/70 text-white backdrop-blur-md border border-white/10 shadow-2xl">
      <span className="material-symbols-outlined text-3xl globe-drag-hint" aria-hidden="true">
        drag_pan
      </span>
      <p className="font-label text-[10px] uppercase tracking-[0.25em] font-bold mb-0">
        Drag to explore my world
      </p>
    </div>
  </div>
);

export default CoachMark;
