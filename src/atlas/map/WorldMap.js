// WorldMap — the atlas hub (§4.6). One SVG, viewBox 0 0 2000 1250, driven by
// usePanZoom (drag / wheel / pinch). Layer order per plan: Sky → Far → Mid
// (biomes) → Near (props, phase 11) → Region hotspots → Eggs (phase 6) →
// Labels. All art is aria-hidden decoration; interaction lives in the hotspot
// layer (role="link", roving tabindex, arrows walk the geographic ring,
// Enter/Space activates, Escape resets zoom) plus an offscreen nav with real
// links for screen readers.
//
// Navigation contract (§4.7): activating a region flies the camera to its
// viewBox, then navigates with state.fromMap = true (RegionShell keys its
// entrance on it, phase 5). Arriving with state.toRegion (sent by
// ReturnPortal) mounts the camera on that region and pulls out — the exact
// reverse read.

import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Link, useLocation, useNavigate } from "react-router-dom";
import usePanZoom from "../../hooks/usePanZoom";
import { playSfx } from "../audio/sfxBus";
import { useWorld } from "../world/WorldContext";
import { EGGS } from "../gamification/easterEggs";
import { LAYOUTS, MAP_W, MAP_H } from "./mapRegions";
import RegionHotspot from "./RegionHotspot";
import EasterEggHotspot from "./EasterEggHotspot";
import StatsWidget from "./StatsWidget";
import AskLighthouse from "./AskLighthouse";
import MapControls from "./MapControls";
import initMapParallax from "./parallax";
import SkyLayer from "./art/SkyLayer";
import NearProps from "./art/NearProps";
import BiomeRidge from "./art/BiomeRidge";
import BiomeForest from "./art/BiomeForest";
import BiomeWorkshop from "./art/BiomeWorkshop";
import BiomeCoast from "./art/BiomeCoast";
import BiomeScriptorium from "./art/BiomeScriptorium";
import BiomeSquare from "./art/BiomeSquare";
import "./worldMap.css";

const ART = {
  treks: BiomeRidge,
  reader: BiomeForest,
  creator: BiomeWorkshop,
  marathons: BiomeCoast,
  writer: BiomeScriptorium,
  person: BiomeSquare,
};

// Extends past the canvas edges so the far layer's parallax lag (±90 world
// units, see parallax.js) can never expose a gap at the map's borders.
const FAR_RANGE = "M-140,466 Q-30,398 90,462 Q210,396 330,464 Q450,398 600,465 "
  + "Q780,396 960,462 Q1140,400 1320,465 Q1500,396 1680,462 Q1840,404 2000,460 "
  + "Q2070,428 2140,458 L2140,540 L-140,540 Z";
const SEA = "M0,830 C180,845 320,900 430,975 C540,1050 640,1140 690,1250 L0,1250 Z";
const SHORE = "M0,830 C180,845 320,900 430,975 C540,1050 640,1140 690,1250";

const prefersReducedMotion = () => typeof window !== "undefined"
  && !!window.matchMedia
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const MOBILE_MQ = "(max-width: 640px)";
// Screens taller than wide get the portrait canvas (LAYOUTS in mapRegions.js).
const PORTRAIT_MQ = "(orientation: portrait)";

const matches = (query) => typeof window !== "undefined"
  && !!window.matchMedia
  && window.matchMedia(query).matches;

const smallViewport = () => matches(MOBILE_MQ);

// preserveAspectRatio per viewport: the resting view is always the whole map,
// so every region sits in one window. Small screens and the portrait canvas
// *fit* it (letterboxing into the sky); wider landscape screens keep the
// immersive full-bleed slice, where the landscape map already fills the frame.
const MOBILE_FIT = "xMidYMid meet";
const DESKTOP_FIT = "xMidYMid slice";
const fitFor = (small) => (small ? MOBILE_FIT : DESKTOP_FIT);

