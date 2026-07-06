import React, { Suspense, lazy } from "react";
import { useTour } from "../../context/TourContext";

const TourGuide = lazy(() => import("./TourGuide"));

// Mounts the joyride-powered tour only while it's running, so the library
// stays out of the main bundle until a visitor actually starts the tour.
const TourMount = () => {
  const { run } = useTour();
  if (!run) return null;
  return (
    <Suspense fallback={null}>
      <TourGuide />
    </Suspense>
  );
};

export default TourMount;
