import React, { useMemo } from 'react';
import sportsData from '../../data/sports';
import { parseDistance } from './utils';
import TopSummaryCards from './TopSummaryCards';

const PlaceholderImage = ({ icon, label }) => (
  <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-stone-100 dark:bg-stone-800">
    <span className="material-symbols-outlined text-stone-300 dark:text-stone-600 text-5xl">{icon}</span>
    <span className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">{label}</span>
  </div>
);

const SportsInteractive = ({ onRaceClick }) => {
  const groupedData = useMemo(() => {
    const grouped = {};

    sportsData.forEach((race) => {
      const d = parseDistance(race.distance);
      if (d > 0) {
        if (!grouped[d]) {
          grouped[d] = [];
        }
        grouped[d].push(race);
      }
    });

    Object.values(grouped).forEach((list) => {
      list.sort((a, b) => {
        const toSecs = (t) => {
          const p = t.split(':').map(Number);
          return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
        };
        return toSecs(a.time) - toSecs(b.time); // fastest first
      });
    });

    return Object.entries(grouped)
      .filter(([, list]) => list.length > 0)
      .sort((a, b) => parseInt(b[0], 10) - parseInt(a[0], 10));
  }, []);

  return (
    <div className="w-full flex flex-col gap-6">
      <TopSummaryCards />

      {groupedData.map(([dist, races]) => (
        <div key={dist} className="mb-8">
          <h3 className="font-headline text-xl text-stone-800 dark:text-stone-200 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-yellow-500">emoji_events</span>
            {dist} km Races ({races.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {races.map((race) => {
              const bib = race.bibNumber || 'N/A';
              return (
                <div
                  key={race.id}
                  onClick={() => onRaceClick(race)}
                  className="group relative cursor-pointer rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:shadow-lg transition-all duration-300 flex flex-col"
                >
                  {/* Image block */}
                  <div className="relative w-full aspect-video overflow-hidden bg-stone-100 dark:bg-stone-800">
                    {race.slideImages?.length > 0 ? (
                      <img
                        src={race.slideImages[0].url}
                        alt={race.title}
                        className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <PlaceholderImage icon="directions_run" label="No Photos Yet" />
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <span className="font-label text-xs uppercase tracking-widest text-white font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">photo_library</span>
                        View Details
                      </span>
                    </div>
                    {/* BIB badge — top-right */}
                    <div className="absolute top-3 right-3 bg-blue-600/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg font-label text-[10px] font-bold">
                      BIB {bib}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div>
                      <h4 className="font-body font-bold text-stone-900 dark:text-stone-100 leading-snug line-clamp-2">
                        {race.title}
                      </h4>
                      <div className="font-label text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1">
                        {race.date}
                      </div>
                    </div>

                    <div className="flex justify-between items-end border-t border-stone-100 dark:border-stone-800 pt-3 mt-auto">
                      <div>
                        <div className="font-label text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest">Place</div>
                        <div className="text-sm text-stone-800 dark:text-stone-200">{race.place}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-label text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest">Time</div>
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-500">{race.time}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-label text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest">Distance</div>
                        <div className="text-sm text-stone-800 dark:text-stone-200">{race.distance}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SportsInteractive;
