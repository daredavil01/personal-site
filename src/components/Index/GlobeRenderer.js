import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Globe from "react-globe.gl";
import { useTheme } from "../../context/ThemeContext";
import { DOMAINS, PIN_ICONS, findDomainIndexByKey, hexToRgba } from "./globe/domains";
import DomainLegend from "./globe/DomainLegend";
import DomainInfoCard from "./globe/DomainInfoCard";
import ExplorationTracker from "./globe/ExplorationTracker";
import CoachMark from "./globe/CoachMark";
import Starfield from "./globe/Starfield";
import launchConfetti from "./globe/confetti";
import "./globe/globe.css";

const VISITED_KEY = "globe-visited-worlds";
const CELEBRATED_KEY = "globe-all-worlds-celebrated";
const COACH_KEY = "globe-coach-seen";
const DEFAULT_DOMAIN_INDEX = 5; // Person
const ZOOMED_ALTITUDE = 0.42;

const readJson = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    /* private mode etc. — non-fatal */
  }
};

const escapeHtml = (s = "") => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Sports dates are "February 23, 2025"; trek dates are "17-02-2019".
const parseEventTime = (pin) => {
  if (pin.type === "marathon") {
    const t = Date.parse(pin.data.date);
    return Number.isNaN(t) ? null : t;
  }
  if (pin.type === "trek") {
    const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(pin.data.date || "");
    return m ? new Date(+m[3], +m[2] - 1, +m[1]).getTime() : null;
  }
  return null;
};

const initialDomainIndex = () => {
  try {
    const world = new URLSearchParams(window.location.search).get("world");
    const idx = world ? findDomainIndexByKey(world.toLowerCase()) : -1;
    return idx >= 0 ? idx : DEFAULT_DOMAIN_INDEX;
  } catch (e) {
    return DEFAULT_DOMAIN_INDEX;
  }
};

const controlBtnCls = "w-10 h-10 bg-white/80 dark:bg-stone-800/80 backdrop-blur-md text-stone-700 dark:text-stone-300 rounded-full shadow-lg border border-stone-200 dark:border-stone-700 flex items-center justify-center hover:bg-white dark:hover:bg-stone-800 transition-colors";

