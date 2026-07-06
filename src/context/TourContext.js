import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

// Coordinates the "Get Started" site tour. Each page has its own content-aware
// tour (see src/data/tourSteps.js); starting the tour walks whatever page the
// visitor is currently on. `forcedMoreOpen` lets the homepage tour hold the
// Navigation "More" dropdown open so it can spotlight the items inside it.
export const TOUR_SEEN_KEY = "site-tour-seen";
export const TOUR_PROMPT_KEY = "site-tour-prompt-dismissed";

const TourContext = createContext(null);

export const TourProvider = ({ children }) => {
  const [run, setRun] = useState(false);
  const [forcedMoreOpen, setForcedMoreOpen] = useState(false);

  const startTour = useCallback(() => {
    try {
      window.localStorage.setItem(TOUR_PROMPT_KEY, "true");
    } catch (e) {
      /* non-fatal */
    }
    setRun(true);
  }, []);

  const stopTour = useCallback(() => {
    setRun(false);
    setForcedMoreOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      run,
      startTour,
      stopTour,
      forcedMoreOpen,
      setForcedMoreOpen,
    }),
    [run, startTour, stopTour, forcedMoreOpen],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within <TourProvider>");
  return ctx;
};
