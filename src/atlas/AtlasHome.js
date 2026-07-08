// AtlasHome — the atlas-mode homepage. Target shape (§4.2) is the
// orbit -> dive -> map state machine; phases 3 and 4 build those stages.
// Until then this is the /world preview stub: it turns the preview flag on
// (so navigation across the site stays in atlas mode in this browser) and
// shows a placeholder. Noindexed via Helmet here + X-Robots-Tag in
// functions/_middleware.js for the preview period.

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageMeta from "../components/Template/PageMeta";
import { useWorld } from "./world/WorldContext";

const AtlasHome = () => {
  const { enablePreview, disablePreview } = useWorld();
  const navigate = useNavigate();

  useEffect(() => {
    enablePreview();
  }, [enablePreview]);

  const exitPreview = () => {
    disablePreview();
    navigate("/");
  };

  return (
    <>
      <PageMeta
        title="The Wanderer's Atlas"
        description="A living, explorable map of everything on this site — in the making."
        noindex
      />
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center bg-gradient-to-b from-sky-300 via-sky-200 to-amber-100 dark:from-[#0b1026] dark:via-[#16305e] dark:to-[#1d2233] text-stone-800 dark:text-stone-100">
        <span className="fixed top-0 inset-x-0 py-1.5 text-xs font-semibold tracking-widest uppercase bg-amber-400/90 text-stone-900 z-50">
          Preview build — the Atlas is being drawn
        </span>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          The Wanderer&apos;s Atlas
        </h1>
        <p className="max-w-md text-lg opacity-80 mb-0">
          Six regions. One world. The cartographers are still at their desks —
          the globe, the dive, and the map land here piece by piece.
        </p>

        <div className="flex items-center gap-4 mt-4">
          {/* !text-* + explicit metrics counter the legacy _button.scss element
              styles; the .atlas-root reset (phase 2) makes this unnecessary */}
          <button
            type="button"
            onClick={exitPreview}
            className="px-5 py-2.5 h-auto rounded-full bg-stone-900 !text-white dark:bg-white dark:!text-stone-900 text-sm font-semibold normal-case tracking-normal leading-normal whitespace-normal shadow-none hover:shadow-none hover:opacity-85 transition-opacity"
          >
            Exit preview
          </button>
        </div>
      </div>
    </>
  );
};

export default AtlasHome;