const GlobeRenderer = ({ pins, onPinClick, paused }) => {
  const rootRef = useRef(null);
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const reducedMotion = useMemo(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false,
    [],
  );
  const isTouch = useMemo(
    () => window.matchMedia?.("(pointer: coarse)")?.matches ?? false,
    [],
  );

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeDomainIndex, setActiveDomainIndex] = useState(initialDomainIndex);
  const [zoomedIn, setZoomedIn] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [journeyIndex, setJourneyIndex] = useState(null); // null = journey off
  const [journeyArc, setJourneyArc] = useState(null);
  const [caption, setCaption] = useState(null);
  const [visitedKeys, setVisitedKeys] = useState(() => readJson(VISITED_KEY, []));
  const [toast, setToast] = useState(null);
  const [showCoach, setShowCoach] = useState(() => !readJson(COACH_KEY, false));
  const [hasFocused, setHasFocused] = useState(false);

  // Refs mirroring state/flags so window-level listeners avoid stale closures.
  const interactingRef = useRef(false); // pointer currently down on the globe
  const interactedRef = useRef(false); // has ever interacted (gates URL sync)
  const sectionVisibleRef = useRef(false);
  const pausedRef = useRef(paused);
  const autoPlayRef = useRef(autoPlay);
  const journeyRef = useRef(journeyIndex);
  const fullscreenRef = useRef(isFullscreen);
  const dwellRef = useRef({ index: -1, ticks: 0 });
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);
  useEffect(() => {
    journeyRef.current = journeyIndex;
  }, [journeyIndex]);
  useEffect(() => {
    fullscreenRef.current = isFullscreen;
  }, [isFullscreen]);

  const flyTo = useCallback(
    (lat, lng, altitude = 0.6, ms = 1200) => {
      if (!globeRef.current) return;
      globeRef.current.pointOfView({ lat, lng, altitude }, reducedMotion ? 0 : ms);
    },
    [reducedMotion],
  );

  const dismissCoach = useCallback(() => {
    setShowCoach((prev) => {
      if (prev) writeStorage(COACH_KEY, "true");
      return false;
    });
  }, []);

  const stopModes = useCallback(() => {
    setAutoPlay(false);
    setJourneyIndex(null);
    setJourneyArc(null);
    setCaption(null);
  }, []);

  // ---- Data derivations -------------------------------------------------

  const counts = useMemo(() => {
    const byKey = {};
    DOMAINS.forEach((d) => {
      byKey[d.key] = pins.filter((p) => p.type === d.type).length;
    });
    return byKey;
  }, [pins]);

  // Journey replay stops. Round-robin across all six worlds so every "next
  // move" rotates the globe to a different section (marathon → trek → writer →
  // …), instead of staying within one band. Marathons/treks keep chronological
  // order within their slice; each world contributes up to PER_DOMAIN_CAP stops.
  const journeyStops = useMemo(() => {
    const PER_DOMAIN_CAP = 3;
    const byDomain = DOMAINS.map((d) => {
      let arr = pins.filter((p) => p.type === d.type);
      if (d.type === "marathon" || d.type === "trek") {
        arr = arr
          .map((p) => ({ p, t: parseEventTime(p) }))
          .sort((a, b) => (a.t ?? 0) - (b.t ?? 0))
          .map((x) => x.p);
      }
      return arr.slice(0, PER_DOMAIN_CAP);
    });
    const maxLen = Math.max(0, ...byDomain.map((a) => a.length));
    const stops = [];
    for (let i = 0; i < maxLen; i += 1) {
      byDomain.forEach((arr) => {
        if (arr[i]) stops.push(arr[i]);
      });
    }
    return stops;
  }, [pins]);

  // Constellation arcs linking the active domain's pins, plus the journey hop.
  const arcsData = useMemo(() => {
    const active = DOMAINS[activeDomainIndex];
    const domainPins = pins.filter((p) => p.type === active.type);
    const arcs = [];
    for (let i = 0; i < domainPins.length - 1; i += 1) {
      arcs.push({
        startLat: domainPins[i].lat,
        startLng: domainPins[i].lng,
        endLat: domainPins[i + 1].lat,
        endLng: domainPins[i + 1].lng,
        color: hexToRgba(active.color, 0.35),
        stroke: 0.22,
        dashTime: reducedMotion ? 0 : 2800,
      });
    }
    if (journeyArc) arcs.push(journeyArc);
    return arcs;
  }, [pins, activeDomainIndex, journeyArc, reducedMotion]);

  // Procedural hex terrain around the active domain (kept from v1, module-level data).
  const baseGrid = useMemo(() => {
    const points = [];
    for (let i = 0; i < 8000; i += 1) {
      const phi = Math.acos(1 - 2 * Math.random());
      const theta = Math.random() * 2 * Math.PI;
      points.push({
        lat: 90 - (phi * 180) / Math.PI,
        lng: (theta * 180) / Math.PI - 180,
      });
    }
    return points;
  }, []);

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const phi1 = (90 - lat1) * (Math.PI / 180);
    const phi2 = (90 - lat2) * (Math.PI / 180);
    const theta1 = lng1 * (Math.PI / 180);
    const theta2 = lng2 * (Math.PI / 180);
    const x1 = Math.sin(phi1) * Math.cos(theta1);
    const y1 = Math.sin(phi1) * Math.sin(theta1);
    const z1 = Math.cos(phi1);
    const x2 = Math.sin(phi2) * Math.cos(theta2);
    const y2 = Math.sin(phi2) * Math.sin(theta2);
    const z2 = Math.cos(phi2);
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2 + (z1 - z2) ** 2);
  };

  const lerpColor = (c1, c2, t) => {
    const hex1 = parseInt(c1.slice(1), 16);
    const hex2 = parseInt(c2.slice(1), 16);
    /* eslint-disable no-bitwise */
    const r1 = (hex1 >> 16) & 255;
    const g1 = (hex1 >> 8) & 255;
    const b1 = hex1 & 255;
    const r2 = (hex2 >> 16) & 255;
    const g2 = (hex2 >> 8) & 255;
    const b2 = hex2 & 255;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
    /* eslint-enable no-bitwise */
  };

  const hexData = useMemo(() => {
    const activeD = DOMAINS[activeDomainIndex];
    const localHexes = [];
    baseGrid.forEach((p) => {
      const d = getDistance(p.lat, p.lng, activeD.lat, activeD.lng);
      if (d < 0.7) {
        let weight = 0;
        if (activeD.label === "Treks") {
          weight = Math.exp(-(d * d) * 12) * 3.5;
        } else if (activeD.label === "Reader") {
          const step = Math.floor(d * 15);
          let base = 0;
          if (d < 0.4) {
            if (step % 3 === 0) base = 2.5;
            else if (step % 2 === 0) base = 1.2;
            else base = 0.5;
          }
          weight = base;
          if (d < 0.3) weight += Math.random() * 0.8;
        } else if (activeD.label === "Creator") {
          const grid = Math.sin(p.lat * 12) * Math.cos(p.lng * 12);
          weight = Math.abs(grid) > 0.8 && d < 0.4 ? 2.5 : 0;
        } else if (activeD.label === "Marathons") {
          weight = Math.abs(Math.sin(d * 25)) * Math.exp(-(d * d) * 6) * 2.0;
        } else if (activeD.label === "Writer") {
          weight = Math.abs(Math.sin(p.lng * 5)) * Math.exp(-(d * d) * 8) * 1.2;
        } else {
          weight = Math.cos(d * 20) * Math.exp(-(d * d) * 12) * 1.0;
        }
        if (weight > 0.1) {
          localHexes.push({ ...p, weight: weight + 0.05 });
        }
      }
    });
    return localHexes;
  }, [baseGrid, activeDomainIndex]);

  // ---- Layout / lifecycle ------------------------------------------------

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    setDimensions({ width: el.clientWidth, height: el.clientHeight });
    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Track whether the section is on screen (gates scroll-rotation).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      sectionVisibleRef.current = entry.isIntersecting;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Initial camera: fly to the deep-linked (or default) domain.
  useEffect(() => {
    if (globeRef.current && !hasFocused && dimensions.width > 0) {
      setHasFocused(true);
      const d = DOMAINS[activeDomainIndex];
      const t = setTimeout(() => flyTo(d.lat, d.lng, 0.6, 2000), 200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [dimensions, hasFocused, activeDomainIndex, flyTo]);

  // Interaction flags: any pointer contact counts as "user took over".
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onPointerDown = () => {
      interactingRef.current = true;
      interactedRef.current = true;
      dismissCoach();
      if (autoPlayRef.current || journeyRef.current !== null) stopModes();
    };
    const onPointerUp = () => {
      interactingRef.current = false;
    };
    const onWheel = () => {
      interactedRef.current = true;
      if (autoPlayRef.current || journeyRef.current !== null) stopModes();
    };
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dismissCoach, stopModes]);

  // Refined scroll-driven rotation: only while visible, idle and not paused.
  useEffect(() => {
    if (reducedMotion) return undefined;
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      if (
        !globeRef.current
        || !sectionVisibleRef.current
        || interactingRef.current
        || pausedRef.current
        || autoPlayRef.current
        || journeyRef.current !== null
        || fullscreenRef.current
      ) {
        return;
      }
      const pov = globeRef.current.pointOfView();
      globeRef.current.pointOfView({ ...pov, lng: pov.lng + delta * 0.06 }, 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reducedMotion]);

  // Poll the camera: derive active domain, zoom level and dwell-based visits.
  useEffect(() => {
    const interval = setInterval(() => {
      if (!globeRef.current) return;
      const pov = globeRef.current.pointOfView();
      setZoomedIn(pov.altitude < ZOOMED_ALTITUDE);
      const normalizedLng = ((pov.lng % 360) + 360) % 360;
      let nearestIndex = 0;
      let minDiff = Infinity;
      DOMAINS.forEach((d, i) => {
        const diff = Math.min(
          Math.abs(normalizedLng - d.lng),
          360 - Math.abs(normalizedLng - d.lng),
        );
        if (diff < minDiff) {
          minDiff = diff;
          nearestIndex = i;
        }
      });
      setActiveDomainIndex((prev) => (prev !== nearestIndex ? nearestIndex : prev));

      // Count ~1.5s of dwell (6 ticks) on screen as "explored".
      if (sectionVisibleRef.current) {
        const dwell = dwellRef.current;
        if (dwell.index === nearestIndex) {
          dwell.ticks += 1;
        } else {
          dwellRef.current = { index: nearestIndex, ticks: 1 };
        }
        if (dwellRef.current.ticks === 6) {
          const { key } = DOMAINS[nearestIndex];
          setVisitedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
        }
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Persist visits; celebrate once when all six worlds have been seen.
  useEffect(() => {
    writeStorage(VISITED_KEY, JSON.stringify(visitedKeys));
    if (visitedKeys.length === DOMAINS.length && !readJson(CELEBRATED_KEY, false)) {
      writeStorage(CELEBRATED_KEY, "true");
      if (!reducedMotion) {
        launchConfetti(
          containerRef.current,
          DOMAINS.map((d) => d.color),
        );
      }
      setToast("World traveler! You've explored all six worlds.");
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [visitedKeys, reducedMotion]);

  // Sync ?world= into the URL once the visitor has actually interacted.
  useEffect(() => {
    if (!interactedRef.current) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("world", DOMAINS[activeDomainIndex].key);
      window.history.replaceState(null, "", url);
    } catch (e) {
      /* URL API unavailable — skip deep-link sync */
    }
  }, [activeDomainIndex]);

  // Auto-dismiss the coach mark even without interaction.
  useEffect(() => {
    if (!showCoach) return undefined;
    const t = setTimeout(dismissCoach, 8000);
    return () => clearTimeout(t);
  }, [showCoach, dismissCoach]);

  // Auto-play: drift world-to-world every 5s until any interaction.
  useEffect(() => {
    if (!autoPlay) return undefined;
    let index = activeDomainIndex;
    const advance = () => {
      index = (index + 1) % DOMAINS.length;
      const d = DOMAINS[index];
      flyTo(d.lat, d.lng, 0.6, 1400);
    };
    const id = setInterval(advance, 5000);
    advance();
    return () => clearInterval(id);
    // activeDomainIndex intentionally omitted: it's only the starting point.
  }, [autoPlay, flyTo]);

  // Journey replay: hop chronologically through races and treks.
  useEffect(() => {
    if (journeyIndex === null) return undefined;
    if (journeyIndex >= journeyStops.length) {
      setCaption({ icon: "flag", title: "Journey complete!", meta: `${journeyStops.length} adventures` });
      const t = setTimeout(() => {
        setJourneyIndex(null);
        setJourneyArc(null);
        setCaption(null);
      }, 2600);
      return () => clearTimeout(t);
    }
    const pin = journeyStops[journeyIndex];
    const prev = journeyIndex > 0 ? journeyStops[journeyIndex - 1] : null;
    // Higher altitude so the camera visibly rotates across sections each hop.
    flyTo(pin.lat, pin.lng, 0.55, 1300);
    const time = parseEventTime(pin);
    const domainLabel = DOMAINS.find((d) => d.type === pin.type)?.label ?? "";
    const yearPart = time ? `${new Date(time).getFullYear()} · ` : "";
    setCaption({
      icon: PIN_ICONS[pin.type],
      color: pin.color,
      title: `${domainLabel} — ${pin.label}`,
      meta: `${yearPart}${journeyIndex + 1}/${journeyStops.length}`,
    });
    if (prev) {
      setJourneyArc({
        startLat: prev.lat,
        startLng: prev.lng,
        endLat: pin.lat,
        endLng: pin.lng,
        color: "#fbbf24",
        stroke: 0.5,
        dashTime: reducedMotion ? 0 : 1200,
      });
    }
    const t = setTimeout(() => setJourneyIndex((i) => (i === null ? null : i + 1)), 2600);
    return () => clearTimeout(t);
  }, [journeyIndex, journeyStops, flyTo, reducedMotion]);

  // Fullscreen: lock page scroll and allow Escape to exit.
  useEffect(() => {
    if (!isFullscreen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isFullscreen]);

  // ---- Handlers ----------------------------------------------------------

  const handleZoom = (direction) => {
    if (!globeRef.current) return;
    const current = globeRef.current.pointOfView();
    const delta = direction > 0 ? -0.2 : 0.2;
    const newAltitude = Math.max(0.05, Math.min(3, current.altitude + delta));
    globeRef.current.pointOfView({ ...current, altitude: newAltitude }, reducedMotion ? 0 : 300);
  };

  const handleSelectDomain = (i) => {
    interactedRef.current = true;
    dismissCoach();
    stopModes();
    const d = DOMAINS[i];
    flyTo(d.lat, d.lng, 0.6, 1000);
  };

  const handleSurprise = () => {
    if (!pins.length || !globeRef.current) return;
    interactedRef.current = true;
    stopModes();
    const randomPin = pins[Math.floor(Math.random() * pins.length)];
    flyTo(randomPin.lat, randomPin.lng, 0.3, 1500);
    setTimeout(() => onPinClick(randomPin), reducedMotion ? 100 : 800);
  };

  const toggleAutoPlay = () => {
    interactedRef.current = true;
    dismissCoach();
    setJourneyIndex(null);
    setJourneyArc(null);
    setCaption(null);
    setAutoPlay((v) => !v);
  };

  const toggleJourney = () => {
    interactedRef.current = true;
    dismissCoach();
    setAutoPlay(false);
    if (journeyIndex !== null) {
      setJourneyIndex(null);
      setJourneyArc(null);
      setCaption(null);
    } else if (journeyStops.length) {
      setJourneyIndex(0);
    }
  };

  const activeDomain = DOMAINS[activeDomainIndex];
  const activeBgOpacity = isDark ? 0.8 : 0.7;
  const controlsVisibility = isTouch
    ? "opacity-100"
    : "opacity-0 group-hover:opacity-100 focus-within:opacity-100";

  return (
    <div
      ref={rootRef}
      className={`flex flex-col gap-3 transition-all duration-500 ease-in-out ${
        isFullscreen
          ? "fixed inset-0 z-50 p-2 md:p-6 bg-stone-100/90 dark:bg-stone-900/90 backdrop-blur-md"
          : "w-full"
      }`}
    >
      <div
        ref={containerRef}
        className={`w-full ${
          isFullscreen ? "flex-1 min-h-0 shadow-2xl" : "h-[420px] md:h-[560px]"
        } bg-stone-100 dark:bg-stone-900 overflow-hidden cursor-grab active:cursor-grabbing relative group rounded-2xl border border-stone-200 dark:border-stone-800 transition-all duration-500 ${
          zoomedIn ? "globe-zoomed" : ""
        }`}
      >
        {/* Cross-fading per-domain backgrounds */}
        {DOMAINS.map((d, i) => (
          <div
            key={d.bg}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out pointer-events-none"
            style={{
              opacity: activeDomainIndex === i ? activeBgOpacity : 0,
              backgroundImage: `url(/images/globe/${d.bg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-stone-100/50 dark:bg-stone-900/60" />
          </div>
        ))}

        {isDark && <Starfield reducedMotion={reducedMotion} />}

        {dimensions.width > 0 && dimensions.height > 0 && (
          <Globe
            ref={globeRef}
            width={dimensions.width}
            height={dimensions.height}
            globeImageUrl={
              isDark
                ? "/images/globe/globe-texture-dark.jpg"
                : "/images/globe/globe-texture-light.jpg"
            }
            hexBinPointsData={hexData}
            hexBinPointWeight="weight"
            hexAltitude={(d) => d.sumWeight * 0.02}
            hexBinResolution={4}
            hexTopColor={(d) => {
              const intensity = Math.min(1, Math.max(0, (d.sumWeight - 0.2) / 4));
              const baseColor = isDark ? "#292524" : "#f5f5f4";
              return lerpColor(baseColor, activeDomain.color, intensity);
            }}
            hexSideColor={(d) => {
              const intensity = Math.min(1, Math.max(0, (d.sumWeight - 0.2) / 4));
              const baseColor = isDark ? "#1c1917" : "#e7e5e4";
              return lerpColor(baseColor, activeDomain.color, intensity * 0.8);
            }}
            hexTransitionDuration={reducedMotion ? 0 : 1500}
            ringsData={reducedMotion ? [] : DOMAINS}
            ringColor="color"
            ringMaxRadius={25}
            ringPropagationSpeed={2}
            ringRepeatPeriod={1500}
            arcsData={arcsData}
            arcColor="color"
            arcStroke="stroke"
            arcAltitudeAutoScale={0.35}
            arcDashLength={reducedMotion ? 1 : 0.45}
            arcDashGap={reducedMotion ? 0 : 0.3}
            arcDashAnimateTime={(d) => d.dashTime}
            backgroundColor="rgba(0,0,0,0)"
            atmosphereColor={activeDomain.color}
            atmosphereAltitude={isDark ? 0.18 : 0.15}
            htmlElementsData={pins}
            htmlLat="lat"
            htmlLng="lng"
            htmlElement={(d) => {
              const el = document.createElement("div");
              const icon = PIN_ICONS[d.type] || "location_on";
              const label = escapeHtml(d.label || "");
              const shortLabel = label.length > 18 ? `${label.substring(0, 18)}...` : label;
              el.className = "globe-pin flex flex-col items-center cursor-pointer";
              el.setAttribute("role", "button");
              el.tabIndex = 0;
              el.setAttribute("aria-label", `${d.label} — open details`);
              el.title = d.label;
              el.innerHTML = `
                <span class="material-symbols-outlined globe-pin-icon" style="color: ${d.color}; font-size: 20px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                  ${icon}
                </span>
                <span class="globe-pin-label text-[8px] font-label font-bold uppercase tracking-widest text-stone-800 dark:text-stone-200 bg-white/70 dark:bg-stone-900/70 px-1.5 py-0.5 rounded backdrop-blur-md shadow-sm whitespace-nowrap mt-1" style="border: 1px solid ${d.color}60">
                  ${shortLabel}
                </span>
              `;
              el.style.pointerEvents = "auto";
              el.onclick = (e) => {
                e.stopPropagation();
                onPinClick(d);
              };
              el.onkeydown = (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPinClick(d);
                }
              };
              return el;
            }}
          />
        )}

        {/* Active-domain info card (top left) */}
        <div className="absolute top-4 left-4 z-20">
          <DomainInfoCard domain={activeDomain} count={counts[activeDomain.key] || 0} />
        </div>

        {/* Exploration tracker (top right) */}
        <div className="absolute top-4 right-4 z-20">
          <ExplorationTracker domains={DOMAINS} visitedKeys={visitedKeys} />
        </div>

        {/* Experience controls (bottom left) */}
        <div
          className={`absolute bottom-4 left-4 flex flex-col gap-2 ${controlsVisibility} transition-opacity duration-300 z-20`}
        >
          {!reducedMotion && (
            <button
              type="button"
              onClick={toggleAutoPlay}
              className={`${controlBtnCls} ${autoPlay ? "ring-2 ring-secondary" : ""}`}
              title={autoPlay ? "Pause the world tour" : "Auto-tour all six worlds"}
              aria-pressed={autoPlay}
            >
              <span className="material-symbols-outlined text-[20px]">
                {autoPlay ? "pause" : "play_arrow"}
              </span>
            </button>
          )}

          {journeyStops.length > 1 && (
            <button
              type="button"
              onClick={toggleJourney}
              className={`${controlBtnCls} ${journeyIndex !== null ? "ring-2 ring-amber-400" : ""}`}
              title={
                journeyIndex !== null
                  ? "Stop the journey replay"
                  : "Replay my journey — rotating through all six worlds"
              }
              aria-pressed={journeyIndex !== null}
            >
              <span className="material-symbols-outlined text-[20px]">route</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSurprise}
            className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-pink-500 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
            title="Surprise me!"
          >
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
          </button>
        </div>

        {/* View controls (bottom right) */}
        <div
          className={`absolute bottom-4 right-4 flex flex-col gap-2 ${controlsVisibility} transition-opacity duration-300 z-20`}
        >
          <button
            type="button"
            onClick={() => setIsFullscreen((v) => !v)}
            className={controlBtnCls}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isFullscreen ? "fullscreen_exit" : "fullscreen"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectDomain(activeDomainIndex)}
            className={controlBtnCls}
            title="Reset view"
          >
            <span className="material-symbols-outlined text-[20px]">my_location</span>
          </button>
          <button
            type="button"
            onClick={() => handleZoom(1)}
            className={controlBtnCls}
            title="Zoom in"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
          <button
            type="button"
            onClick={() => handleZoom(-1)}
            className={controlBtnCls}
            title="Zoom out"
          >
            <span className="material-symbols-outlined text-[20px]">remove</span>
          </button>
        </div>

        {/* Journey / status caption (bottom center) */}
        {caption && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 max-w-[85%]">
            <div className="globe-pop-in flex items-center gap-2 px-4 py-2 rounded-full bg-stone-900/80 text-white backdrop-blur-md shadow-xl border border-white/10">
              <span
                className="material-symbols-outlined text-[16px]"
                style={{ color: caption.color || "#fbbf24" }}
                aria-hidden="true"
              >
                {caption.icon}
              </span>
              <span className="font-label text-[10px] uppercase tracking-widest font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                {caption.title}
              </span>
              {caption.meta && (
                <span className="font-label text-[9px] uppercase tracking-widest text-stone-400 whitespace-nowrap">
                  {caption.meta}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Completion toast (top center) */}
        {toast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
            <div className="globe-pop-in flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-white shadow-xl">
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                emoji_events
              </span>
              <span className="font-label text-[10px] uppercase tracking-widest font-bold whitespace-nowrap">
                {toast}
              </span>
            </div>
          </div>
        )}

        {showCoach && dimensions.width > 0 && <CoachMark />}
      </div>

      {/* Domain legend chips */}
      <DomainLegend
        domains={DOMAINS}
        counts={counts}
        activeIndex={activeDomainIndex}
        visitedKeys={visitedKeys}
        onSelect={handleSelectDomain}
      />
    </div>
  );
};

export default GlobeRenderer;
