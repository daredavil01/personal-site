import React from 'react';
import MonthSection from './MonthSection';

const NowDocument = ({ months }) => {
  const current = months.filter((m) => m.isCurrent);
  const archived = months.filter((m) => !m.isCurrent);

  return (
    <article className="w-full space-y-6">
      {current.map((m) => (
        <MonthSection key={`${m.month}-${m.year}`} month={m} />
      ))}

      {archived.length > 0 && (
        <>
          <hr className="border-stone-100 dark:border-stone-800 my-4" />
          <h2 className="font-label text-xs uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500 font-bold">
            Archives
          </h2>
          <div className="space-y-6">
            {archived.map((m) => (
              <MonthSection key={`${m.month}-${m.year}`} month={m} />
            ))}
          </div>
        </>
      )}
    </article>
  );
};

export default NowDocument;
