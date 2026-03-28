import React, { useMemo } from 'react';
import sportsData from '../../data/sports';
import { parseDistance } from './utils';
import TopSummaryCards from './TopSummaryCards';

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

    // Only return groups that have races, sorted by distance desc
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
              const bib = race.bibNumber || "N/A";

              return (
                <div 
                  key={race.id} 
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer flex flex-col"
                  onClick={() => onRaceClick(race)}
                >
                  <div className="p-5 flex-1">
                    <h4 className="font-body font-bold text-stone-900 dark:text-stone-100 mb-1">{race.title}</h4>
                    <div className="font-label text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-4">
                      {race.date}
                    </div>
                    
                    <div className="flex justify-between items-end mt-4">
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
                  
                  <div className="p-4 bg-stone-50 dark:bg-stone-800/50 border-t border-stone-100 dark:border-stone-800">
                    <div className="bg-blue-600 text-white rounded-lg p-3 flex justify-between items-center mb-3">
                      <span className="font-label font-bold text-xs uppercase tracking-widest">BIB NUMBER</span>
                      <span className="font-headline text-lg">{bib}</span>
                    </div>
                    <button className="w-full py-2 text-center text-xs font-label uppercase tracking-widest font-bold text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
                      Show Details
                    </button>
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
