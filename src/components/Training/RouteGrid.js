import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import RouteShape from "./RouteShape";
import { LoadingBlock } from "../common/AsyncStates";
import { listRoutes } from "../../lib/api/training";
import { filterActivities } from "../../lib/training";
import { formatDistance } from "../../lib/strava";

// Every route as a small drawing, newest first. The polylines are loaded only
// when this view opens (they are most of a row's weight), and only the public,
// end-trimmed ones exist to load. The page's filters apply here too.

const PAGE = 60;

const RouteGrid = ({ filters }) => {
  const [routes, setRoutes] = useState(null);
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    let live = true;
    listRoutes().then((d) => live && setRoutes(d)).catch(() => live && setRoutes([]));
    return () => { live = false; };
  }, []);

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
              className="group block aspect-square p-2 rounded-xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:text-secondary hover:border-secondary/40 no-underline"
              title={`${r.name} · ${r.date} · ${formatDistance(r.distance)}`}
            >
              <RouteShape polyline={r.route} label={`Route of ${r.name}`} className="w-full h-[78%]" />
              <span className="block font-label text-[9px] uppercase tracking-widest text-stone-400 truncate text-center">
                {formatDistance(r.distance)}
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
};

export default RouteGrid;
