import React from "react";

// A real <h2>, styled as a small label: these name the sections of a page, and
// as <p> they left the outline jumping from the <h1> straight to card <h3>s.
const SectionHeader = ({ label }) => (
  <div className="flex items-center gap-4 mb-6">
    <h2 className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary font-bold whitespace-nowrap mb-0">
      {label}
    </h2>
    <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
  </div>
);

export default SectionHeader;
