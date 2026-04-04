import React, { useState, useEffect } from 'react';
import treksData from '../../data/treks';

const parseDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  const [day, month, year] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const difficultyConfig = {
  Easy: {
    dot: 'bg-green-500 border-green-500',
    ring: 'ring-green-400/40',
    border: 'border-green-400 dark:border-green-600',
    text: 'text-green-600 dark:text-green-400',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    glow: 'shadow-green-500/30',
  },
  Medium: {
    dot: 'bg-yellow-500 border-yellow-500',
    ring: 'ring-yellow-400/40',
    border: 'border-yellow-400 dark:border-yellow-600',
    text: 'text-yellow-600 dark:text-yellow-400',
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    glow: 'shadow-yellow-500/30',
  },
  Hard: {
    dot: 'bg-red-500 border-red-500',
    ring: 'ring-red-400/40',
    border: 'border-red-400 dark:border-red-600',
    text: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    glow: 'shadow-red-500/30',
  },
};

const defaultConfig = {
  dot: 'bg-stone-400 border-stone-400',
  ring: 'ring-stone-400/40',
  border: 'border-stone-300 dark:border-stone-700',
  text: 'text-stone-600 dark:text-stone-400',
  badge: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400',
  glow: 'shadow-stone-400/20',
};

const sortedTreks = [...treksData].sort((a, b) => parseDate(b.date) - parseDate(a.date));

const TreksTimeline = () => {
  const [selectedId, setSelectedId] = useState(null);
  const [visibleSet, setVisibleSet] = useState(new Set());

  useEffect(() => {
    const timers = sortedTreks.map((trek, i) => {
      return setTimeout(() => {
        setVisibleSet((prev) => new Set([...prev, trek.id]));
      }, i * 70);
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleClick = (id) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="relative">
      {/* Vertical spine */}
      <div className="absolute left-5 top-5 bottom-5 w-px bg-gradient-to-b from-stone-200 via-stone-300 to-stone-200 dark:from-stone-800 dark:via-stone-700 dark:to-stone-800" />

      <div className="space-y-3">
        {sortedTreks.map((trek, index) => {
          const config = difficultyConfig[trek.endurance_level] || defaultConfig;
          const isSelected = selectedId === trek.id;
          const isVisible = visibleSet.has(trek.id);
          const nodeClass = `absolute left-0 top-3 w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${isSelected ? `${config.dot} ring-4 ${config.ring} shadow-lg ${config.glow}` : 'bg-white dark:bg-stone-950 border-2 border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500 hover:scale-110'}`;
          const cardClass = `cursor-pointer rounded-xl border transition-all duration-300 ${isSelected ? `border-2 ${config.border} bg-stone-50 dark:bg-stone-900/80 shadow-md` : 'border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-200 dark:hover:border-stone-700 hover:shadow-sm'}`;

          return (
            <div
              key={trek.id}
              className="relative pl-14"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateX(0)' : 'translateX(-12px)',
                transition: `opacity 0.4s ease ${index * 20}ms, transform 0.4s ease ${index * 20}ms`,
              }}
            >
              {/* Node button */}
              <button
                onClick={() => handleClick(trek.id)}
                aria-label={`Toggle ${trek.fort_name}`}
                className={nodeClass}
              >
                <span
                  className={`material-symbols-outlined text-[16px] transition-colors duration-300 ${isSelected ? 'text-white' : config.text}`}
                >
                  hiking
                </span>
              </button>

              {/* Card */}
              <div
                onClick={() => handleClick(trek.id)}
                className={cardClass}
              >
                {/* Always visible header */}
                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-body font-semibold text-stone-900 dark:text-stone-100 truncate">
                      {trek.fort_name}
                    </span>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-label font-bold uppercase tracking-widest ${config.badge}`}>
                      {trek.endurance_level}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-label text-stone-400 dark:text-stone-500 hidden sm:block">
                      {trek.date}
                    </span>
                    {trek.blog_link && !isSelected && (
                      <span className="material-symbols-outlined text-[14px] text-indigo-400" title="Has blog post">
                        article
                      </span>
                    )}
                    <span
                      className={`material-symbols-outlined text-[18px] text-stone-400 dark:text-stone-500 transition-transform duration-300 ${isSelected ? 'rotate-180' : ''}`}
                    >
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Expandable details */}
                <div
                  style={{
                    maxHeight: isSelected ? '320px' : '0px',
                    opacity: isSelected ? 1 : 0,
                    transition: 'max-height 0.35s ease, opacity 0.25s ease',
                    overflow: 'hidden',
                  }}
                >
                  <div className="px-4 pb-4 border-t border-stone-100 dark:border-stone-800 pt-4 space-y-4">
                    {/* Date on mobile (hidden in header on mobile) */}
                    <div className="flex items-center gap-2 text-xs font-label text-stone-500 dark:text-stone-400 sm:hidden">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      {trek.date}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-xs font-label text-stone-600 dark:text-stone-300">
                        <span className={`material-symbols-outlined text-[16px] ${config.text}`}>schedule</span>
                        <div>
                          <div className="text-[10px] text-stone-400 uppercase tracking-widest mb-0.5">Duration</div>
                          {trek.trek_time}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-label text-stone-600 dark:text-stone-300">
                        <span className={`material-symbols-outlined text-[16px] ${config.text}`}>photo_library</span>
                        <div>
                          <div className="text-[10px] text-stone-400 uppercase tracking-widest mb-0.5">Photos</div>
                          {trek.photos?.length || 0} images
                        </div>
                      </div>
                    </div>

                    {trek.blog_link ? (
                      <a
                        href={trek.blog_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-label font-bold uppercase tracking-widest transition-colors
                          bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 dark:text-indigo-400`}
                      >
                        <span className="material-symbols-outlined text-[14px]">article</span>
                        Read Blog Post
                      </a>
                    ) : (
                      <p className="text-[11px] font-label text-stone-400 dark:text-stone-500 italic">
                        No blog post written for this trek.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TreksTimeline;
