import React from "react";
import PropTypes from "prop-types";

// One drawing sheet: a number, a title, a line saying what to do with it, and
// the drawing. The grid, double border and red registration marks come from
// `.bp-sheet` in blueprint.css.
const SheetFrame = ({
  id, no, title, lede, hint, children,
}) => (
  <section id={id} aria-labelledby={`${id}-title`} className="bp-sheet w-full scroll-mt-28">
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-4 md:px-6 pt-5 pb-4 border-b bp-rule">
      <div className="min-w-0">
        <p className="bp-mono text-[10px] uppercase tracking-[0.28em] bp-red mb-1">
          {`Sheet ${no}`}
        </p>
        <h2 id={`${id}-title`} className="font-headline text-2xl md:text-3xl font-black bp-ink m-0">
          {title}
        </h2>
      </div>
      {lede && (
        <p className="font-body text-sm bp-soft max-w-md m-0">{lede}</p>
      )}
    </header>
    <div className="p-3 md:p-6">{children}</div>
    {hint && (
      <p className="bp-mono text-[10px] uppercase tracking-[0.2em] bp-soft px-4 md:px-6 pb-4 m-0">
        {hint}
      </p>
    )}
  </section>
);

SheetFrame.propTypes = {
  id: PropTypes.string.isRequired,
  no: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  lede: PropTypes.string,
  hint: PropTypes.string,
  children: PropTypes.node,
};

SheetFrame.defaultProps = {
  lede: null,
  hint: null,
  children: null,
};

export default SheetFrame;
