import React, { useMemo, useState } from 'react';
import treksData from '../../data/treks';

const parseDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  const [day, month, year] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const parseTrekTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const lower = timeStr.toLowerCase();
  if (lower.includes('day')) {
    const dayMatch = lower.match(/(\d+)\s*day/);
    return dayMatch ? parseInt(dayMatch[1], 10) * 24 * 60 : 0;
  }
  if (lower.includes('hour') || lower.includes('hr')) {
    const match = lower.match(/(\d+)/);
    return match ? parseInt(match[1], 10) * 60 : 0;
  }
  if (lower.includes('min')) {
    const match = lower.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
  return 0;
};

const difficultyOverlayClass = (level) => {
  switch (level?.toLowerCase()) {
    case 'easy': return 'bg-green-700/80 text-green-100';
    case 'medium': return 'bg-yellow-700/80 text-yellow-100';
    case 'hard': return 'bg-red-700/80 text-red-100';
    default: return 'bg-stone-700/80 text-stone-200';
  }
};

const PlaceholderImage = ({ icon, label }) => (
  <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-stone-100 dark:bg-stone-800">
    <span className="material-symbols-outlined text-stone-300 dark:text-stone-600 text-5xl">{icon}</span>
    <span className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">{label}</span>
  </div>
);

const TreksDefault = ({ onTrekClick }) => {
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterBlog, setFilterBlog] = useState('all');
  const [orderBy, setOrderBy] = useState('date');
  const [orderAsc, setOrderAsc] = useState(false);

  const years = useMemo(() => {
    const s = new Set(treksData.map((t) => parseDate(t.date).getFullYear().toString()));
    return [...s].sort((a, b) => b - a);
  }, []);

  const difficulties = useMemo(() => {
    const s = new Set(treksData.map((t) => t.endurance_level).filter(Boolean));
    return [...s].sort();
  }, []);

  const hasFilters = filterDifficulty !== 'all' || filterYear !== 'all' || filterBlog !== 'all';

  const clearFilters = () => {
    setFilterDifficulty('all');
    setFilterYear('all');
    setFilterBlog('all');
  };

  const filtered = useMemo(() => {
    let result = [...treksData];

    if (filterDifficulty !== 'all') {
      result = result.filter((t) => t.endurance_level === filterDifficulty);
    }
    if (filterYear !== 'all') {
      result = result.filter((t) => parseDate(t.date).getFullYear().toString() === filterYear);
    }
    if (filterBlog === 'with') {
      result = result.filter((t) => !!t.blog_link);
    } else if (filterBlog === 'without') {
      result = result.filter((t) => !t.blog_link);
    }

    result.sort((a, b) => {
      let diff = 0;
      if (orderBy === 'trek_time') {
        diff = parseTrekTimeToMinutes(a.trek_time) - parseTrekTimeToMinutes(b.trek_time);
      } else if (orderBy === 'date') {
        diff = parseDate(a.date) - parseDate(b.date);
      }
      return orderAsc ? diff : -diff;
    });

    return result;
  }, [filterDifficulty, filterYear, filterBlog, orderBy, orderAsc]);

  const selectClass = 'h-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-3 font-label text-xs uppercase tracking-wider text-stone-800 dark:text-stone-200 outline-none cursor-pointer hover:border-secondary transition-colors';

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Controls */}
      <div className="flex flex-col gap-3 p-4 bg-stone-50 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800 rounded-xl">
        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">Filter:</span>
          <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className={selectClass}>
            <option value="all">All Difficulties</option>
            {difficulties.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={selectClass}>
            <option value="all">All Years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterBlog} onChange={(e) => setFilterBlog(e.target.value)} className={selectClass}>
            <option value="all">All Treks</option>
            <option value="with">With Blog</option>
            <option value="without">Without Blog</option>
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
          {[{ key: 'date', label: 'Date' }, { key: 'trek_time', label: 'Trek Time' }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setOrderBy(key)}
              className={`px-4 py-1.5 rounded-lg font-label text-xs uppercase tracking-widest font-bold transition-all ${orderBy === key ? 'bg-secondary text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700'}`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setOrderAsc((v) => !v)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-label text-xs uppercase tracking-widest font-bold bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700 transition-all"
          >
            <span className="material-symbols-outlined text-sm">{orderAsc ? 'arrow_upward' : 'arrow_downward'}</span>
            {orderAsc ? 'Asc' : 'Desc'}
          </button>
        </div>
      </div>

      {/* Results count */}
      <p className="font-body italic text-sm text-stone-500 dark:text-stone-400 -mt-2">
        {filtered.length} {filtered.length === 1 ? 'trek' : 'treks'} found
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-400 dark:text-stone-500 font-body border border-dashed border-secondary/20 rounded-xl">
          No treks match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((trek) => (
            <div
              key={trek.id}
              onClick={() => onTrekClick(trek)}
              className="group relative cursor-pointer rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              {/* Image block */}
              <div className="relative w-full aspect-[4/3] overflow-hidden bg-stone-100 dark:bg-stone-800">
                {trek.slideImages?.length > 0 ? (
                  <img
                    src={trek.slideImages[0].url}
                    alt={trek.fort_name}
                    className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <PlaceholderImage icon="terrain" label="No Photos Yet" />
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="font-label text-xs uppercase tracking-widest text-white font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">photo_library</span>
                    View Trek
                  </span>
                </div>
                {/* Difficulty badge — top-left */}
                <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg font-label text-[10px] uppercase tracking-wider font-bold backdrop-blur-sm ${difficultyOverlayClass(trek.endurance_level)}`}>
                  {trek.endurance_level}
                </div>
                {/* Photo count badge — top-right */}
                <div className="absolute top-3 right-3 bg-stone-900/70 backdrop-blur-sm text-white px-2 py-1 rounded-lg font-label text-[10px] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">photo_library</span>
                  {trek.slideImages?.length || 0}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 flex flex-col gap-2 flex-1">
                <h4 className="font-body font-bold text-stone-900 dark:text-stone-100 leading-snug line-clamp-2">
                  {trek.fort_name}
                </h4>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-label text-stone-500 dark:text-stone-400">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                    {trek.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">schedule</span>
                    {trek.trek_time}
                  </span>
                </div>
                <div className="border-t border-stone-100 dark:border-stone-800 pt-2 mt-auto">
                  {trek.blog_link ? (
                    <a
                      href={trek.blog_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-label font-bold w-fit"
                    >
                      <span className="material-symbols-outlined text-[14px]">article</span>
                      Read Blog
                    </a>
                  ) : (
                    <span className="text-stone-300 dark:text-stone-600 text-xs font-label">No blog</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TreksDefault;