const MapCanvas = ({ entry, layout }) => {
  const REGIONS = layout.regions;
  const restingView = () => layout.fullView;
  const navigate = useNavigate();
  const { state } = useLocation();
  const { world, foundEgg } = useWorld();
  const [hoverKey, setHoverKey] = useState(null);
  const [focusKey, setFocusKey] = useState(null);
  const [rovingKey, setRovingKey] = useState("person");
  const [flying, setFlying] = useState(false);
  const [fit, setFit] = useState(() => fitFor(smallViewport()));
  const hotspotRefs = useRef({});
  const flightRef = useRef(null);
  const skyRef = useRef(null);
  const farRef = useRef(null);
  const nearRef = useRef(null);
  const parallaxRef = useRef(null);

  // Mount camera (mount-only): after the dive, tight on the center to pull out
  // as the clouds part (entry="intro"); else on the returning region for the
  // reverse fly-in; else the resting view (the whole map).
  const initialViewBox = useMemo(() => {
    if (entry === "intro" && !prefersReducedMotion()) return layout.introView;
    const back = state?.toRegion && REGIONS.find((r) => r.key === state.toRegion);
    if (back && !prefersReducedMotion()) return back.viewBox;
    return restingView();
  }, []); // mount-only: the entry camera is captured once

  const { svgRef, viewBox, animateTo, zoomCenter, didDrag, handlers } = usePanZoom({
    initialViewBox, minWidth: layout.zoom[0], maxWidth: layout.zoom[1],
  });

  // Fly the camera home — the resting view (the whole map). Shared by the
  // Escape key and the Reset control.
  const resetView = () => {
    if (flying) return;
    animateTo(restingView(), 400);
  };

  // Pull out to the full map on arrival — from the dive (intro) or from a
  // region (the exact reverse read of the fly-in). Mount-only.
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    if (entry === "intro") {
      const id = setTimeout(() => animateTo(restingView(), 900), 60);
      return () => clearTimeout(id);
    }
    if (!state?.toRegion) return undefined;
    const id = setTimeout(() => animateTo(restingView(), 700), 80);
    return () => clearTimeout(id);
  }, []); // mount-only: entry pull-out runs once on arrival

  useEffect(() => () => clearTimeout(flightRef.current), []);

  // Track the mobile breakpoint so the fit mode (and thus whether all six
  // regions are visible at once) follows orientation / resize changes.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setFit(fitFor(mq.matches));
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Parallax (phase 11): backdrop layers lag / near props lead the camera,
  // plus pointer drift on fine pointers. Mount-only; parallax.js no-ops under
  // prefers-reduced-motion and only ever touches layer transforms (§4.6).
  useEffect(() => {
    const rest = restingView();
    parallaxRef.current = initMapParallax(
      { sky: skyRef.current, far: farRef.current, near: nearRef.current },
      { cx: rest.x + rest.w / 2, cy: rest.y + rest.h / 2 },
      svgRef.current,
    );
    return parallaxRef.current.dispose;
  }, []); // mount-only: layer elements live for the map's lifetime

  useEffect(() => {
    parallaxRef.current?.onViewBox(viewBox);
  }, [viewBox]);

  // didDrag only guards pointer clicks (a drag ending over a hotspot still
  // fires click); keyboard activation must never be blocked by a stale flag.
  const flyTo = (region, source) => {
    if (flying || (source === "pointer" && didDrag.current)) return;
    setHoverKey(null);
    if (prefersReducedMotion()) {
      navigate(region.path, { state: { fromMap: true } });
      return;
    }
    setFlying(true);
    playSfx("whoosh");
    animateTo(region.viewBox, 450);
    flightRef.current = setTimeout(
      () => navigate(region.path, { state: { fromMap: true } }),
      480,
    );
  };

  // Landmarks (the stats placard above the Book Forest, the lighthouse into
  // /ask) are shortcuts, not regions, so they navigate straight there (no
  // camera fly); the didDrag guard still stops a map-drag that ends over one.
  const goToLandmark = (path, source) => {
    if (flying || (source === "pointer" && didDrag.current)) return;
    setHoverKey(null);
    playSfx("chime");
    navigate(path, { state: { fromMap: true } });
  };

  const moveRoving = (delta) => {
    const idx = REGIONS.findIndex((r) => r.key === rovingKey);
    const next = REGIONS[(idx + delta + REGIONS.length) % REGIONS.length];
    setRovingKey(next.key);
    hotspotRefs.current[next.key]?.focus();
  };

  const jumpRoving = (index) => {
    const next = REGIONS[index];
    setRovingKey(next.key);
    hotspotRefs.current[next.key]?.focus();
  };

  const onKeyDown = (e) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        moveRoving(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        moveRoving(-1);
        break;
      case "Home":
        e.preventDefault();
        jumpRoving(0);
        break;
      case "End":
        e.preventDefault();
        jumpRoving(REGIONS.length - 1);
        break;
      case "Escape":
        resetView();
        break;
      default:
    }
  };

  const liftedKey = hoverKey || focusKey;

  return (
    <div className={`atlas-map-viewport${flying ? " is-flying" : ""}`}>
      {/* Screen-reader mirror of the map (§4.6) — real links, real nav. */}
      <nav className="atlas-sr-only" aria-label="World regions">
        <ul>
          {REGIONS.map((r) => (
            <li key={r.key}>
              <Link
                to={r.path}
                state={{ fromMap: true }}
              >{`${r.name} — ${r.blurb}`}</Link>
            </li>
          ))}
          {/* The stats placard above the Book Forest (StatsWidget) mirrored. */}
          <li>
            <Link to="/stats" state={{ fromMap: true }}>
              Statistics — life in numbers
            </Link>
          </li>
          <li>
            <Link to="/ask" state={{ fromMap: true }}>
              Lighthouse — ask the archive
            </Link>
          </li>
        </ul>
      </nav>

      <svg
        ref={svgRef}
        className="atlas-worldmap"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        width="100%"
        height="100%"
        preserveAspectRatio={layout.key === "portrait" ? MOBILE_FIT : fit}
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerLeave={handlers.onPointerLeave}
        onPointerCancel={handlers.onPointerCancel}
        onKeyDown={onKeyDown}
      >
        <g aria-hidden="true">
          <g ref={skyRef}>
            <SkyLayer {...layout.sky} />
          </g>

          {/* FarLayer (parallax factor: lags the camera, see parallax.js) */}
          <g ref={farRef}>
            {/* Inner group: parallax owns the outer one's transform. */}
            <g transform={layout.far}>
              <path d={FAR_RANGE} fill="var(--atlas-foliage-3)" opacity=".38" />
            </g>
          </g>

          {/* Ground, sea, roads */}
          <path d={layout.ground} fill="var(--atlas-foliage-1)" />
          <ellipse
            cx={layout.glow[0]}
            cy={layout.glow[1]}
            rx={layout.glow[2]}
            ry={layout.glow[3]}
            fill="var(--atlas-horizon)"
            opacity=".16"
          />
          {/* The sea rides with the coast (portrait moves both together). */}
          <g transform={layout.sea}>
            <path d={SEA} fill="var(--atlas-water)" />
            <path
              d={SHORE}
              fill="none"
              stroke="var(--atlas-parchment)"
              strokeWidth="6"
              opacity=".55"
            />
            <g
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinecap="round"
              opacity=".3"
            >
              <path d="M120,980 h55" />
              <path d="M240,1080 h48" />
              <path d="M420,1150 h60" />
              <path d="M150,1160 h40" />
            </g>
          </g>
          <g fill="none" strokeLinecap="round">
            {layout.roads.map((d) => (
              <path
                key={d}
                d={d}
                stroke="var(--atlas-foliage-3)"
                strokeWidth="17"
                opacity=".45"
              />
            ))}
            {layout.roads.map((d) => (
              <path
                key={`top-${d}`}
                d={d}
                stroke="var(--atlas-parchment)"
                strokeWidth="10"
                opacity=".9"
              />
            ))}
          </g>

          {/* MidLayer — six biomes ([data-region] supplies --atlas-accent) */}
          <g>
            {REGIONS.map((r) => {
              const Art = ART[r.key];
              return (
                <g
                  key={r.key}
                  data-region={r.key}
                  transform={r.art}
                >
                  <g
                    className={`atlas-lift${liftedKey === r.key ? " is-lifted" : ""}`}
                  >
                    <Art />
                  </g>
                </g>
              );
            })}
          </g>

          {/* NearLayer — foreground props, leading the camera slightly */}
          {layout.near && (
            <g ref={nearRef} className="atlas-near-layer">
              <NearProps />
            </g>
          )}

          {/* LabelLayer — plaques lift with their region */}
          <g>
            {REGIONS.map((r) => {
              const [px, py, pw] = r.plaque;
              return (
                <g key={r.key} transform={`translate(${px},${py}) scale(${r.plaqueScale})`}>
                  <g
                    className={`atlas-lift${liftedKey === r.key ? " is-lifted" : ""}`}
                  >
                    <rect
                      width={pw}
                      height="33"
                      rx="8"
                      fill="var(--atlas-parchment)"
                      stroke="var(--atlas-line)"
                    />
                    <circle cx="20" cy="16.5" r="6" fill={r.color} />
                    <text
                      className="atlas-plaque-text"
                      x={pw / 2 + 10}
                      y="22"
                      textAnchor="middle"
                      fontSize="15"
                    >
                      {r.name.toUpperCase()}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </g>

        {/* RegionLayer — the only interactive content inside the SVG */}
        <g>
          {REGIONS.map((r) => (
            <RegionHotspot
              key={r.key}
              ref={(node) => {
                hotspotRefs.current[r.key] = node;
              }}
              region={r}
              tabbable={rovingKey === r.key}
              onActivate={(source) => flyTo(r, source)}
              onHoverStart={() => setHoverKey(r.key)}
              onHoverEnd={() => setHoverKey((k) => (k === r.key ? null : k))}
              onFocus={() => {
                setFocusKey(r.key);
                setRovingKey(r.key);
              }}
              onBlur={() => setFocusKey((k) => (k === r.key ? null : k))}
            />
          ))}
        </g>

        {/* StatsLayer — a shortcut placard hanging above the Book Forest that
            jumps to /stats. Interactive, so outside the aria-hidden art. */}
        <StatsWidget at={layout.stats} onActivate={(source) => goToLandmark("/stats", source)} />

        {/* LighthouseLayer — the coast's lighthouse opens /ask. After the
            RegionLayer so it wins the click inside the Marathons hotspot. */}
        <AskLighthouse
          {...layout.lighthouse}
          onActivate={(source) => goToLandmark("/ask", source)}
        />

        {/* EggLayer (§4.6) — interactive, so it lives outside the aria-hidden
            art; hints are vague on purpose. Suppressed during a fly-in. */}
        <g className="atlas-egg-layer">
          {EGGS.map((egg) => (
            <EasterEggHotspot
              key={egg.id}
              egg={{ ...egg, at: layout.eggAt(egg) }}
              found={!!world.eggs[egg.id]}
              onFound={foundEgg}
            />
          ))}
        </g>
      </svg>

      {/* Zoom cluster — pointer/touch affordance for the wheel/pinch gestures,
          with Reset as the way back when a pinch strands the view. Hidden
          during a fly-in via the .is-flying rule (worldMap.css). */}
      <MapControls
        onZoomIn={() => !flying && zoomCenter(0.8)}
        onZoomOut={() => !flying && zoomCenter(1.25)}
        onReset={resetView}
      />
    </div>
  );
};

const entryProp = PropTypes.oneOf(["intro", "return", "direct"]);

MapCanvas.propTypes = {
  entry: entryProp,
  layout: PropTypes.shape({
    key: PropTypes.string.isRequired,
    regions: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  }).isRequired,
};

MapCanvas.defaultProps = {
  entry: null,
};

// Picks the canvas for the screen's orientation and remounts the map when it
// flips: the entry camera, the parallax rest point and the zoom limits are all
// captured at mount, in the coordinates of one canvas.
const WorldMap = ({ entry }) => {
  const [portrait, setPortrait] = useState(() => matches(PORTRAIT_MQ));

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia(PORTRAIT_MQ);
    const sync = () => setPortrait(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const layout = LAYOUTS[portrait ? "portrait" : "landscape"];
  return <MapCanvas key={layout.key} layout={layout} entry={entry} />;
};

WorldMap.propTypes = {
  // "intro" = post-dive center pull-out; "return"/"direct"/null = existing reads.
  entry: entryProp,
};

WorldMap.defaultProps = {
  entry: null,
};

// Referenced by AtlasHome for layout math; kept exported for phase 4's dive
// hand-off (the whiteout frame mounts the map pre-zoomed at center, §4.2).
export { MAP_W, MAP_H };

export default WorldMap;
