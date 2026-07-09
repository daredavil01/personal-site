// OrbitStage — the arrival scene (§4.2). Reuses the homepage GlobeRenderer in
// a new `mode="orbit"` (chrome hidden, gentle auto-rotate, brighter styling)
// so three.js stays exactly as lazy as it is today (the orbit and the "My
// World" globe share one chunk, §7). Over it: the world title, live-count
// teasers (useCountUp, §9), the pulsing "Enter the World" CTA and an
// always-visible "Skip intro" (§2 decision #4).
//
// The forwarded ref reaches GlobeRenderer's imperative handle so DiveSequence
// can plunge the camera at the start of the dive.

import React, {
  forwardRef, useEffect, useMemo, useState,
} from "react";
import PropTypes from "prop-types";
import { DOMAINS } from "../../components/Index/globe/domains";
import HOME_FEATURES from "../../data/homeFeatures";
import {
  useSports, useTreks, useBooks, useBlogs, useProjects,
} from "../../context/ContentContext";
import { getMicroblogCount } from "../../lib/api/microblog";
import useCountUp from "../../hooks/useCountUp";
import "./intro.css";

// Lazy so react-globe.gl + three.js stay in their own chunk (never the atlas
// hub chunk) — the same lazy boundary GlobeShowcase uses on the homepage.
const GlobeRenderer = React.lazy(() => import("../../components/Index/GlobeRenderer"));

const noop = () => {};

// Vogel-spiral pin placement — mirrors GlobeShowcase so the orbit globe reads
// identically to the homepage "My World" globe.
const distribute = (anchorLat, anchorLng, index, radiusStep = 3.5) => {
  if (index === 0) return { lat: anchorLat, lng: anchorLng };
  const angle = index * 2.39996;
  const r = Math.sqrt(index) * radiusStep;
  return {
    lat: anchorLat + Math.cos(angle) * r,
    lng: anchorLng + Math.sin(angle) * r,
  };
};

const OrbitStage = forwardRef(({ onEnter, onSkip }, globeApiRef) => {
  const { data: sportsData } = useSports();
  const { data: treksData } = useTreks();
  const { data: booksData } = useBooks();
  const { data: blogsData } = useBlogs();
  const { data: projectsData } = useProjects();

  const [microTotal, setMicroTotal] = useState(0);
  useEffect(() => {
    let active = true;
    getMicroblogCount().then((c) => { if (active) setMicroTotal(c); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const pins = useMemo(() => {
    const listsByType = {
      marathon: { items: sportsData || [], getLabel: (s) => s.title },
      trek: { items: treksData || [], getLabel: (t) => t.fort_name },
      blog: { items: (blogsData || []).slice(0, 15), getLabel: (b) => b.blog_title },
      book: { items: (booksData || []).slice(0, 20), getLabel: (b) => b.title },
      project: { items: projectsData || [], getLabel: (p) => p.title },
      feature: { items: HOME_FEATURES, getLabel: (f) => f.title },
    };
    const p = [];
    DOMAINS.forEach((domain) => {
      const { items, getLabel } = listsByType[domain.type];
      const radiusStep = domain.type === "feature" ? 5 : 3.5;
      items.forEach((item, index) => {
        const coords = distribute(domain.lat, domain.lng, index, radiusStep);
        p.push({
          id: `${domain.type}-${item.id ?? index}`,
          type: domain.type,
          lat: coords.lat,
          lng: coords.lng,
          label: getLabel(item),
          color: domain.color,
          data: item,
        });
      });
    });
    return p;
  }, [sportsData, treksData, booksData, blogsData, projectsData]);

  const ready = pins.length > 0;
  const races = useCountUp(sportsData?.length || 0, 1200, ready);
  const treks = useCountUp(treksData?.length || 0, 1200, ready);
  const books = useCountUp(booksData?.length || 0, 1400, ready);
  const micro = useCountUp(microTotal, 1600, microTotal > 0);

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
        <GlobeRenderer ref={globeApiRef} pins={pins} onPinClick={noop} mode="orbit" />
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
