import React from 'react';

const NowSectionHeader = ({ label, icon }) => (
  <div className="flex items-center gap-2 mb-4">
    {icon && (
      <span className="material-symbols-outlined text-secondary text-base">{icon}</span>
    )}
    <span className="font-label text-[10px] uppercase tracking-[0.2em] text-secondary font-bold">
      {label}
    </span>
  </div>
);

export default NowSectionHeader;
