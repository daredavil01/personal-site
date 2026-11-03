import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { getActivityForRace } from "../../lib/api/training";
import { formatDuration, formatEffortSpeed, formatDistance } from "../../lib/strava";

// On a /sports race page: the Strava activity linked to it (sport_id, set at
// /admin/training/sync), as a few numbers and the per-km splits. Renders
// nothing when there is no link, or when the activity is not public.

const RaceActivity = ({ sportId }) => {
  const [a, setA] = useState(null);

  useEffect(() => {
    let live = true;
    getActivityForRace(sportId).then((d) => live && setA(d)).catch(() => live && setA(null));
    return () => { live = false; };
  }, [sportId]);

  if (!a) return null;
  const facts = [
    formatDistance(a.distance),
    formatDuration(a.movingTime),
    formatEffortSpeed(a.sport, a.averageSpeed),
    a.averageHeartrate ? `${Math.round(a.averageHeartrate)} bpm` : null,
    a.elevationGain ? `${Math.round(a.elevationGain)} m climb` : null,
  ].filter(Boolean);
  const maxSplit = Math.max(0, ...a.splits.map((s) => s.moving_time || 0));

  return (
    <div className="px-8 pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <span className="font-label text-[10px] text-stone-400 uppercase tracking-widest">From Strava</span>
        <Link to={`/training/${a.id}`} className="font-label text-[10px] uppercase tracking-widest text-secondary no-underline">
          Full activity →
        </Link>
      </div>
      <p className="font-body text-sm text-stone-600 dark:text-stone-300 mb-4">{facts.join(" · ")}</p>
      {a.splits.length > 1 && (
        <ol className="flex flex-col gap-1 pl-0 mb-0 list-none" aria-label="Splits per kilometre">
          {a.splits.map((s) => (
            <li key={s.split} className="flex items-center gap-2 text-xs tabular-nums">
              <span className="w-6 text-right text-stone-400">{s.split}</span>
              <span className="flex-1 h-2 rounded bg-stone-100 dark:bg-stone-800 overflow-hidden">
                <span
                  className="block h-full bg-secondary/70"
                  style={{ width: `${maxSplit ? Math.round(((s.moving_time || 0) / maxSplit) * 100) : 0}%` }}
                />
              </span>
              <span className="w-20 text-stone-600 dark:text-stone-300">{formatEffortSpeed(a.sport, s.average_speed)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

RaceActivity.propTypes = {
  sportId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

export default RaceActivity;
