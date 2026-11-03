import React, { Suspense } from "react";
import PageShell from "../atlas/PageShell";
import useViewMode from "../atlas/useViewMode";
import { LoadingBlock, ErrorBlock } from "../components/common/AsyncStates";
import useTrainingData from "../components/Training/useTrainingData";
import useTrainingFilters from "../components/Training/useTrainingFilters";
import TrainingClassic from "../components/Training/classic/TrainingClassic";
import "../components/Training/training.css";

// /training — every public Strava activity, imported from a Strava bulk export
// by `npm run strava:import`. Two layouts over the same rows and URL state:
//   atlas   — an animated story in chapters (TrainingAtlas, lazy: it is the
//             heavier of the two and classic readers never load it)
//   classic — counters plus five tabs: Overview, Log, Calendar, Stats, Routes
// Until the first import the table is empty and both show the seeded sample
// log, labelled as such (useTrainingData, src/lib/trainingDemo.js).

const TrainingAtlas = React.lazy(() => import("../components/Training/atlas/TrainingAtlas"));

const Training = () => {
  const mode = useViewMode();
  const { rows, demo, error } = useTrainingData();
  const filterState = useTrainingFilters(rows || []);

  return (
    <PageShell region="marathons">
      <div className="flex flex-col gap-8 w-full">
        {!rows && !error && <LoadingBlock label="Loading activities…" />}
        {error && <ErrorBlock />}
        {rows && mode === "atlas" && (
          <Suspense fallback={<LoadingBlock label="Setting the scene…" />}>
            <TrainingAtlas rows={rows} demo={demo} filterState={filterState} />
          </Suspense>
        )}
        {rows && mode !== "atlas" && <TrainingClassic rows={rows} demo={demo} filterState={filterState} />}

        <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 mb-0">
          <a href="https://www.strava.com" target="_blank" rel="noopener noreferrer" className="text-[#FC4C02] no-underline font-bold">
            Powered by Strava
          </a>
          {" · Route starts and finishes are trimmed for privacy."}
        </p>
      </div>
    </PageShell>
  );
};

export default Training;
