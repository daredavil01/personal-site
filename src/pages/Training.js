import React from "react";
import PageShell from "../atlas/PageShell";
import { LoadingBlock, ErrorBlock } from "../components/common/AsyncStates";
import { ArenaFonts } from "../components/Arena/Arena";
import TrainingArena from "../components/Training/TrainingArena";
import useTrainingData from "../components/Training/useTrainingData";
import useTrainingFilters from "../components/Training/useTrainingFilters";
import "../components/Training/training.css";

// /training — every public Strava activity, imported from a Strava bulk export
// by `npm run strava:import`. One layout in both shells (TrainingArena): a
// stage where each session is a dot, and seven lenses over the same rows and
// URL state. Until the first import the table is empty and the page shows the
// seeded sample log, labelled as such (useTrainingData, src/lib/trainingDemo.js).

const Training = () => {
  const { rows, demo, error } = useTrainingData();
  const filterState = useTrainingFilters(rows || []);

  return (
    <PageShell region="marathons">
      <ArenaFonts />
      <div className="flex flex-col gap-8 w-full">
        {!rows && !error && <LoadingBlock label="Loading sessions…" />}
        {error && <ErrorBlock />}
        {rows && <TrainingArena rows={rows} demo={demo} filterState={filterState} />}

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
