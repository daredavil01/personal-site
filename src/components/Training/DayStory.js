import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import PropTypes from "prop-types";
import StickFigure from "./StickFigure";
import SessionStory from "./SessionStory";
import { projectRoutePoints } from "./RouteShape";
import { useInView, prefersReducedMotion } from "./shared";
import {
  GROUP, STOP_SECONDS, pickSlots, storyOf, terrainOf, tipAt,
} from "../../lib/dayStory";
import { formatDistance, formatDuration, formatEffortSpeed } from "../../lib/strava";

// One activity as a walk along a line. The line is the ground (the file's
// altitude stream when it has one, else each kilometre's climb summed) and
// it draws itself in step with the activity's own clock, nine seconds for
// the whole day. A group of ten sets out at the start and walks at the
// drawing tip; wherever something happened — the fastest kilometre, the
// longest stop (by a campfire), the biggest climb, the heart-rate peak — one
// of them stays behind, and the rest spread out along the way, so when the
// line reaches the end all ten stand distributed along it and the last one
// plants the flag. The route map beside it walks the same figure along the
// (end-trimmed) route. Hover reads any kilometre; Replay runs it again.
// Activities without splits (strength, yoga, pool) get a session card.

const H = 300;
const PAD = {
  l: 56, r: 24, t: 78, b: 30,
};
const PLAY_SECONDS = 9;
const TRIM_KM = 0.4; // the public route starts and ends 400 m in

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(760);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setW(el.getBoundingClientRect().width || 760);
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width || 760));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function smooth(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

const signed = (m) => `${m > 0 ? "+" : m < 0 ? "−" : "±"}${Math.abs(Math.round(m))} m`; // eslint-disable-line no-nested-ternary

/** The walking pose for a family, alternating legs on `phase`. */
const movingPose = (family, phase) => {
  if (family === "ride") return "ride";
  if (family === "swim") return "swim";
  if (family === "hike") return phase % 2 ? "walkB" : "hike";
  if (family === "walk") return phase % 2 ? "walkB" : "walk";
  return phase % 2 ? "runB" : "run";
};

/** The route map, walked by the lead figure; settled moments drop a pin. */
const RouteWalk = ({
  route, fraction, pose, pins, label,
}) => {
  const pts = useMemo(() => projectRoutePoints(route, 100, 8), [route]);
  const cum = useMemo(() => {
    if (!pts) return [];
    let s = 0;
    return pts.map((p, k) => {
      if (k) s += Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]);
      return s;
    });
  }, [pts]);
  if (!pts) return null;
  const total = cum[cum.length - 1] || 1;
  const at = (f) => {
    const target = Math.max(0, Math.min(1, f)) * total;
    let k = 1;
    while (k < cum.length - 1 && cum[k] < target) k += 1;
    const g = (target - cum[k - 1]) / ((cum[k] - cum[k - 1]) || 1);
    return [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * g, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * g, k];
  };
  const head = fraction == null ? null : at(fraction);
  const walked = head ? [...pts.slice(0, head[2]), [head[0], head[1]]] : [];
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" role="img" aria-label={label}>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--tr-line)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {walked.length > 1 && (
        <polyline points={walked.map((p) => p.join(",")).join(" ")} fill="none" stroke="#f5b400" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      )}
      {pins.map((pin) => {
        const [px, py] = at(pin.fraction);
        return <circle key={pin.key} cx={px} cy={py} r="2" fill={pin.color} stroke="var(--tr-surface)" strokeWidth="0.8" className="tr-pop" />;
      })}
      {head && fraction > 0 && fraction < 1 && (
        <g className="text-stone-900 dark:text-stone-100">
          <StickFigure pose={pose} x={head[0]} y={head[1]} scale={0.17} flicker={false} />
        </g>
      )}
    </svg>
  );
};
RouteWalk.propTypes = {
  route: PropTypes.string.isRequired,
  fraction: PropTypes.number,
  pose: PropTypes.string.isRequired,
  pins: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string, fraction: PropTypes.number, color: PropTypes.string })).isRequired,
  label: PropTypes.string.isRequired,
};
RouteWalk.defaultProps = { fraction: null };

const PIN_COLORS = {
  fastest: "#2a78d6", stop: "#f97316", climb: "#1baf7a", heart: "#dc2626",
};

