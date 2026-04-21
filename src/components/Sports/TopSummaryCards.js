import React, { useMemo } from 'react';
import sportsData from '../../data/sports';
import { parseDistance } from './utils';

const TopSummaryCards = () => {
  const { totalRaces, totalDistance } = useMemo(() => {
    let distanceSum = 0;
    sportsData.forEach((race) => {
      distanceSum += parseDistance(race.distance);
    });
    return {
      totalRaces: sportsData.length,
      totalDistance: distanceSum
    };
  }, []);

  const avgPerRace = totalRaces > 0 ? (totalDistance / totalRaces).toFixed(2) : "0.00";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 w-full">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 p-6 rounded-xl text-center">
        <div className="font-headline text-5xl text-red-600 dark:text-red-400 mb-2">{totalRaces}</div>
        <div className="font-label text-xs text-stone-500 dark:text-stone-400 uppercase tracking-widest">Total Races</div>
      </div>
      <div className="bg-secondary/[0.04] dark:bg-secondary/[0.08] border border-secondary/20 dark:border-secondary/30 p-6 rounded-xl text-center">
        <div className="font-headline text-5xl text-secondary mb-2">{totalDistance.toFixed(1)}K</div>
        <div className="font-label text-xs text-stone-500 dark:text-stone-400 uppercase tracking-widest">Total Distance</div>
      </div>
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 p-6 rounded-xl text-center">
        <div className="font-headline text-5xl text-amber-600 dark:text-amber-400 mb-2">{avgPerRace}</div>
        <div className="font-label text-xs text-stone-500 dark:text-stone-400 uppercase tracking-widest">Avg Per Race (km)</div>
      </div>
    </div>
  );
};

export default TopSummaryCards;
