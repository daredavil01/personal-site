import React from "react";
import PropTypes from "prop-types";

const SIZES = { xs: "text-[11px]", sm: "text-[13px]", md: "text-base" };

// Five glyphs rather than N, so a 3-star book reads as "3 of 5" at a glance
// instead of needing to be counted against its neighbours.
const Stars = ({ rating, size, className }) => {
  if (!rating) return null;
  return (
    <span
      className={`inline-flex items-center leading-none tracking-tight ${SIZES[size]} ${className}`}
      title={`${rating} out of 5`}
    >
      <span aria-hidden="true" className="text-secondary">{"★".repeat(rating)}</span>
      <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">{"★".repeat(5 - rating)}</span>
      <span className="sr-only">{`Rated ${rating} out of 5`}</span>
    </span>
  );
};

Stars.propTypes = {
  rating: PropTypes.number,
  size: PropTypes.oneOf(["xs", "sm", "md"]),
  className: PropTypes.string,
};

Stars.defaultProps = { rating: 0, size: "sm", className: "" };

export default Stars;
