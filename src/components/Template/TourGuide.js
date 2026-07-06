import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Joyride, EVENTS, STATUS } from "react-joyride";
import { useTour, TOUR_SEEN_KEY } from "../../context/TourContext";
import getTourSteps from "../../data/tourSteps";

// A step is usable if it targets the whole page (body) or an element that is
// actually rendered AND visible right now (getClientRects is empty for
// display:none, so the hidden desktop-nav / mobile-hamburger variants drop out
// automatically at each breakpoint).
const isUsable = (step) => {
  if (step.target === "body") return true;
  const el = document.querySelector(step.target);
  return !!(el && el.getClientRects().length > 0);
};

// Custom tooltip styled to match the site's design language.
const TourTooltip = ({
  index,
  size,
  isLastStep,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
}) => (
  <div
    {...tooltipProps}
    className="max-w-[320px] sm:max-w-[360px] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-2xl overflow-hidden"
  >
    <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {step.title && (
          <p className="font-headline text-sm font-bold uppercase tracking-widest text-stone-900 dark:text-stone-100 mb-1.5">
            {step.title}
          </p>
        )}
        <div className="font-body text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
          {step.content}
        </div>
      </div>
      <button
        type="button"
        {...closeProps}
        className="shrink-0 p-1 -mr-1 -mt-1 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
    <div className="px-5 py-3 flex items-center justify-between gap-3 bg-stone-50 dark:bg-stone-950/50 border-t border-stone-100 dark:border-stone-800">
      <span className="font-label text-[9px] uppercase tracking-widest font-bold text-stone-400 dark:text-stone-500">
        {index + 1} / {size}
      </span>
      <div className="flex items-center gap-2">
        {!isLastStep && (
          <button
            type="button"
            {...skipProps}
            className="px-3 py-1.5 font-label text-[9px] uppercase tracking-widest font-bold text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
          >
            Skip
          </button>
        )}
        {index > 0 && (
          <button
            type="button"
            {...backProps}
            className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 font-label text-[9px] uppercase tracking-widest font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            Back
          </button>
        )}
        <button
          type="button"
          {...primaryProps}
          className="px-4 py-1.5 rounded-lg bg-secondary hover:bg-secondary/90 text-white font-label text-[9px] uppercase tracking-widest font-bold transition-colors"
        >
          {isLastStep ? "Done" : "Next"}
        </button>
      </div>
    </div>
  </div>
);

const TourGuide = () => {
  const { run, stopTour, setForcedMoreOpen } = useTour();
  const { pathname } = useLocation();
  const [steps, setSteps] = useState([]);

  // Build the current page's tour when it starts, keeping only steps whose
  // targets exist and are visible at this breakpoint.
  useEffect(() => {
    if (!run) return;
    const isMobile = window.matchMedia?.("(max-width: 767px)")?.matches ?? false;
    const all = getTourSteps(pathname, { isMobile, setForcedMoreOpen });
    setSteps(all.filter(isUsable));
  }, [run, pathname, setForcedMoreOpen]);

  const handleEvent = (data) => {
    const isEnd = data.type === EVENTS.TOUR_END
      || (data.type === EVENTS.TOUR_STATUS
        && (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED));
    if (isEnd) {
      try {
        window.localStorage.setItem(TOUR_SEEN_KEY, "true");
      } catch (e) {
        /* non-fatal */
      }
      stopTour();
    }
  };

  if (!steps.length) return null;

  return (
    <Joyride
      run={run}
      steps={steps}
      continuous
      scrollToFirstStep
      tooltipComponent={TourTooltip}
      floatingOptions={{ hideArrow: true }}
      onEvent={handleEvent}
      options={{
        skipBeacon: true,
        closeButtonAction: "skip",
        overlayClickAction: false,
        overlayColor: "rgba(12,10,9,0.65)",
        zIndex: 10000,
        scrollOffset: 130,
        spotlightRadius: 14,
        spotlightPadding: 8,
        targetWaitTimeout: 4000,
        primaryColor: "#b22200",
      }}
    />
  );
};

export default TourGuide;
