import React, { useEffect } from 'react';
import ImageSlider from '../Instagram/ImageSlider';

const MarathonDetailsModal = ({ isOpen, onClose, raceDetails }) => {
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

  if (!isOpen || !raceDetails) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md z-10">
          <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100">{raceDetails.title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 space-y-8 flex-1">
          {/* Metadata */}
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
              <span className="material-symbols-outlined text-lg text-secondary">calendar_today</span>
              <span className="font-label font-bold">{raceDetails.date}</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
              <span className="material-symbols-outlined text-lg text-secondary">location_on</span>
              <span className="font-label font-bold">{raceDetails.place}</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
              <span className="material-symbols-outlined text-lg text-secondary">timer</span>
              <span className="font-label font-bold tracking-widest">{raceDetails.time}</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
              <span className="material-symbols-outlined text-lg text-secondary">social_leaderboard</span>
              <span className="font-label font-bold uppercase">{raceDetails.distance}</span>
            </div>
          </div>

          <p className="font-body text-stone-600 dark:text-stone-300 text-lg leading-relaxed italic border-l-4 border-secondary/30 pl-4 py-1">
            "{raceDetails.description}"
          </p>

          {raceDetails.slideImages && raceDetails.slideImages.length > 0 && (
            <div className="w-full">
              <span className="font-label text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-4 block">Event Documentation</span>
              <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 aspect-square md:aspect-[4/3]">
                <ImageSlider data={raceDetails.slideImages} />
              </div>
            </div>
          )}
        </div>
        
        {raceDetails.timeCertificateLink && (
          <div className="p-6 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 sticky bottom-0 z-10">
             <a href={raceDetails.timeCertificateLink} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-label font-bold text-sm uppercase tracking-widest transition-all">
                View Official Certificate
             </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarathonDetailsModal;
