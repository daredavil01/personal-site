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
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-6 rounded-xl text-center">
        <div className="font-headline text-5xl text-blue-600 dark:text-blue-400 mb-2">{totalRaces}</div>
        <div className="font-label text-xs text-stone-500 dark:text-stone-400 uppercase tracking-widest">Total Races</div>
      </div>
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 p-6 rounded-xl text-center">
        <div className="font-headline text-5xl text-purple-600 dark:text-purple-400 mb-2">{totalDistance.toFixed(1)}K</div>
        <div className="font-label text-xs text-stone-500 dark:text-stone-400 uppercase tracking-widest">Total Distance</div>
      </div>
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 p-6 rounded-xl text-center">
        <div className="font-headline text-5xl text-green-600 dark:text-green-400 mb-2">{avgPerRace}</div>
        <div className="font-label text-xs text-stone-500 dark:text-stone-400 uppercase tracking-widest">Avg Per Race (km)</div>
      </div>
    </div>
  );
};

export default TopSummaryCards;
