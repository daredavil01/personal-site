import React from 'react';
import NowSectionHeader from './NowSectionHeader';

const NowBooksSection = ({ books }) => {
  if (!books?.length) return null;
  return (
    <div>
      <NowSectionHeader label="Books" icon="menu_book" />
      <ul className="space-y-4">
        {books.map((book, i) => (
          <li key={i} className="flex items-start justify-between gap-4">
            <div>
              <p className="font-headline text-sm font-bold text-stone-800 dark:text-stone-200 leading-snug">
                {book.title}
              </p>
              {book.author && (
                <p className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400 mt-0.5">
                  {book.author}
                </p>
              )}
            </div>
            {book.link && (
              <a
                href={book.link}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 font-label text-[9px] uppercase tracking-widest bg-secondary text-white px-2 py-1 rounded hover:bg-secondary/80 transition-colors"
              >
                Review
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NowBooksSection;
