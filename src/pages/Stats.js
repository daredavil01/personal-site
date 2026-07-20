import React from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import StatsAlmanac from "../components/Stats/StatsAlmanac";
import StatsClassic from "../components/Stats/StatsClassic";

// Two renderings of the same numbers: the almanac (dynamic, default) and the
// pre-almanac layout (?layout=classic). The choice lives in the URL so links
// carry it. (`view` is off-limits — useViewMode reserves it for the
// atlas/classic shell switch.)
const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

const Stats = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("layout") === "classic" ? "classic" : "almanac";
  const setView = (next) => {
    const params = new URLSearchParams(searchParams);
    params.set("layout", next);
    setSearchParams(params, { replace: true });
  };

  return (
    <PageShell region="person">
      <div className="flex flex-col gap-4 w-full">
        <div className="flex justify-end gap-1">
          {[{ value: "almanac", label: "Almanac" }, { value: "classic", label: "Classic" }].map(({ value: v, label }) => (
            <div
              key={v}
              role="button"
              tabIndex={0}
              aria-pressed={view === v}
              onClick={() => setView(v)}
              onKeyDown={keyActivate(() => setView(v))}
              className={`px-2.5 py-1 rounded-lg font-label text-[10px] uppercase tracking-wider cursor-pointer transition-colors ${
                view === v
                  ? "bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900"
                  : "bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:text-secondary dark:hover:text-secondary border border-stone-200 dark:border-stone-700"
              }`}
            >
              {label}
            </div>
          ))}
        </div>
        {view === "classic" ? <StatsClassic /> : <StatsAlmanac />}
      </div>
    </PageShell>
  );
};

export default Stats;
