import React, { useState, useEffect } from "react";
import MonthSection from "./MonthSection";

// Legacy theme CSS (static/css/components/_button.scss) force-styles bare
// <button> elements (fixed height, nowrap, !important color), so the pills
// use div[role="button"] like the rest of the site.
const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

const NowDocument = ({ months }) => {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    setSelected(0);
  }, [months]);

  if (!months?.length) return null;
  const active = months[selected] || months[0];

  return (
    <article className="w-full">
      <div className="flex items-center gap-4 mb-6">
        <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary font-bold whitespace-nowrap mb-0">
          Timeline
        </p>
        <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
        <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-0">
          {months.length} months logged
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-8 -mx-1 px-1">
        {months.map((m, i) => (
          <div
            key={`${m.month}-${m.year}`}
            role="button"
            tabIndex={0}
            onClick={() => setSelected(i)}
            onKeyDown={keyActivate(() => setSelected(i))}
            className={`flex items-center gap-2 shrink-0 px-4 py-2 rounded-full border font-label text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
              i === selected
                ? "bg-secondary text-white border-secondary shadow-lg shadow-secondary/20"
                : "bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-secondary hover:text-secondary dark:hover:text-secondary"
            }`}
          >
            {m.isCurrent && (
              <span
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  i === selected ? "bg-white" : "bg-secondary"
                }`}
              />
            )}
            {m.month.slice(0, 3)} {m.year}
          </div>
        ))}
      </div>

      <MonthSection month={active} />
    </article>
  );
};

export default NowDocument;
