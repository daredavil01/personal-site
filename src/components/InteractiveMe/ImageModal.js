import React, { useEffect, useRef, useState } from "react";

const ImageModal = ({ entry, onClose }) => {
  const overlayRef = useRef(null);
  const [imgSize, setImgSize] = useState(null); // 'portrait' | 'landscape' | 'square'

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleImgLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    const ratio = naturalWidth / naturalHeight;
    if (ratio > 1.2) setImgSize('landscape');
    else if (ratio < 0.85) setImgSize('portrait');
    else setImgSize('square');
  };

  const widthBySize = { portrait: 'max-w-sm', square: 'max-w-lg', landscape: 'max-w-4xl' };
  const modalWidth = widthBySize[imgSize] || 'max-w-4xl';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={`relative w-full ${modalWidth} bg-stone-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-stone-950/60 hover:bg-stone-950/90 backdrop-blur-sm text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Image — intrinsic size drives modal height dynamically */}
        <div className="w-full bg-stone-950 flex items-center justify-center max-h-[75vh] overflow-hidden">
          <img
            src={entry.imageUrl}
            alt={entry.title}
            className="w-full h-auto max-h-[75vh] object-contain"
            onLoad={handleImgLoad}
          />
        </div>

        {/* Info bar */}
        <div className="px-5 py-4 flex items-start justify-between gap-4 bg-stone-900">
          <div className="min-w-0">
            <p className="font-headline text-white text-base font-bold leading-snug truncate">{entry.title}</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 mt-1">{entry.meta.date}</p>
            {entry.type === 'sport' && (
              <p className="font-label text-[10px] uppercase tracking-widest text-stone-500 mt-0.5">
                {entry.meta.distance} · {entry.meta.place}
                {entry.meta.time && ` · ${entry.meta.time}`}
              </p>
            )}
            {entry.type === 'trek' && (
              <p className="font-label text-[10px] uppercase tracking-widest text-stone-500 mt-0.5">
                {entry.meta.endurance} · {entry.meta.duration}
              </p>
            )}
          </div>
          <span className="shrink-0 bg-stone-800 text-stone-300 px-2.5 py-1 rounded font-label text-[9px] uppercase tracking-widest">
            {entry.type}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
