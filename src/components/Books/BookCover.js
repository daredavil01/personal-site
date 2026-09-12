import React, { useState } from "react";
import PropTypes from "prop-types";
import { bookShape } from "./shapes";
import { colorForTag, hashString } from "../../lib/generativeArt";

// Roughly a third of the library is Marathi, and Marathi titles have no
// presence in any cover API — so a missing cover is the normal case, not an
// error state. The fallback is a designed object in its own right: a seeded
// two-tone spine with the title actually set on it, so a shelf of fetched and
// generated covers still reads as one shelf.
const fallbackArt = (book) => {
  const seed = hashString(`${book.title}${book.author ?? ""}`);
  const base = colorForTag(book.tags?.[0] ?? book.category ?? book.title);
  const hue = seed % 360;
  return {
    background: `linear-gradient(150deg, ${base} 0%, hsl(${(hue + 40) % 360} 45% 28%) 100%)`,
  };
};

const SIZES = {
  sm: { pad: "p-2", title: "text-[10px] leading-snug", author: "text-[8px]" },
  md: { pad: "p-4", title: "text-sm leading-snug", author: "text-[10px]" },
  lg: { pad: "p-6", title: "text-lg leading-snug", author: "text-xs" },
};

const BookCover = ({ book, size, className }) => {
  // A stored cover URL can still 404 — a bucket object removed by hand, or a
  // scraped host that changed. Falling back on error keeps the shelf whole.
  const [broken, setBroken] = useState(false);
  const s = SIZES[size];
  const showImage = !!book.cover_url && !broken;

  return (
    <div
      className={`relative overflow-hidden rounded-md bg-stone-100 dark:bg-stone-800 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] aspect-[2/3] ${className}`}
    >
      {showImage ? (
        <img
          src={book.cover_url}
          alt={`Cover of ${book.title}`}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className={`absolute inset-0 flex flex-col justify-end ${s.pad}`}
          style={fallbackArt(book)}
          aria-hidden="true"
        >
          <span className={`font-headline font-bold text-white/95 line-clamp-4 ${s.title}`}>
            {book.title}
          </span>
          {book.author && (
            <span className={`font-label uppercase tracking-widest text-white/60 mt-1.5 line-clamp-1 ${s.author}`}>
              {book.author}
            </span>
          )}
        </div>
      )}

      {/* The spine. A book is a physical object and the shelf should say so. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[6%] bg-gradient-to-r from-black/30 to-transparent"
      />
    </div>
  );
};

BookCover.propTypes = {
  book: bookShape.isRequired,
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  className: PropTypes.string,
};

BookCover.defaultProps = { size: "md", className: "" };

export default BookCover;
