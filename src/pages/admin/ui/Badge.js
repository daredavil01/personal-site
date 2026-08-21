import React from "react";

const TONES = {
  neutral: "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300",
  accent: "bg-admin-50 dark:bg-admin-950 text-admin-700 dark:text-admin-300",
  success: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400",
  warning: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400",
  danger: "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400",
};

const Badge = ({ tone = "neutral", className = "", children }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[11px] font-medium leading-4 whitespace-nowrap ${TONES[tone] ?? TONES.neutral} ${className}`}>
    {children}
  </span>
);

export default Badge;
