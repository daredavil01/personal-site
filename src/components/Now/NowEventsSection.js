import React from 'react';
import NowSectionHeader from './NowSectionHeader';

const NowEventsSection = ({ events }) => {
  if (!events?.length) return null;
  return (
    <div>
      <NowSectionHeader label="Events" icon="event" />
      <ul className="space-y-4">
        {events.map((event, i) => (
          <li
            key={i}
            className="pl-4 border-l-2 border-stone-200 dark:border-stone-800"
          >
            <div className="flex items-start gap-2 flex-wrap">
              <span className="font-body text-sm font-semibold text-stone-800 dark:text-stone-200">
                {event.name}
              </span>
              {event.link && (
                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-label text-[9px] uppercase tracking-widest text-secondary hover:underline underline-offset-2 self-center"
                >
                  Details ↗
                </a>
              )}
            </div>
            {event.date && (
              <p className="font-label text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">
                {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
            {event.description && (
              <p className="font-body text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                {event.description}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NowEventsSection;
