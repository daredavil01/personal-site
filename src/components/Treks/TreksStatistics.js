import React, { useMemo } from "react";
import treksData from "../../data/treks";
import TreksTimeline from "./TreksTimeline";

const parseDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  const [day, month, year] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const TreksStatistics = () => {
  const stats = useMemo(() => {
    const yearCounts = {};
    const difficultyCounts = {};
    let treksWithBlog = 0;

    treksData.forEach((trek) => {
      const year = parseDate(trek.date).getFullYear();
      yearCounts[year] = (yearCounts[year] || 0) + 1;

      const level = trek.endurance_level;
      if (level) {
        difficultyCounts[level] = (difficultyCounts[level] || 0) + 1;
      }

      if (trek.blog_link) treksWithBlog += 1;
    });

    let mostActiveYear = { year: "-", count: 0 };
    Object.entries(yearCounts).forEach(([y, count]) => {
      if (count > mostActiveYear.count) mostActiveYear = { year: y, count };
    });

    const yearlyBreakdown = Object.entries(yearCounts)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year - a.year);

    const difficultyBreakdown = Object.entries(difficultyCounts)
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total: treksData.length,
      treksWithBlog,
      yearsActive: Object.keys(yearCounts).length,
      mostActiveYear,
      yearlyBreakdown,
      difficultyBreakdown,
      difficultyCounts,
    };
  }, []);

  const difficultyColors = {
    Easy: {
      bg: "bg-green-500",
      text: "text-green-600 dark:text-green-400",
      cardBg:
        "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/40",
    },
    Medium: {
      bg: "bg-yellow-500",
      text: "text-yellow-600 dark:text-yellow-400",
      cardBg:
        "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/40",
    },
    Hard: {
      bg: "bg-red-500",
      text: "text-red-600 dark:text-red-400",
      cardBg:
        "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/40",
    },
  };

  const defaultColors = {
    bg: "bg-stone-500",
    text: "text-stone-600 dark:text-stone-400",
    cardBg:
      "bg-stone-50 dark:bg-stone-900/10 border-stone-200 dark:border-stone-800/40",
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/40 p-5 rounded-xl text-center flex flex-col items-center justify-center">
          <div className="font-headline text-5xl text-green-600 dark:text-green-400">
            {stats.total}
          </div>
          <div className="font-label text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-widest mt-2">
            Total Treks
          </div>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/40 p-5 rounded-xl text-center flex flex-col items-center justify-center">
          <div className="font-headline text-5xl text-indigo-600 dark:text-indigo-400">
            {stats.treksWithBlog}
          </div>
          <div className="font-label text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-widest mt-2">
            With Blog Posts
          </div>
        </div>
        <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-800/40 p-5 rounded-xl text-center flex flex-col items-center justify-center">
          <div className="font-headline text-5xl text-teal-600 dark:text-teal-400">
            {stats.yearsActive}
          </div>
          <div className="font-label text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-widest mt-2">
            Years Active
          </div>
        </div>
      </div>

      {/* Difficulty sub-summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.difficultyBreakdown.map(({ level, count }) => {
          const colors = difficultyColors[level] || defaultColors;
          return (
            <div
              key={level}
              className={`border p-4 rounded-xl text-center ${colors.cardBg}`}
            >
              <div className={`font-headline text-3xl ${colors.text}`}>
                {count}
              </div>
              <div className="font-label text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-widest mt-1">
                {level} Treks
              </div>
            </div>
          );
        })}
        <div className="bg-pink-50 dark:bg-pink-900/10 border border-pink-200 dark:border-pink-800/40 p-4 rounded-xl text-center">
          <div className="font-headline text-2xl text-pink-600 dark:text-pink-400">
            {stats.mostActiveYear.year}
          </div>
          <div className="font-label text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-widest mt-1">
            Most Active Year
          </div>
          <div className="text-xs text-stone-400 dark:text-stone-500 mt-1">
            {stats.mostActiveYear.count} treks
          </div>
        </div>
      </div>

      {/* Difficulty Distribution */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 shadow-sm">
        <h3 className="font-headline text-lg text-stone-800 dark:text-stone-200 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-yellow-500">
            terrain
          </span>
          Difficulty Distribution
        </h3>
        <div className="space-y-4">
          {stats.difficultyBreakdown.map(({ level, count }) => {
            const pct = ((count / stats.total) * 100).toFixed(1);
            const colors = difficultyColors[level] || defaultColors;
            return (
              <div key={level}>
                <div className="flex justify-between text-xs font-label mb-1">
                  <span className={`font-bold ${colors.text}`}>{level}</span>
                  <span className="text-stone-500 dark:text-stone-400">
                    {count} {count === 1 ? "trek" : "treks"} ({pct}%)
                  </span>
                </div>
                <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`${colors.bg} h-1.5 rounded-full`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Yearly Breakdown */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 shadow-sm">
        <h3 className="font-headline text-lg text-stone-800 dark:text-stone-200 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-pink-500">event</span>
          Yearly Breakdown
        </h3>
        <div className="space-y-4">
          {stats.yearlyBreakdown.map(({ year, count }) => {
            const maxCount = Math.max(
              ...stats.yearlyBreakdown.map((y) => y.count),
            );
            const pct = (count / maxCount) * 100;
            return (
              <div key={year}>
                <div className="flex justify-between text-xs font-label mb-1">
                  <span className="text-stone-800 dark:text-stone-200">
                    {year}
                  </span>
                  <span className="text-stone-500 dark:text-stone-400">
                    {count} {count === 1 ? "trek" : "treks"}
                  </span>
                </div>
                <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-teal-500 h-1.5 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive trek timeline */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 shadow-sm">
        <h3 className="font-headline text-lg text-stone-800 dark:text-stone-200 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-500">route</span>
          Trek Timeline
        </h3>
        <TreksTimeline />
      </div>
    </div>
  );
};

export default TreksStatistics;
