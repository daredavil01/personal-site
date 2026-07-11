// OrbitStage — the arrival scene (§4.2). Reuses the homepage GlobeRenderer in
// a new `mode="orbit"` (chrome hidden, gentle auto-rotate, brighter styling)
// so three.js stays exactly as lazy as it is today (the orbit and the "My
// World" globe share one chunk, §7). Over it: the world title, live-count
// teasers (useCountUp, §9), the pulsing "Enter the World" CTA and an
// always-visible "Skip intro" (§2 decision #4).
//
// The arrival scene must paint instantly on a cold mobile load, so it makes NO
// network call: the teaser counts come from hand-maintained numbers
// (src/data/atlasStats.js) and the globe shows the six worlds as static
// markers built from the DOMAINS constant. The real, per-item content loads
// only once the visitor enters the world (WorldMap / region pages).
//
// The forwarded ref reaches GlobeRenderer's imperative handle so DiveSequence
// can plunge the camera at the start of the dive.

import React, { forwardRef } from "react";
import PropTypes from "prop-types";
import { DOMAINS } from "../../components/Index/globe/domains";
import useCountUp from "../../hooks/useCountUp";
import ATLAS_STATS from "../../data/atlasStats";
import "./intro.css";

// Lazy so react-globe.gl + three.js stay in their own chunk (never the atlas
// hub chunk) — the same lazy boundary GlobeShowcase uses on the homepage.
const GlobeRenderer = React.lazy(() => import("../../components/Index/GlobeRenderer"));

const noop = () => {};

// One static marker per world, anchored on its DOMAINS coordinate — no content
// fetch needed, so the arrival globe is populated the instant it renders.
const ORBIT_PINS = DOMAINS.map((d) => ({
  id: `world-${d.key}`,
  type: d.type,
  lat: d.lat,
  lng: d.lng,
  label: d.label,
  color: d.color,
  data: d,
}));

const OrbitStage = forwardRef(({ onEnter, onSkip }, globeApiRef) => {
  // Hardcoded counts (see src/data/atlasStats.js) drive the teasers with no API
  // call — active from mount so they animate immediately on the cold load.
  const races = useCountUp(ATLAS_STATS.races, 1200, true);
  const treks = useCountUp(ATLAS_STATS.treks, 1200, true);
  const books = useCountUp(ATLAS_STATS.books, 1400, true);
  const micro = useCountUp(ATLAS_STATS.microPosts, 1600, true);

  const fmtK = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString());
  const teasers = [
    [races.toLocaleString(), "races"],
    [treks.toLocaleString(), "treks"],
    [books.toLocaleString(), "books"],
    [fmtK(micro), "micro-posts"],
  ];

  return (
    <div className="atlas-orbit">
      <React.Suspense fallback={<div className="atlas-orbit-globe-skeleton" />}>
        <GlobeRenderer ref={globeApiRef} pins={ORBIT_PINS} onPinClick={noop} mode="orbit" />
      </React.Suspense>

      <div className="atlas-orbit-overlay">
        <div className="atlas-orbit-hero">
          <p className="atlas-orbit-kicker">Welcome, fellow explorer</p>
          <h2 className="atlas-orbit-title">The Wanderer&apos;s Atlas</h2>
          <p className="atlas-orbit-counts">
            {teasers.map(([value, label], i) => (
              <span key={label}>
                {i > 0 && <span aria-hidden="true"> · </span>}
                <strong>{value}</strong>
                {" "}
                {label}
              </span>
            ))}
          </p>
          <button type="button" className="atlas-cta" onClick={onEnter}>
            Enter the World
          </button>
          <button type="button" className="atlas-skip" onClick={onSkip}>
            Skip intro
          </button>
        </div>
      </div>
    </div>
  );
});

OrbitStage.displayName = "OrbitStage";

OrbitStage.propTypes = {
  onEnter: PropTypes.func.isRequired,
  onSkip: PropTypes.func.isRequired,
};

export default OrbitStage;
