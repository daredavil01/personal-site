// View-mode resolution for the two-shell architecture (§4.1).
//
// Priority order (first match wins):
//   1. ?view=classic / ?view=atlas URL param (also persisted as the choice)
//   2. Stored preference (atlas.v1 `view`, explicit user choice only)
//   3. prefers-reduced-motion: reduce -> classic (automatic escape hatch)
//   4. atlas.preview localStorage flag -> atlas (the dark-build preview
//      mechanism, kept so anyone who opted in during the preview keeps the
//      atlas without having to re-choose it)
//   5. DEFAULT_VIEW feature flag ("classic" since v13.2.0)
//
// Everything is resolved synchronously from state initializers / context so
// the first render is deterministic — no post-mount mode flip, no flash.
//
// PRERENDER CONSTRAINT: react-snap is NOT in dependencies today; the
// hydrateRoot branch in src/index.js is a legacy guard that never fires. If
// prerendering is ever added, this synchronous localStorage/matchMedia read
// would make server and client markup diverge — view-mode would have to
// become a post-mount upgrade instead. Revisit this file before adding any
// prerender step.

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { DEFAULT_VIEW } from "../config/featureFlags";
import { useWorld } from "./world/WorldContext";

// Pure resolution — unit-tested in useViewMode.test.js.
export function resolveViewMode({ param, storedView, reducedMotion, preview, defaultView }) {
  if (param === "classic" || param === "atlas") return param;
  if (storedView === "classic" || storedView === "atlas") return storedView;
  if (reducedMotion) return "classic";
  if (preview) return "atlas";
  return defaultView === "atlas" ? "atlas" : "classic";
}

const readReducedMotion = () => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export default function useViewMode() {
  const location = useLocation();
  const { world, preview, setView } = useWorld();
  const [reducedMotion] = useState(readReducedMotion);

  const rawParam = new URLSearchParams(location.search).get("view");
  const param = rawParam === "classic" || rawParam === "atlas" ? rawParam : null;

  // The URL param persists the choice (§4.1) so it survives navigation.
  useEffect(() => {
    if (param && param !== world.view) setView(param);
  }, [param, world.view, setView]);

  return resolveViewMode({
    param,
    storedView: world.view,
    reducedMotion,
    preview,
    defaultView: DEFAULT_VIEW,
  });
}
