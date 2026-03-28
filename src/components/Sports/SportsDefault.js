import React, { useMemo, useState } from 'react';
import sportsData from '../../data/sports';
import TopSummaryCards from './TopSummaryCards';
import { parseDistance, parseTimeToSeconds } from './utils';

const SportsDefault = ({ onRaceClick }) => {
  const [filterYear, setFilterYear] = useState('all');
  const [filterPlace, setFilterPlace] = useState('all');
  const [filterDistance, setFilterDistance] = useState('all');
  const [orderBy, setOrderBy] = useState('time');
  const [orderAsc, setOrderAsc] = useState(true);

  const years = useMemo(() => {
    const s = new Set(sportsData.map((r) => new Date(r.date).getFullYear().toString()));
    return [...s].sort((a, b) => b - a);
  }, []);

  const places = useMemo(() => {
    const s = new Set(sportsData.map((r) => r.place.split(',').pop().trim()));
    return [...s].sort();
  }, []);

  const distances = useMemo(() => {
    const s = new Set(sportsData.map((r) => parseDistance(r.distance)).filter((d) => d > 0));
    return [...s].sort((a, b) => a - b);
  }, []);

  const hasFilters = filterYear !== 'all' || filterPlace !== 'all' || filterDistance !== 'all';

  const clearFilters = () => {
    setFilterYear('all');
    setFilterPlace('all');
    setFilterDistance('all');
  };

  const filtered = useMemo(() => {
    let result = [...sportsData];

    if (filterYear !== 'all') {
      result = result.filter((r) => new Date(r.date).getFullYear().toString() === filterYear);
    }
    if (filterPlace !== 'all') {
      result = result.filter((r) => r.place.split(',').pop().trim() === filterPlace);
    }
    if (filterDistance !== 'all') {
      result = result.filter((r) => parseDistance(r.distance) === parseInt(filterDistance, 10));
    }

    result.sort((a, b) => {
      let diff = 0;
      if (orderBy === 'time') {
        diff = parseTimeToSeconds(a.time) - parseTimeToSeconds(b.time);
      } else if (orderBy === 'distance') {
        diff = parseDistance(a.distance) - parseDistance(b.distance);
      } else if (orderBy === 'date') {
        diff = new Date(a.date) - new Date(b.date);
      }
      return orderAsc ? diff : -diff;
    });

    return result;
  }, [filterYear, filterPlace, filterDistance, orderBy, orderAsc]);

  const selectClass = 'h-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-3 font-label text-xs uppercase tracking-wider text-stone-800 dark:text-stone-200 outline-none cursor-pointer hover:border-secondary transition-colors';

  return (
    <div className="w-full flex flex-col gap-6">
      <TopSummaryCards />

      {/* Controls */}
      <div className="flex flex-col gap-3 p-4 bg-stone-50 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800 rounded-xl">
        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">Filter:</span>
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={selectClass}>
            <option value="all">All Years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterPlace} onChange={(e) => setFilterPlace(e.target.value)} className={selectClass}>
            <option value="all">All Cities</option>
            {places.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterDistance} onChange={(e) => setFilterDistance(e.target.value)} className={selectClass}>
            <option value="all">All Distances</option>
            {distances.map((d) => <option key={d} value={d}>{d} km</option>)}
          </select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-secondary font-label text-[10px] uppercase tracking-widest font-bold hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              Clear
            </button>
          )}
        </div>

        {/* Order row */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">Order:</span>
          {['time', 'distance', 'date'].map((key) => (
            <button
              key={key}
              onClick={() => setOrderBy(key)}
              className={`px-4 py-1.5 rounded-lg font-label text-xs uppercase tracking-widest font-bold transition-all ${orderBy === key ? 'bg-secondary text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700'}`}
            >
              {key}
            </button>
          ))}
          <button
            onClick={() => setOrderAsc((v) => !v)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-label text-xs uppercase tracking-widest font-bold bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700 transition-all"
            title={orderAsc ? 'Ascending' : 'Descending'}
          >
            <span className="material-symbols-outlined text-sm">{orderAsc ? 'arrow_upward' : 'arrow_downward'}</span>
            {orderAsc ? 'Asc' : 'Desc'}
          </button>
        </div>
      </div>

      {/* Results count */}
      <p className="font-body italic text-sm text-stone-500 dark:text-stone-400 -mt-2">
        {filtered.length} {filtered.length === 1 ? 'race' : 'races'} found
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-400 dark:text-stone-500 font-body border border-dashed border-secondary/20 rounded-xl">
          No races match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((race) => {
            const bib = race.bibNumber || 'N/A';
            return (
              <div
                key={race.id}
                className="bg-white dark:bg-stone-900 border border-secondary/20 dark:border-secondary/30 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer flex flex-col"
                onClick={() => onRaceClick(race)}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-body font-bold text-blue-600 dark:text-blue-400 hover:underline">{race.title}</h4>
                  <a
                    href={race.timeCertificateLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition-colors text-blue-500"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </a>
                </div>

                <p className="text-xs text-stone-500 dark:text-stone-400 italic mb-4 line-clamp-1">
                  {race.description}
                </p>

                <div className="flex flex-col gap-2 mb-4 text-xs font-label">
                  <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                    {race.date}
                  </div>
                  <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {race.place}
                  </div>
                </div>

                <div className="inline-flex max-w-min items-center gap-1 bg-blue-600 text-white rounded px-2 py-0.5 mt-auto mb-4">
                  <span className="font-label text-[10px] font-bold">BIB:</span>
                  <span className="font-label text-xs font-bold">{bib}</span>
                </div>

                <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-800 pt-3">
                  <div className="flex items-center gap-1 font-label text-xs text-stone-800 dark:text-stone-200">
                    <span className="material-symbols-outlined text-yellow-500 text-[16px]">emoji_events</span>
                    {race.distance}
                  </div>
                  <div className="flex items-center gap-1 font-label font-bold text-xs text-stone-800 dark:text-stone-200">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    {race.time}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SportsDefault;
