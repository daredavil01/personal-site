import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { decodePolyline, formatDistance, haversine } from "../../../lib/strava";
import { sportFamily } from "../../../lib/training";
import {
  Legend, Tip, famColor, pointIn, prefersReducedMotion, useInView,
} from "../shared";

// Light painting: every public route drawn onto one dark map, oldest first,
// as if each run left a trail of light. It plays itself the first time it is
// on screen; then the scrubber, play/pause and speed are the reader's. Hover a
// trail to name it, click to open it. Routes are the public, end-trimmed
// polylines — no tiles, no doorsteps.

const W = 1000;
const SECONDS = 16; // a full replay at 1×

const HOME_METRES = 15000;
const median = (arr) => {
  const a = [...arr].sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : 0;
};

/**
 * Routes → SVG paths. `home` frames the home ground: the routes whose middle
 * is within 15 km of the median route's, so a few hikes to distant forts do
 * not shrink every street run to a speck (they run off the edge instead).
 * Falls back to everything when the home ground is not most of the log.
 */
function project(routes, home) {
  const decoded = routes.map((r) => decodePolyline(r.route));
  const centres = decoded.map((pts) => {
    const mid = pts[Math.floor(pts.length / 2)] || [0, 0];
    return mid;
  });
  const centre = [median(centres.map((c) => c[0])), median(centres.map((c) => c[1]))];
  const isHome = centres.map((c) => haversine(c, centre) <= HOME_METRES);
  const homeCount = isHome.filter(Boolean).length;
  const zoomable = homeCount >= routes.length * 0.4 && homeCount < routes.length;
  const framed = home && zoomable ? decoded.filter((_, i) => isHome[i]) : decoded;
  // Frame the bulk of what is framed: the 1st–99th percentile of its points,
  // padded, so a single long ride does not set the scale either.
  const lats = [];
  const lngs = [];
  framed.forEach((pts) => pts.forEach(([la, ln], i) => {
    if (i % 3 === 0) { lats.push(la); lngs.push(ln); }
  }));
  lats.sort((a, b) => a - b);
  lngs.sort((a, b) => a - b);
  const q = (arr, f) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(f * (arr.length - 1))))];
  const padLat = (q(lats, 0.99) - q(lats, 0.01)) * 0.08;
  const padLng = (q(lngs, 0.99) - q(lngs, 0.01)) * 0.08;
  const minLat = q(lats, 0.01) - padLat;
  const maxLat = q(lats, 0.99) + padLat;
  const minLng = q(lngs, 0.01) - padLng;
  const maxLng = q(lngs, 0.99) + padLng;
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const spanX = (maxLng - minLng) * k || 1;
  const spanY = maxLat - minLat || 1;
  const H = Math.round(Math.min(0.85, Math.max(0.56, spanY / spanX)) * W);
  const pad = 0;
  const s = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY);
  const ox = (W - spanX * s) / 2;
  const oy = (H - spanY * s) / 2;
  const paths = decoded.map((pts) => pts.map(([la, ln], i) => `${i ? "L" : "M"}${(ox + (ln - minLng) * k * s).toFixed(1)} ${(oy + (maxLat - la) * s).toFixed(1)}`).join(""));
  return {
    paths, H, zoomable, away: routes.length - homeCount,
  };
}

