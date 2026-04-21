import React from 'react';
import NowSectionHeader from './NowSectionHeader';

const StatTile = ({ value, label, approximate, className }) => (
  <div className={`text-center p-4 rounded-lg border ${className}`}>
    <p className="font-headline text-2xl font-black text-secondary">
      {approximate ? '~' : ''}{value}
    </p>
    <p className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400 mt-1">
      {label}
    </p>
  </div>
);

const NowStatsSection = ({ stats }) => {
  if (!stats) return null;
  const { strava, substack } = stats;

  return (
    <div>
      <NowSectionHeader label="Stats" icon="bar_chart" />
      <div className="space-y-6">
        {strava && (
          <div>
            <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-3">
              Strava
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile
                value={strava.activities}
                label="Activities"
                approximate={strava.approximate}
                className="bg-secondary/[0.04] border-secondary/20"
              />
              <StatTile
                value={`${strava.km} km`}
                label="Distance"
                approximate={strava.approximate}
                className="bg-secondary/[0.04] border-secondary/20"
              />
              <StatTile
                value={`${strava.hours} hrs`}
                label="Time"
                approximate={strava.approximate}
                className="bg-secondary/[0.04] border-secondary/20"
              />
              <StatTile
                value={`${strava.elevationMeters} m`}
                label="Elevation"
                approximate={strava.approximate}
                className="bg-secondary/[0.04] border-secondary/20"
              />
            </div>
          </div>
        )}
        {substack && (
          <div>
            <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-3">
              Substack
            </p>
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                value={substack.views}
                label="Views"
                approximate={substack.approximate}
                className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-700/20"
              />
              <StatTile
                value={substack.subscribers}
                label="Subscribers"
                approximate={substack.approximate}
                className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-700/20"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NowStatsSection;
