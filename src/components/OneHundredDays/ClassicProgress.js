import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

// The classic progress band — ring + pace tiles — kept as the `?view=classic`
// alternative to the Expedition Trail.
const ProgressRing = ({ value, goal }) => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setProgress(value));
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress / 100);

  return (
    <div className="relative w-[180px] h-[180px] shrink-0">
      <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          strokeWidth="12"
          className="stroke-stone-100 dark:stroke-stone-800"
        />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-secondary"
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.33, 1, 0.68, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-headline text-4xl font-black text-stone-900 dark:text-stone-100 leading-none">
          {value}%
        </span>
        <span className="font-label text-[9px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mt-1">
          of {goal} posts
        </span>
      </div>
    </div>
  );
};

ProgressRing.propTypes = {
  value: PropTypes.number.isRequired,
  goal: PropTypes.number.isRequired,
};

const StatTile = ({ value, label, valueClass }) => (
  <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-lg p-4 text-center">
    <p className={`font-headline text-2xl font-black m-0 ${valueClass}`}>{value}</p>
    <p className="font-label text-[9px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mt-1 mb-0">{label}</p>
  </div>
);

StatTile.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  label: PropTypes.string.isRequired,
  valueClass: PropTypes.string,
};

StatTile.defaultProps = {
  valueClass: 'text-stone-900 dark:text-stone-100',
};

const ClassicProgress = ({ totalPosts, goal, pace }) => {
  const completion = Math.round((totalPosts / goal) * 100);
  return (
    <div className="flex flex-col md:flex-row items-center gap-8">
      <ProgressRing value={completion} goal={goal} />
      <div className="flex-1 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile value={totalPosts} label="Published" />
          <StatTile value={goal - totalPosts} label="Remaining" />
          <StatTile value={pace.expected} label="Pace Target" />
          <StatTile
            value={pace.delta >= 0 ? `+${pace.delta}` : pace.delta}
            label={pace.delta >= 0 ? 'Ahead' : 'Behind'}
            valueClass={pace.delta >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-secondary'}
          />
        </div>
      </div>
    </div>
  );
};

ClassicProgress.propTypes = {
  totalPosts: PropTypes.number.isRequired,
  goal: PropTypes.number.isRequired,
  pace: PropTypes.shape({
    expected: PropTypes.number,
    delta: PropTypes.number,
  }).isRequired,
};

export default ClassicProgress;
