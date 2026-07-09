// DiveSequence — the authored ~3.5s cinematic between orbit and hub (§4.2).
// One GSAP master timeline: the globe camera plunges (via the orbit stage's
// imperative handle) while the cloud sheets rush up and the bloom core whites
// out; at the whiteout frame the parent swaps the globe for the map (the
// "unfold" is sleight of hand there, never a real three.js→SVG morph); then
// the white fades and the clouds part to reveal the hub.
//
// Contract with AtlasHome:
//   onWhiteout — fires mid-flight; parent unmounts orbit, mounts WorldMap.
//   onDone     — timeline finished; parent clears this overlay + marks intro
//                seen. Both are idempotent here (guarded), so Skip is safe.
// Ownership rule (§4.6/§4.7): GSAP only touches element transforms/opacity;
// the map's own pull-out is driven by usePanZoom after the swap.

import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { gsap } from "../lib/gsap";
import CloudBloom from "./CloudBloom";
import "./intro.css";

const prefersReducedMotion = () => (
  typeof window !== "undefined"
  && !!window.matchMedia
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches
);

const DiveSequence = ({
  globeApiRef, onWhiteout, onDone, onSkip,
}) => {
  const rootRef = useRef(null);
  const tlRef = useRef(null);
  const firedRef = useRef({ whiteout: false, done: false });

  useEffect(() => {
    const whiteout = () => {
      if (firedRef.current.whiteout) return;
      firedRef.current.whiteout = true;
      onWhiteout();
    };
    const done = () => {
      if (firedRef.current.done) return;
      firedRef.current.done = true;
      onDone();
    };

    // Reduced motion never reaches here (AtlasHome skips the dive), but guard
    // anyway: hand straight to the whiteout swap, then finish.
    if (prefersReducedMotion()) {
      whiteout();
      const id = setTimeout(done, 60);
      return () => clearTimeout(id);
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.inOut" }, onComplete: done });
      tlRef.current = tl;

      // t0: the globe camera dives (imperative handle on GlobeRenderer).
      tl.call(() => { globeApiRef?.current?.plunge?.(1300); }, null, 0);

      // Clouds rush up past the viewer.
      tl.fromTo(
        ".atlas-cloud-sheet",
        { scale: 0.55, opacity: 0, transformOrigin: "50% 55%" },
        {
          scale: 2.6, opacity: 1, duration: 1.9, stagger: 0.12,
        },
        0.2,
      );

      // Whiteout bloom, then hand off to the map swap.
      tl.to(".atlas-bloom-core", { opacity: 1, duration: 0.7 }, 1.7);
      tl.call(whiteout, null, 2.3);

      // Reveal: white fades and the sheets part over the freshly-mounted map.
      tl.to(".atlas-bloom-core", { opacity: 0, duration: 0.9 }, 2.55);
      tl.to(
        ".atlas-cloud-sheet",
        { scale: 3.7, opacity: 0, duration: 1.0, stagger: 0.08 },
        2.55,
      );
    }, rootRef);

    return () => ctx.revert();
  }, [globeApiRef, onWhiteout, onDone]);

  const handleSkip = () => {
    tlRef.current?.kill();
    if (!firedRef.current.whiteout) {
      firedRef.current.whiteout = true;
      onWhiteout();
    }
    if (!firedRef.current.done) {
      firedRef.current.done = true;
      onDone();
    }
    if (onSkip) onSkip();
  };

  return (
    <div ref={rootRef} className="atlas-dive">
      <CloudBloom />
      <button type="button" className="atlas-skip atlas-dive-skip" onClick={handleSkip}>
        Skip intro
      </button>
    </div>
  );
};

DiveSequence.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types -- a plain ref object
  globeApiRef: PropTypes.object,
  onWhiteout: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
  onSkip: PropTypes.func,
};

DiveSequence.defaultProps = {
  globeApiRef: null,
  onSkip: null,
};

export default DiveSequence;