const NightMap = ({ routes }) => {
  const navigate = useNavigate();
  const [ref, seen] = useInView(0.3);
  const boxRef = useRef(null);
  const list = useMemo(() => [...routes].sort((a, b) => (a.startDate < b.startDate ? -1 : 1)), [routes]);
  const [home, setHome] = useState(true);
  const {
    paths, H, zoomable, away,
  } = useMemo(() => project(list, home), [list, home]);
  const cumulative = useMemo(() => {
    let s = 0;
    return list.map((r) => { s += Number(r.distance) || 0; return s; });
  }, [list]);
  const families = useMemo(() => [...new Set(list.map((r) => sportFamily(r.sport)))], [list]);
  const N = list.length;

  const [shown, setShown] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [hover, setHover] = useState(null);
  const shownRef = useRef(0);
  shownRef.current = shown;

  // Reset when the set changes (the sport lens).
  useEffect(() => { setShown(prefersReducedMotion() ? N : 0); setPlaying(false); }, [N]);
  useEffect(() => {
    if (!seen) return;
    if (prefersReducedMotion()) setShown(N);
    else setPlaying(true);
  }, [seen, N]);

  useEffect(() => {
    if (!playing) return undefined;
    let raf = 0;
    let last = performance.now();
    let acc = shownRef.current >= N ? 0 : shownRef.current;
    const tick = (now) => {
      acc += ((now - last) / 1000) * (N / SECONDS) * speed;
      last = now;
      const next = Math.min(N, Math.floor(acc));
      setShown(next);
      if (next >= N) { setPlaying(false); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, N]);

  const toggle = useCallback(() => {
    if (!playing && shownRef.current >= N) setShown(0);
    setPlaying((p) => !p);
  }, [playing, N]);

  const current = shown > 0 ? list[shown - 1] : null;
  const yearMarks = useMemo(() => {
    const marks = [];
    list.forEach((r, i) => {
      const y = r.date?.slice(0, 4);
      const at = i / Math.max(1, N - 1);
      const prev = marks[marks.length - 1];
      // A year with a handful of routes would print on top of the next one.
      if (y && (!prev || (prev.y !== y && at - prev.at > 0.08))) marks.push({ y, at });
    });
    return marks;
  }, [list, N]);

  const hovered = hover ? list[hover.i] : null;

  if (!N) return null;

  return (
    <section ref={ref} className="tr-night px-4 py-8 md:px-10 md:py-10" aria-labelledby="tr-map-title">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <div>
          <p className="tr-kicker mb-2" style={{ color: "var(--tr-accent)" }}>Chapter one</p>
          <h2 id="tr-map-title" className="font-headline text-3xl md:text-5xl mb-1" style={{ color: "var(--tr-ink)" }}>Light painting</h2>
          <p className="text-sm mb-0 max-w-lg" style={{ color: "var(--tr-muted)" }}>
            Every route, one after another, as trails of light. The bright streets are the ones I keep coming back to.
          </p>
        </div>
        <div className="text-right" aria-live="off">
          <p className="font-headline text-3xl md:text-4xl leading-none mb-1 tabular-nums" style={{ color: "var(--tr-ink)" }}>
            {current ? new Date(`${current.date}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }) : "—"}
          </p>
          <p className="tr-kicker mb-0 tabular-nums" style={{ color: "var(--tr-muted)" }}>
            {`${shown.toLocaleString()} routes · ${Math.round((cumulative[shown - 1] || 0) / 1000).toLocaleString()} km`}
          </p>
        </div>
      </div>

      <div
        ref={boxRef}
        className="relative rounded-2xl overflow-hidden"
        style={{ background: "radial-gradient(80% 80% at 50% 50%, #111c33 0%, #070b14 100%)" }}
        onMouseLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" role="img" aria-label={`${N} routes drawn on one map`}>
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {paths.slice(0, shown).map((d, i) => (
              <path
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                d={d}
                pathLength="1"
                className="tr-draw"
                stroke={famColor(sportFamily(list[i].sport))}
                strokeWidth="1.5"
              />
            ))}
          </g>
          {!playing && (
            <g fill="none" stroke="transparent" strokeWidth="10" style={{ cursor: "pointer" }}>
              {paths.slice(0, shown).map((d, i) => (
                <path
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  d={d}
                  pointerEvents="stroke"
                  vectorEffect="non-scaling-stroke"
                  onMouseMove={(e) => setHover({ i, at: pointIn(boxRef.current, e) })}
                  onClick={() => navigate(`/training/${list[i].id}`)}
                />
              ))}
            </g>
          )}
          {hovered && (
            <path d={paths[hover.i]} fill="none" stroke="#fff" strokeWidth="3.5" pointerEvents="none" />
          )}
        </svg>
        <Tip at={hover?.at} dark>
          {hovered && (
            <>
              <strong className="block">{hovered.name}</strong>
              <span>{`${hovered.date} · ${formatDistance(hovered.distance)}`}</span>
              <span className="block opacity-70">Click to open</span>
            </>
          )}
        </Tip>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4">
        <button
          type="button"
          onClick={toggle}
          className="inline-flex items-center justify-center w-12 h-12 rounded-full text-white shadow-lg hover:scale-105 transition-transform"
          style={{ background: "var(--tr-accent)" }}
          aria-label={playing ? "Pause the replay" : "Play the replay"}
        >
          <span className="material-symbols-outlined text-3xl" aria-hidden="true">{playing ? "pause" : "play_arrow"}</span>
        </button>
        <div className="flex-1 min-w-[12rem] relative pt-4">
          <div className="absolute inset-x-0 top-0 h-4" aria-hidden="true">
            {yearMarks.map((m) => (
              <span key={m.y} className="absolute tr-kicker text-[10px]" style={{ left: `${m.at * 100}%`, color: "var(--tr-muted)" }}>{m.y}</span>
            ))}
          </div>
          <input
            type="range"
            min="0"
            max={N}
            value={shown}
            onChange={(e) => { setPlaying(false); setShown(Number(e.target.value)); }}
            className="w-full accent-[#ff7a59]"
            aria-label="Scrub through the routes"
          />
        </div>
        {zoomable && (
          <button
            type="button"
            onClick={() => setHome((h) => !h)}
            aria-pressed={!home}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full border tr-kicker"
            style={{ borderColor: "var(--tr-line)", color: "var(--tr-ink)" }}
            title={home ? `Zoom out to the ${away} routes further afield` : "Zoom in on the home ground"}
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">{home ? "zoom_out_map" : "zoom_in_map"}</span>
            {home ? "Everywhere" : "Home ground"}
          </button>
        )}
        <div className="inline-flex rounded-full border overflow-hidden" style={{ borderColor: "var(--tr-line)" }} role="group" aria-label="Replay speed">
          {[1, 3].map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={speed === s}
              onClick={() => setSpeed(s)}
              className="px-3 h-9 tr-kicker"
              style={{ background: speed === s ? "var(--tr-line)" : "transparent", color: "var(--tr-ink)" }}
            >
              {`${s}×`}
            </button>
          ))}
        </div>
      </div>
      <Legend families={families} className="mt-4" />
    </section>
  );
};

NightMap.propTypes = {
  routes: PropTypes.arrayOf(PropTypes.shape({ route: PropTypes.string })).isRequired,
};

export default NightMap;
