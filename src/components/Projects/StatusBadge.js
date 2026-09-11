import React from "react";
import PropTypes from "prop-types";

// Mirrors difficultyBadgeClass in TrekDetailsModal — same idea, project statuses.
const STATUS_CLASS = {
  live: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "in progress": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  archived: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  concept: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
};

const StatusBadge = ({ status, className }) => {
  if (!status) return null;
  const tone = STATUS_CLASS[status.toLowerCase()] ?? STATUS_CLASS.archived;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-label text-[10px] uppercase tracking-widest font-bold ${tone} ${className}`}>
      {status}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string,
  className: PropTypes.string,
};

StatusBadge.defaultProps = { status: "", className: "" };

export default StatusBadge;
