import React from "react";

const TimelineCard = React.forwardRef(({ entry, side, onImageLoad, onClick }, ref) => {
  const isLeft = side === 'left';

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className={`w-[45%] rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm hover:shadow-lg cursor-pointer transition-all hover:scale-[1.02] ${isLeft ? 'mr-auto' : 'ml-auto'}`}
    >
      <div className="relative overflow-hidden bg-stone-100 dark:bg-stone-800">
        <img
          src={entry.imageUrl}
          alt={entry.title}
          className="w-full h-auto block"
          onLoad={onImageLoad}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/10 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="font-headline text-white text-sm font-bold leading-snug line-clamp-2">{entry.title}</p>
          <p className="font-label text-[10px] uppercase tracking-widest text-stone-300 mt-1">
            {entry.meta.date}
          </p>
          {entry.type === 'sport' && entry.meta.distance && (
            <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 mt-0.5">
              {entry.meta.distance} · {entry.meta.place}
            </p>
          )}
          {entry.type === 'trek' && entry.meta.endurance && (
            <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 mt-0.5">
              {entry.meta.endurance} · {entry.meta.duration}
            </p>
          )}
        </div>
        <span className="absolute top-3 right-3 bg-stone-900/70 backdrop-blur-sm text-white px-2 py-0.5 rounded font-label text-[9px] uppercase tracking-widest">
          {entry.type}
        </span>
      </div>
    </div>
  );
});

TimelineCard.displayName = 'TimelineCard';

export default TimelineCard;
