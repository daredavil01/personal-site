import React, { useMemo } from 'react';
import sportsData from '../../data/sports';
import { parseDistance, parseTimeToSeconds, formatSecondsToPace } from './utils';
import TopSummaryCards from './TopSummaryCards';

const SportsStatistics = () => {
  const {
    mostActiveCity,
    mostActiveYear,
    citiesVisited,
    yearsActive,
    distCounts,
    bestTimes,
    avgPaces,
    cityBreakdown,
    yearlyBreakdown,
    totalRaces
  } = useMemo(() => {
    const cityCounts = {};
    const yearCounts = {};
    const dCounts = {};
    const distTimes = {}; 
    const best = {}; 

    sportsData.forEach((race) => {
      const city = race.place.split(',').pop().trim();
      cityCounts[city] = (cityCounts[city] || 0) + 1;
      
      const year = new Date(race.date).getFullYear();
      yearCounts[year] = (yearCounts[year] || 0) + 1;
      
      const d = parseDistance(race.distance);
      if (d > 0) {
        dCounts[d] = (dCounts[d] || 0) + 1;
        const timeSec = parseTimeToSeconds(race.time);
        if (timeSec > 0) {
          if (!distTimes[d]) distTimes[d] = [];
          distTimes[d].push(timeSec);
          
          if (!best[d] || timeSec < best[d].timeSec) {
            best[d] = { race, timeSec };
          }
        }
      }
    });

    let mac = { name: '-', count: 0 };
    Object.entries(cityCounts).forEach(([c, count]) => {
      if (count > mac.count) mac = { name: c, count };
    });

    let may = { year: '-', count: 0 };
    Object.entries(yearCounts).forEach(([y, count]) => {
      if (count > may.count) may = { year: y, count };
    });

    const avg = {};
    Object.entries(distTimes).forEach(([d, times]) => {
      const sum = times.reduce((a, b) => a + b, 0);
      avg[d] = formatSecondsToPace(sum / times.length, parseInt(d, 10));
    });

    const cb = Object.entries(cityCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const yb = Object.entries(yearCounts).map(([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year);

    return {
      mostActiveCity: mac,
      mostActiveYear: may,
      citiesVisited: Object.keys(cityCounts).length,
      yearsActive: Object.keys(yearCounts).length,
      distCounts: dCounts,
      bestTimes: best,
      avgPaces: avg,
      cityBreakdown: cb,
      yearlyBreakdown: yb,
      totalRaces: sportsData.length
    };
  }, []);

  const distances = useMemo(() => {
    const distSet = new Set();
    sportsData.forEach((race) => {
      const d = parseDistance(race.distance);
      if (d > 0) distSet.add(d);
    });
    return Array.from(distSet).sort((a, b) => b - a);
  }, []);

  return (
    <div className="w-full flex flex-col gap-6">
      <TopSummaryCards />

      {/* Sub-summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 p-4 rounded-xl text-center flex flex-col items-center justify-center">
          <div className="font-headline text-2xl text-amber-600 dark:text-amber-400">{mostActiveCity.name}</div>
          <div className="font-label text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-widest mt-1">Most Active City</div>
          <div className="text-xs text-stone-400 dark:text-stone-500 mt-1">{mostActiveCity.count} races</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 p-4 rounded-xl text-center flex flex-col items-center justify-center">
          <div className="font-headline text-2xl text-red-600 dark:text-red-400">{mostActiveYear.year}</div>
          <div className="font-label text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-widest mt-1">Most Active Year</div>
          <div className="text-xs text-stone-400 dark:text-stone-500 mt-1">{mostActiveYear.count} races</div>
        </div>
        <div className="bg-secondary/[0.04] dark:bg-secondary/[0.08] border border-secondary/20 dark:border-secondary/30 p-4 rounded-xl text-center flex flex-col items-center justify-center">
          <div className="font-headline text-3xl text-secondary">{citiesVisited}</div>
          <div className="font-label text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-widest mt-1">Cities Visited</div>
        </div>
        <div className="bg-stone-50 dark:bg-stone-800/30 border border-stone-200 dark:border-stone-700/40 p-4 rounded-xl text-center flex flex-col items-center justify-center">
          <div className="font-headline text-3xl text-stone-700 dark:text-stone-300">{yearsActive}</div>
          <div className="font-label text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-widest mt-1">Years Active</div>
        </div>
      </div>

      {/* Distance Distribution */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 shadow-sm">
        <h3 className="font-headline text-lg text-stone-800 dark:text-stone-200 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-yellow-500">emoji_events</span>
          Distance Distribution
        </h3>
        <div className="space-y-4">
          {distances.map((d) => {
            const count = distCounts[d] || 0;
            const pct = totalRaces > 0 ? ((count / totalRaces) * 100).toFixed(1) : 0;
            return (
              <div key={d}>
                <div className="flex justify-between text-xs font-label mb-1">
                  <span className="text-stone-800 dark:text-stone-200">{d} km</span>
                  <span className="text-stone-500 dark:text-stone-400">{count} races ({pct}%)</span>
                </div>
                <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-secondary h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Personal Records */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 shadow-sm">
        <h3 className="font-headline text-lg text-stone-800 dark:text-stone-200 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-500">schedule</span>
          Personal Records (Fastest Times)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {distances.map((d) => {
            const best = bestTimes[d];
            if (!best) return null;
            return (
              <div key={d} className="border border-stone-200 dark:border-stone-800 rounded-xl p-4 flex justify-between">
                <div>
                  <div className="font-label text-secondary text-sm mb-2">{d} km</div>
                  <div className="font-headline text-3xl text-stone-900 dark:text-stone-100 mb-1">{best.race.time}</div>
                  <div className="text-xs text-stone-500 dark:text-stone-400 font-label">{best.race.title}</div>
                  <div className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">{best.race.date}</div>
                </div>
                <div>
                  <span className="material-symbols-outlined text-yellow-500 text-2xl">emoji_events</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Average Pace by Distance */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 shadow-sm">
        <h3 className="font-headline text-lg text-stone-800 dark:text-stone-200 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-green-500">speed</span>
          Average Pace by Distance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {distances.map((d) => {
            const pace = avgPaces[d] || "-:--";
            return (
              <div key={d} className="border border-stone-200 dark:border-stone-800 rounded-xl p-4 text-center">
                <div className="font-label text-stone-500 dark:text-stone-400 text-xs mb-2">{d} km</div>
                <div className="font-headline text-2xl text-secondary mb-1">{pace}</div>
                <div className="text-[10px] text-stone-400 dark:text-stone-500">min/km</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* City Breakdown */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 shadow-sm">
        <h3 className="font-headline text-lg text-stone-800 dark:text-stone-200 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-orange-500">location_on</span>
          City Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {cityBreakdown.map((city) => (
            <div key={city.name} className="flex justify-between border border-stone-100 dark:border-stone-800 rounded-lg p-3 text-sm">
              <span className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
                <span className="material-symbols-outlined text-[16px] text-stone-400">location_on</span>
                {city.name}
              </span>
              <span className="text-secondary font-bold">{city.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Yearly Breakdown */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 shadow-sm">
        <h3 className="font-headline text-lg text-stone-800 dark:text-stone-200 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-pink-500">event</span>
          Yearly Breakdown
        </h3>
        <div className="space-y-4">
          {yearlyBreakdown.map((year) => {
            const maxYearCount = Math.max(...yearlyBreakdown.map((y) => y.count));
            const pct = (year.count / maxYearCount) * 100;
            return (
              <div key={year.year}>
                <div className="flex justify-between text-xs font-label mb-1">
                  <span className="text-stone-800 dark:text-stone-200">{year.year}</span>
                  <span className="text-stone-500 dark:text-stone-400">{year.count} races</span>
                </div>
                <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default SportsStatistics;
