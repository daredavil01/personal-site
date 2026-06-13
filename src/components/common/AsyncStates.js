import React from "react";

// Shared loading / error / empty placeholders for Supabase-backed pages.
export const LoadingBlock = ({ label = "Loading…" }) => (
  <div className="w-full py-24 flex flex-col items-center justify-center gap-3 text-stone-400 dark:text-stone-500">
    <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
    <p className="font-label text-xs uppercase tracking-widest mb-0">{label}</p>
  </div>
);

export const ErrorBlock = ({ label = "Couldn't load this content. Please try again later." }) => (
  <div className="w-full py-24 flex flex-col items-center justify-center gap-3 text-stone-400 dark:text-stone-500">
    <span className="material-symbols-outlined text-3xl">cloud_off</span>
    <p className="font-label text-xs uppercase tracking-widest mb-0">{label}</p>
  </div>
);

export const EmptyBlock = ({ label = "Nothing here yet." }) => (
  <div className="w-full py-24 flex flex-col items-center justify-center gap-3 text-stone-400 dark:text-stone-500">
    <span className="material-symbols-outlined text-3xl">inbox</span>
    <p className="font-label text-xs uppercase tracking-widest mb-0">{label}</p>
  </div>
);
