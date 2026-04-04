import React, { useEffect } from 'react';
import ImageSlider from '../Instagram/ImageSlider';

const difficultyBadgeClass = (level) => {
  switch (level?.toLowerCase()) {
    case 'easy': return 'bg-green-100 text-green-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    case 'hard': return 'bg-red-100 text-red-700';
    default: return 'bg-stone-100 text-stone-700';
  }
};

const TrekDetailsModal = ({ isOpen, onClose, trek }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen || !trek) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100 truncate">{trek.fort_name}</h2>
            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-label font-bold uppercase tracking-widest ${difficultyBadgeClass(trek.endurance_level)}`}>
              {trek.endurance_level}
            </span>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8 flex-1">
          {/* Metadata */}
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
              <span className="material-symbols-outlined text-lg text-secondary">calendar_today</span>
              <span className="font-label font-bold">{trek.date}</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
              <span className="material-symbols-outlined text-lg text-secondary">schedule</span>
              <span className="font-label font-bold">{trek.trek_time}</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
              <span className="material-symbols-outlined text-lg text-secondary">terrain</span>
              <span className="font-label font-bold">{trek.endurance_level}</span>
            </div>
          </div>

          {/* Photos */}
          {trek.photos && trek.photos.length > 0 && (
            <div className="w-full">
              <span className="font-label text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-4 block">
                Trek Photos ({trek.photos.length})
              </span>
              <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 aspect-square md:aspect-[4/3]">
                <ImageSlider data={trek.photos} />
              </div>
            </div>
          )}
        </div>

        {/* Footer: blog link */}
        {trek.blog_link && (
          <div className="p-6 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 sticky bottom-0 z-10">
            <a
              href={trek.blog_link}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-xl font-label font-bold text-sm uppercase tracking-widest transition-all"
            >
              Read Blog Post
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrekDetailsModal;
