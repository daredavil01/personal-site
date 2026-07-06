import React from "react";

const SectionHeader = ({ label }) => (
  <div className="flex items-center gap-4 mb-6">
    <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary font-bold whitespace-nowrap mb-0">
      {label}
    </p>
    <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
  </div>
);

export default SectionHeader;
