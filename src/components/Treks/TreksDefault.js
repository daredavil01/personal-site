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

const difficultyBadgeClass = (level) => {
  switch (level?.toLowerCase()) {
    case 'easy': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'hard': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400';
  }
};

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
              className="bg-white dark:bg-stone-900 border border-secondary/20 dark:border-secondary/30 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer flex flex-col"
              onClick={() => onTrekClick(trek)}
            >
              <div className="flex items-start justify-between mb-3 gap-2">
                <h4 className="font-body font-bold text-stone-900 dark:text-stone-100 leading-snug flex-1">
                  {trek.fort_name}
                </h4>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-label font-bold uppercase tracking-widest ${difficultyBadgeClass(trek.endurance_level)}`}>
                  {trek.endurance_level}
                </span>
              </div>

              <div className="flex flex-col gap-2 mb-4 text-xs font-label flex-1">
                <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                  {trek.date}
                </div>
                <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  {trek.trek_time}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-800 pt-3 mt-auto">
                <div className="flex items-center gap-1 text-stone-400 dark:text-stone-500 text-xs font-label">
                  <span className="material-symbols-outlined text-[14px]">photo_library</span>
                  {trek.photos?.length || 0} photos
                </div>
                {trek.blog_link ? (
                  <a
                    href={trek.blog_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-label font-bold"
                  >
                    <span className="material-symbols-outlined text-[14px]">article</span>
                    Read Blog
                  </a>
                ) : (
                  <span className="text-stone-300 dark:text-stone-600 text-xs font-label">No blog</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TreksDefault;