const DayStory = ({ activity, title }) => {
  const story = useMemo(() => storyOf(activity.splits, { sport: activity.sport, startLocal: activity.startLocal }), [activity]);
  const [outer, OW] = useWidth();
  const box = useRef(null);
  const [viewRef, seen] = useInView(0.3);
  // Activity seconds at the drawing tip; null = finished. It starts at 0 —
  // the ten bunched at the start — unless motion is reduced.
  const [t, setT] = useState(() => (prefersReducedMotion() ? null : 0));
  const [tick, setTick] = useState(0);
  const [hover, setHover] = useState(null);
  const raf = useRef(0);
  const total = story ? story.points[story.points.length - 1].at : 0;

  const play = useCallback(() => {
    cancelAnimationFrame(raf.current);
    if (!total || prefersReducedMotion()) { setT(null); return; }
    const t0 = performance.now();
    const step = (now) => {
      const sec = Math.max(0, (now - t0) / 1000);
      const at = sec * (total / PLAY_SECONDS);
      if (at >= total) { setT(null); return; }
      setT(at);
      setTick(Math.floor(sec / 0.16));
      raf.current = requestAnimationFrame(step);
    };
    setT(0);
    raf.current = requestAnimationFrame(step);
  }, [total]);

  // The line and the group set out the first time the card is on screen.
  const started = useRef(false);
  useEffect(() => {
    if (seen && story && !started.current) {
      started.current = true;
      play();
    }
  }, [seen, story, play]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  if (!story) return <SessionStory activity={activity} />;

  const { points } = story;
  const totalKm = points[points.length - 1].km || 1;
  const terrain = terrainOf(points, activity.profile);
  const elevs = terrain.line.map((q) => q.elev);
  const span = Math.max(30, Math.max(...elevs) - Math.min(...elevs));
  const lo = (Math.max(...elevs) + Math.min(...elevs)) / 2 - span / 2;
  const hasMap = !!activity.route;
  // The map sits beside the line only when the line keeps 600 px; else below.
  const beside = hasMap && OW >= 840;
  const chartW = beside ? OW - 220 - 16 : OW;
  const x = (km) => PAD.l + (km / totalKm) * (chartW - PAD.l - PAD.r);
  const y = (e) => H - PAD.b - ((e - lo) / span) * (H - PAD.t - PAD.b - 10);
  const line = smooth(terrain.line.map((q) => [x(q.km), y(q.elev)]));
  const area = `${line}L${x(totalKm)} ${H - PAD.b}L${x(0)} ${H - PAD.b}Z`;
  const small = chartW < 520;
  const figScale = small ? 0.56 : 0.72;
  const slots = pickSlots(story.beats, (i) => x(points[i].km), { count: GROUP, gap: small ? 44 : 64 });
  const pace = (mps) => formatEffortSpeed(activity.sport, mps);

  const running = t != null;
  const tip = running ? tipAt(points, t) : { km: totalKm, stopped: false };
  const tipX = x(tip.km);
  // The start's figure stays at the start as the others set off.
  const settled = slots.filter((s) => points[s.i].km <= tip.km + 1e-9);
  const walking = slots.length - settled.length;
  const kmPerPx = totalKm / (chartW - PAD.l - PAD.r);

  const detailOf = (b) => {
    switch (b.kind) {
      case "start": return b.detail;
      case "finish": return [formatDistance(activity.distance), formatDuration(activity.movingTime)].filter(Boolean).join(" · ");
      case "stop": return formatDuration(b.detail);
      case "fastest": return pace(b.detail);
      case "climb": return signed(b.detail);
      case "heart": return `${b.detail} bpm`;
      default: return null;
    }
  };

  const onMove = (e) => {
    const r = box.current.getBoundingClientRect();
    const px = e.clientX - r.left;
    let best = 1;
    for (let i = 1; i < points.length; i += 1) if (Math.abs(x(points[i].km) - px) < Math.abs(x(points[best].km) - px)) best = i;
    setHover(best);
  };
  const hp = hover != null ? points[hover] : null;
  const hrLo = story.hr?.lo || 0;
  const hrSpan = Math.max(1, (story.hr?.hi || 0) - hrLo);
  const kmStep = [1, 2, 5, 10, 20].find((s) => totalKm / s <= (small ? 5 : 10)) || 50;
  const ticks = [];
  for (let k = 0; k <= totalKm + 0.001; k += kmStep) ticks.push(k);

  const routeFraction = (km) => (km - TRIM_KM) / Math.max(0.1, totalKm - 2 * TRIM_KM);
  const leadPose = tip.stopped ? "rest" : movingPose(story.family, tick);
  const clip = `tr-day-clip-${activity.id}`;

  return (
    <section ref={viewRef} className="tr-root rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-4 md:p-6" aria-labelledby={`tr-day-title-${activity.id}`}>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
        <div>
          <p className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">The day, kilometre by kilometre</p>
          <h2 id={`tr-day-title-${activity.id}`} className="font-headline text-2xl md:text-3xl text-stone-900 dark:text-stone-100 mb-0">
            {title || `${formatDistance(activity.distance)} on the ground`}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-2xl tabular-nums text-amber-600 dark:text-amber-400" aria-live="off">
            {formatDuration(running ? t : total)}
          </span>
          <button
            type="button"
            onClick={play}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-900 font-label text-xs uppercase tracking-widest hover:scale-105 transition-transform"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">replay</span>
            {running ? "Restart" : "Replay the day"}
          </button>
        </div>
      </div>

      <div ref={outer} className={`grid gap-4 ${beside ? "grid-cols-[1fr_220px]" : ""}`}>
        <div ref={box} className="relative select-none min-w-0" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <svg width={chartW} height={H + 34} className="block" role="img" aria-label={`Terrain over ${formatDistance(activity.distance)}; ${slots.filter((b) => b.label).map((b) => `${b.label} ${detailOf(b) || ""}`).join("; ")}`}>
            <defs>
              <linearGradient id={`${clip}-fill`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#f5b400" stopOpacity="0.3" />
                <stop offset="1" stopColor="#f5b400" stopOpacity="0.05" />
              </linearGradient>
              <clipPath id={clip}>
                <rect x="0" y="0" width={tipX + 1} height={H + 40} />
              </clipPath>
            </defs>
            {[0, 0.5, 1].map((f) => {
              const e = lo + span * f;
              return (
                <g key={f}>
                  <line x1={PAD.l} x2={chartW - PAD.r} y1={y(e)} y2={y(e)} stroke="var(--tr-grid)" />
                  <text x={PAD.l - 8} y={y(e) + 4} textAnchor="end" fontSize="11" fill="var(--tr-muted)">{signed(e)}</text>
                </g>
              );
            })}
            {ticks.map((k) => (
              <text key={k} x={x(k)} y={H - PAD.b + 16} textAnchor="middle" fontSize="11" fill="var(--tr-muted)">{k === 0 ? "0 km" : `${k}`}</text>
            ))}
            <g clipPath={`url(#${clip})`}>
              <path d={area} fill={`url(#${clip}-fill)`} />
              <path d={line} fill="none" stroke="#f5b400" strokeWidth="3.5" strokeLinecap="round" />
              {story.hr && points.slice(1).map((p, k) => (p.hr ? (
                <rect key={p.i} x={x(points[k].km)} y={H + 8} width={Math.max(1, x(p.km) - x(points[k].km) - 1)} height="12" rx="2" fill="#dc2626" fillOpacity={0.12 + 0.88 * ((p.hr - hrLo) / hrSpan)} />
              ) : null))}
            </g>
            {story.hr && <text x={PAD.l - 8} y={H + 18} textAnchor="end" fontSize="10" fill="var(--tr-muted)">♥</text>}

            {/* The ones who stayed. */}
            <g className="text-stone-900 dark:text-stone-100">
              {settled.map((b) => {
                const { km } = points[b.i];
                const bx = x(km);
                const by = y(terrain.elevAt(km));
                const detail = detailOf(b);
                let anchor = "middle";
                if (bx > chartW - 90) anchor = "end";
                else if (bx < PAD.l + 50) anchor = "start";
                const lx = anchor === "end" ? Math.min(bx + 14, chartW - 4) : bx - (anchor === "start" ? 2 : 0);
                return (
                  <g key={`${b.kind}${b.i}`} className="tr-pop">
                    <StickFigure pose={b.pose} x={bx} y={by - 2} scale={figScale} />
                    {b.label && (
                      <g>
                        <text x={lx} y={by - 70 * figScale - 6} textAnchor={anchor} fontSize="11" fontWeight="700" fill="currentColor" stroke="var(--tr-surface)" strokeWidth="4" paintOrder="stroke">{b.label}</text>
                        {detail && <text x={lx} y={by - 70 * figScale + 7} textAnchor={anchor} fontSize="11" fill="var(--tr-muted)" stroke="var(--tr-surface)" strokeWidth="4" paintOrder="stroke">{detail}</text>}
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            {/* The ones still walking, bunched at the tip, the leader in front. */}
            {running && walking > 0 && (
              <g className="text-stone-900 dark:text-stone-100">
                {Array.from({ length: walking }, (_, j) => {
                  const km = Math.max(0, tip.km - j * 13 * kmPerPx);
                  const pose = tip.stopped ? (j === 0 ? "rest" : "stand") : movingPose(story.family, tick + j); // eslint-disable-line no-nested-ternary
                  return (
                    <g key={j} style={{ opacity: 1 - j * 0.06 }}>
                      <StickFigure pose={pose} x={x(km) - (tip.stopped && j > 0 ? 18 : 0)} y={y(terrain.elevAt(km)) - 2} scale={figScale * 0.92} />
                    </g>
                  );
                }).reverse()}
                <text x={tipX} y={y(terrain.elevAt(tip.km)) + 16} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--tr-muted)">{walking > 1 ? `${walking} walking` : ""}</text>
              </g>
            )}

            {hp && !running && (
              <g pointerEvents="none">
                <line x1={x(hp.km)} x2={x(hp.km)} y1={PAD.t - 20} y2={H + 20} stroke="var(--tr-muted)" strokeDasharray="3 4" />
                <circle cx={x(hp.km)} cy={y(terrain.elevAt(hp.km))} r="5" fill="#f5b400" stroke="var(--tr-surface)" strokeWidth="2" />
              </g>
            )}
          </svg>
          {hp && !running && (
            <div
              role="status"
              className="pointer-events-none absolute z-10 px-3 py-2 rounded-lg shadow-xl text-xs leading-snug whitespace-nowrap bg-white text-stone-800 border border-stone-200 dark:bg-stone-900 dark:text-stone-100 dark:border-stone-700"
              style={{
                left: x(hp.km), top: Math.max(0, y(terrain.elevAt(hp.km)) - 150), transform: `translateX(${x(hp.km) > chartW * 0.6 ? "calc(-100% - 12px)" : "12px"})`,
              }}
            >
              <strong className="block">{`Km ${hp.split.split}${hp.split.distance < 950 ? ` (${Math.round(hp.split.distance)} m)` : ""}`}</strong>
              <span className="block tabular-nums">{pace(hp.speed)}</span>
              {hp.hr && <span className="block tabular-nums">{`♥ ${Math.round(hp.hr)} bpm`}</span>}
              {hp.split.elevation_difference != null && <span className="block tabular-nums">{signed(hp.split.elevation_difference)}</span>}
              {hp.split.average_cadence && <span className="block tabular-nums">{`${Math.round(hp.split.average_cadence * (story.family === "run" ? 2 : 1))} ${story.family === "ride" ? "rpm" : "spm"}`}</span>}
              {hp.split.average_watts && <span className="block tabular-nums">{`${Math.round(hp.split.average_watts)} W`}</span>}
              {hp.split.average_step_length && <span className="block tabular-nums">{`${(hp.split.average_step_length / 1000).toFixed(2)} m stride`}</span>}
              {hp.stopped >= STOP_SECONDS && <span className="block">{`stopped ${formatDuration(hp.stopped)}`}</span>}
              <span className="block text-stone-400 tabular-nums">{`at ${formatDuration(hp.at)}`}</span>
            </div>
          )}
        </div>

        {hasMap && (
          <div className="flex flex-col gap-1">
            <div className="aspect-square w-full max-w-[260px] mx-auto rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-100 dark:border-stone-800 p-2">
              <RouteWalk
                route={activity.route}
                fraction={running ? routeFraction(tip.km) : 1}
                pose={leadPose}
                label={`Route of ${activity.name}, walked in step with the line`}
                pins={settled.filter((b) => PIN_COLORS[b.kind]).map((b) => ({ key: `${b.kind}${b.i}`, fraction: routeFraction(points[b.i].km), color: PIN_COLORS[b.kind] }))}
              />
            </div>
            <p className="font-label text-[9px] uppercase tracking-widest text-stone-400 text-center mb-0">The route · ends trimmed for privacy</p>
          </div>
        )}
      </div>

      <p className="mt-2 mb-0 font-label text-[10px] uppercase tracking-widest text-stone-400 leading-relaxed">
        {`Ten set out together; one stays at each moment, the rest spread along the way · line: climb and drop from the start · a leaning stride is quicker than the day's usual, a walk slower · a campfire is a stop${story.hr ? ` · red ribbon: heart rate, ${Math.round(story.hr.lo)}–${Math.round(story.hr.hi)} bpm` : ""}`}
      </p>
    </section>
  );
};

DayStory.propTypes = {
  activity: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    name: PropTypes.string,
    splits: PropTypes.arrayOf(PropTypes.shape({})),
    profile: PropTypes.shape({}),
    route: PropTypes.string,
    sport: PropTypes.string,
    startLocal: PropTypes.string,
    distance: PropTypes.number,
    movingTime: PropTypes.number,
  }).isRequired,
  title: PropTypes.string,
};
DayStory.defaultProps = { title: null };

export default DayStory;
