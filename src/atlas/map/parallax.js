// Map-hub parallax (§4.6, phase 11) — depth from two sources, applied with
// gsap.quickTo (a smoothed quickSetter) on layer <g> transforms:
//
//   1. Camera lag: as usePanZoom moves the viewBox, the sky and far range
//      follow the camera a little (so they appear further away) while the
//      near-prop strip leads it slightly (so it appears closer). Offsets are
//      dampened fractions of the camera-center displacement and clamped so
//      panning to a map corner can never tear the backdrop off its edges.
//   2. Pointer drift: on fine pointers, ±8px of cursor drift (scaled per
//      layer, converted to world units at the current zoom).
//
// Alignment rule: ONLY non-interactive backdrop layers move. The world layer
// (ground, roads, biomes, labels, hotspots, eggs) stays camera-true, so hit
// rects and plaques can never drift from their art. Ownership rule (§4.6)
// respected: usePanZoom owns the viewBox; this module only ever touches
// element transforms.

import { gsap } from "../lib/gsap";

const LAYERS = {
  sky: { pan: 0.1, clamp: 55, driftPx: 3 },
  far: { pan: 0.22, clamp: 90, driftPx: 5 },
  near: { pan: -0.06, clamp: 45, driftPx: -8 },
};

const clamp = (v, limit) => Math.min(Math.max(v, -limit), limit);

const noop = { onViewBox: () => {}, dispose: () => {} };

const prefersReducedMotion = () => (
  typeof window !== "undefined"
  && !!window.matchMedia
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches
);

const hasFinePointer = () => (
  typeof window !== "undefined"
  && !!window.matchMedia
  && window.matchMedia("(pointer: fine)").matches
);

/**
 * @param {Object} els     { sky, far, near } — layer <g> elements (any may be null)
 * @param {Object} rest    resting camera center { cx, cy } (offsets are zero there)
 * @param {Element} viewport  element to listen on for pointer drift
 */
const initMapParallax = (els, rest, viewport) => {
  if (prefersReducedMotion()) return noop;

  const layers = Object.entries(LAYERS)
    .filter(([key]) => els[key])
    .map(([key, conf]) => ({
      key,
      conf,
      el: els[key],
      toX: gsap.quickTo(els[key], "x", { duration: 0.5, ease: "power2.out" }),
      toY: gsap.quickTo(els[key], "y", { duration: 0.5, ease: "power2.out" }),
      pan: { x: 0, y: 0 },
      drift: { x: 0, y: 0 },
    }));
  if (!layers.length) return noop;

  const apply = (layer) => {
    layer.toX(layer.pan.x + layer.drift.x);
    layer.toY(layer.pan.y + layer.drift.y);
  };

  // Last seen viewBox — drift needs the current zoom to convert px → world.
  let lastVb = null;

  const onViewBox = (vb) => {
    lastVb = vb;
    const dx = (vb.x + vb.w / 2) - rest.cx;
    const dy = (vb.y + vb.h / 2) - rest.cy;
    for (let i = 0; i < layers.length; i += 1) {
      const layer = layers[i];
      const { pan, clamp: limit } = layer.conf;
      layer.pan.x = clamp(dx * pan, limit);
      layer.pan.y = clamp(dy * pan, limit / 2);
      apply(layer);
    }
  };

  let onPointerMove = null;
  if (hasFinePointer() && viewport) {
    onPointerMove = (e) => {
      if (!lastVb) return;
      const rect = viewport.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      // Normalized cursor position in [-1, 1] around the viewport center.
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      const worldPerPx = lastVb.w / rect.width;
      for (let i = 0; i < layers.length; i += 1) {
        const layer = layers[i];
        layer.drift.x = nx * layer.conf.driftPx * worldPerPx;
        layer.drift.y = ny * (layer.conf.driftPx / 2) * worldPerPx;
        apply(layer);
      }
    };
    viewport.addEventListener("pointermove", onPointerMove, { passive: true });
  }

  return {
    onViewBox,
    dispose: () => {
      if (onPointerMove) viewport.removeEventListener("pointermove", onPointerMove);
      layers.forEach((layer) => gsap.killTweensOf(layer.el));
    },
  };
};

export default initMapParallax;
