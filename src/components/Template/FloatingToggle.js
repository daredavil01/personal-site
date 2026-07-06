import React, { useEffect, useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useTour, TOUR_SEEN_KEY, TOUR_PROMPT_KEY } from "../../context/TourContext";

const readFlag = (key) => {
  try {
    return Boolean(window.localStorage.getItem(key));
  } catch (e) {
    return true; // storage unavailable — behave as "already seen"
  }
};

const writeFlag = (key) => {
  try {
    window.localStorage.setItem(key, "true");
  } catch (e) {
    /* non-fatal */
  }
};

// Floating action stack (bottom right): "Get Started" tour button on top of
// the light/dark toggle, plus a one-time "take the tour?" prompt bubble.
const FloatingToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const { run, startTour, stopTour } = useTour();
  const [showPrompt, setShowPrompt] = useState(false);

  // Invite first-time visitors after a short beat.
  useEffect(() => {
    if (readFlag(TOUR_SEEN_KEY) || readFlag(TOUR_PROMPT_KEY)) return undefined;
    const t = setTimeout(() => setShowPrompt(true), 1800);
    return () => clearTimeout(t);
  }, []);

  const dismissPrompt = () => {
    setShowPrompt(false);
    writeFlag(TOUR_PROMPT_KEY);
  };

  const acceptPrompt = () => {
    setShowPrompt(false);
    startTour();
  };

  const handleTourClick = () => {
    setShowPrompt(false);
    if (run) stopTour();
    else startTour();
  };

  const buttonCls = "p-4 rounded-full bg-stone-900 dark:bg-stone-50 text-stone-50 dark:text-stone-900 shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 group flex items-center justify-center border border-stone-200/10";
  const labelCls = "max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap font-label text-[10px] uppercase tracking-widest ml-0 group-hover:ml-2 font-bold opacity-0 group-hover:opacity-100";

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
      {showPrompt && !run && (
        <div className="max-w-[240px] p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xl">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="font-headline text-xs font-bold uppercase tracking-widest text-stone-900 dark:text-stone-100 mb-0">
              New here?
            </p>
            <button
              type="button"
              onClick={dismissPrompt}
              aria-label="Dismiss tour prompt"
              className="p-0.5 -mr-1 -mt-1 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
          <p className="font-body text-xs text-stone-600 dark:text-stone-300 leading-relaxed mb-3">
            Take a 1-minute tour of everything this site has to offer.
          </p>
          <button
            type="button"
            onClick={acceptPrompt}
            className="w-full px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/90 text-white font-label text-[9px] uppercase tracking-widest font-bold transition-colors"
          >
            Start the tour
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleTourClick}
        className={buttonCls}
        aria-label={run ? "Stop site tour" : "Start site tour"}
        data-tour="tour-button"
      >
        <span className="material-symbols-outlined text-2xl transition-transform duration-500 group-hover:rotate-12">
          {run ? "close" : "tour"}
        </span>
        <span className={labelCls}>{run ? "Stop Tour" : "Get Started"}</span>
      </button>

      <button
        type="button"
        onClick={toggleTheme}
        className={buttonCls}
        aria-label="Toggle Dark Mode"
        data-tour="theme-toggle"
      >
        <span className="material-symbols-outlined text-2xl transition-transform duration-500 group-hover:rotate-12">
          {theme === "dark" ? "light_mode" : "dark_mode"}
        </span>
        <span className={labelCls}>{theme === "dark" ? "Light View" : "Dark View"}</span>
      </button>
    </div>
  );
};

export default FloatingToggle;
