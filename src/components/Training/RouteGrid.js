import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import RouteShape from "./RouteShape";
import { LoadingBlock } from "../common/AsyncStates";
import { filterActivities, sportFamily } from "../../lib/training";
import { famColor } from "./shared";
import { useTrainingExtra } from "./useTrainingData";
import { formatDistance } from "../../lib/strava";

// Every route as a small drawing, newest first. The polylines are loaded only
// when this view opens (they are most of a row's weight), and only the public,
// end-trimmed ones exist to load. The page's filters apply here too.

const PAGE = 60;

const RouteGrid = ({ filters, demo }) => {
  const routes = useTrainingExtra("routes", demo);
  const [shown, setShown] = useState(PAGE);

  const list = useMemo(() => filterActivities((routes || []).filter((r) => r.route), filters), [routes, filters]);

  if (!routes) return <LoadingBlock label="Drawing routes…" />;
  if (!list.length) {
    return <p className="text-stone-500 dark:text-stone-400 italic text-center py-12 mb-0">No routes to draw.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 pl-0 mb-0 list-none">
        {list.slice(0, shown).map((r) => (
          <li key={r.id}>
            <Link
              to={`/training/${r.id}`}
              className="group relative block aspect-square p-2 rounded-xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 no-underline overflow-hidden hover:-translate-y-0.5 hover:shadow-lg hover:border-secondary/40 transition-all"
              title={`${r.name} · ${r.date} · ${formatDistance(r.distance)}`}
            >
              <RouteShape polyline={r.route} label={`Route of ${r.name}`} className="w-full h-[78%] transition-transform group-hover:scale-105" color={famColor(sportFamily(r.sport))} animate />
              <span className="block font-label text-[9px] uppercase tracking-widest text-stone-400 truncate text-center">
                {formatDistance(r.distance)}
              </span>
              <span className="absolute inset-x-0 bottom-0 px-2 py-1.5 bg-stone-900/85 text-white text-[10px] leading-tight translate-y-full group-hover:translate-y-0 transition-transform">
                <span className="block truncate font-medium">{r.name}</span>
                <span className="block opacity-70">{r.date}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {shown < list.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="self-center px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-700 font-label text-xs uppercase tracking-widest text-stone-600 dark:text-stone-300 hover:text-secondary"
        >
          Show more
        </button>
      )}
    </div>
  );
};

RouteGrid.propTypes = {
  filters: PropTypes.shape({}).isRequired,
  demo: PropTypes.bool,
};
RouteGrid.defaultProps = { demo: false };

export default RouteGrid;
