import React from "react";
import PropTypes from "prop-types";

// A chapter opening in the almanac: roman numeral, chapter name, one-line
// subtitle, and a rule that carries the eye across the page.
const ChapterRibbon = ({ numeral, title, subtitle }) => (
  <div className="col-span-1 md:col-span-12 flex items-baseline gap-4 mt-4">
    <span className="font-headline italic text-stone-300 dark:text-stone-700 text-lg shrink-0">{numeral}</span>
    <h2 className="font-headline text-2xl md:text-3xl text-stone-900 dark:text-stone-100 m-0 whitespace-nowrap">
      {title}
    </h2>
    <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800 translate-y-[-0.35em]" />
    <span className="font-label text-[10px] uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500 shrink-0 hidden sm:inline">
      {subtitle}
    </span>
  </div>
);

ChapterRibbon.propTypes = {
  numeral: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
};

ChapterRibbon.defaultProps = {
  subtitle: "",
};

export default ChapterRibbon;
