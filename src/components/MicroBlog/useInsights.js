import { useEffect, useState } from "react";
import PropTypes from "prop-types";

// public/data/microblog-insights.json (npm run microblog:insights), fetched
// once per page load and shared by the Overview and Stats tabs.
let cache = null;
let pending = null;

const load = () => {
  if (!pending) {
    pending = fetch("/data/microblog-insights.json")
      .then((r) => {
        if (!r.ok) throw new Error(`insights ${r.status}`);
        return r.json();
      })
      .then((doc) => { cache = doc; return doc; })
      .catch((e) => { pending = null; throw e; });
  }
  return pending;
};

export default function useInsights() {
  const [state, setState] = useState(() => ({ doc: cache, error: null }));
  useEffect(() => {
    if (cache) return undefined;
    let live = true;
    load().then((doc) => live && setState({ doc, error: null }))
      .catch((error) => live && setState({ doc: null, error }));
    return () => { live = false; };
  }, []);
  return state;
}

const obj = PropTypes.shape({});
// The parts of the file the tabs read; the summaries' inner shape is src/lib/microblogInsights.js.
export const insightsShape = PropTypes.shape({
  generatedAt: PropTypes.string,
  years: PropTypes.arrayOf(PropTypes.string),
  all: obj,
  perYear: PropTypes.objectOf(obj),
  days: PropTypes.objectOf(PropTypes.number),
  sky: PropTypes.shape({ start: PropTypes.string, points: PropTypes.arrayOf(PropTypes.number) }),
  pool: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
  tagLives: obj,
  phrases: obj,
  words: obj,
  hashtags: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number]))),
  serial: PropTypes.shape({ count: PropTypes.number, max: PropTypes.number }),
  moments: PropTypes.arrayOf(obj),
});
