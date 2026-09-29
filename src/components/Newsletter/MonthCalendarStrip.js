import React from "react";
import PropTypes from "prop-types";

// The month at a glance: one cell per day, a dot for each kind of thing that
// happened on it. The same shape the issue's share card draws.

const KINDS = [
  { key: "running", label: "Race", dot: "bg-red-500" },
  { key: "events", label: "Trek / outing", dot: "bg-emerald-600" },
  { key: "blogs", label: "Blog post", dot: "bg-amber-500" },
  { key: "micro", label: "Short post", dot: "bg-sky-500" },
];

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const MonthCalendarStrip = ({ days, grid, label }) => {
  const { daysInMonth, firstWeekday } = grid;
  if (!daysInMonth) return null;
  const active = Object.keys(days).length;
  const present = KINDS.filter((k) => Object.values(days).some((keys) => keys.includes(k.key)));

  return (
    <section aria-label={`${label} calendar`} className="flex flex-col gap-4 w-full max-w-sm">
      <div className="flex flex-col gap-1">
        <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary font-bold mb-0">The month at a glance</p>
        <p className="font-label text-[11px] text-stone-500 dark:text-stone-400 mb-0">
          {active ? `${active} of ${daysInMonth} days had something in them` : "Nothing dated this month"}
        </p>
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((d, i) => (
          // eslint-disable-next-line react/no-array-index-key -- weekday initials repeat
          <span key={i} className="text-center font-label text-[10px] text-stone-400 dark:text-stone-500">{d}</span>
        ))}
        {Array.from({ length: firstWeekday }, (_, i) => <span key={`pad-${i}`} aria-hidden="true" />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const keys = days[day] || [];
          const names = KINDS.filter((k) => keys.includes(k.key)).map((k) => k.label).join(", ");
          return (
            <div
              key={day}
              title={names ? `${day}: ${names}` : undefined}
              className={`aspect-square rounded-md flex flex-col items-center justify-center gap-1 border ${
                keys.length
                  ? "border-secondary/30 bg-secondary/[0.06] dark:bg-secondary/[0.12]"
                  : "border-stone-100 dark:border-stone-800"
              }`}
            >
              <span className={`font-label text-[10px] sm:text-xs ${keys.length ? "text-stone-900 dark:text-stone-100 font-bold" : "text-stone-400 dark:text-stone-600"}`}>
                {day}
              </span>
              {keys.length > 0 && (
                <span className="flex gap-0.5" aria-label={names}>
                  {KINDS.filter((k) => keys.includes(k.key)).map((k) => (
                    <span key={k.key} className={`w-1.5 h-1.5 rounded-full ${k.dot}`} />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {present.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {present.map((k) => (
            <span key={k.key} className="inline-flex items-center gap-1.5 font-label text-[11px] text-stone-500 dark:text-stone-400">
              <span className={`w-2 h-2 rounded-full ${k.dot}`} />
              {k.label}
            </span>
          ))}
        </div>
      )}
    </section>
  );
};

MonthCalendarStrip.propTypes = {
  days: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
  grid: PropTypes.shape({ daysInMonth: PropTypes.number, firstWeekday: PropTypes.number }).isRequired,
  label: PropTypes.string.isRequired,
};

export default MonthCalendarStrip;
