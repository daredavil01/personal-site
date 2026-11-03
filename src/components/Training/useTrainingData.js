import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getBestEfforts, getGear, listActivities, listRoutes,
} from "../../lib/api/training";

// Where /training's rows come from. The live table when it has rows; the
// seeded sample log (src/lib/trainingDemo.js) when it is empty — i.e. until
// the first `npm run strava:import` — or when `?demo=1` asks for it. The
// sample module is loaded only when it is used, and `demo` is returned so
// the page can say so.

const loadDemo = () => import("../../lib/trainingDemo");

export default function useTrainingData() {
  const [searchParams] = useSearchParams();
  const forceDemo = searchParams.get("demo") === "1";
  const [state, setState] = useState({ rows: null, demo: false, error: null });

  useEffect(() => {
    let live = true;
    const useDemo = () => loadDemo().then((m) => live && setState({ rows: m.demoActivities(), demo: true, error: null }));
    if (forceDemo) {
      useDemo();
    } else {
      listActivities()
        .then((rows) => {
          if (!live) return;
          if (rows.length) setState({ rows, demo: false, error: null });
          else useDemo();
        })
        .catch((error) => live && setState({ rows: null, demo: false, error }));
    }
    return () => { live = false; };
  }, [forceDemo]);

  return state;
}

/** Gear, best efforts and routes: live, or the sample set's. Each loads once. */
export function useTrainingExtra(kind, demo) {
  const [value, setValue] = useState(null);
  useEffect(() => {
    let live = true;
    const pickDemo = (m) => ({ gear: m.demoGear, efforts: m.demoBestEfforts, routes: () => m.demoActivities().filter((r) => r.route) }[kind])();
    const real = { gear: getGear, efforts: getBestEfforts, routes: listRoutes }[kind];
    (demo ? loadDemo().then(pickDemo) : real())
      .then((v) => live && setValue(v || []))
      .catch(() => live && setValue([]));
    return () => { live = false; };
  }, [kind, demo]);
  return value;
}
