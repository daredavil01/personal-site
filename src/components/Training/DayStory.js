import React, {
  useEffect, useMemo, useRef, useState,
} from "react";
import PropTypes from "prop-types";
import StickFigure from "./StickFigure";
import { useInView, prefersReducedMotion } from "./shared";
import {
  fitBeats, positionAt, storyOf, STOP_SECONDS,
} from "../../lib/dayStory";
import { formatDistance, formatDuration, formatEffortSpeed } from "../../lib/strava";
import { sportFamily } from "../../lib/training";

// /training/:id — the activity as a walk along a line. The line is the
// terrain (each kilometre's climb or drop, summed from the start); figures
// stand where something happened — start, fastest km, a stop by a campfire,
// the biggest climb, the heart-rate peak, a flag at the finish — and, where
// there is room, plain figures whose stride is the pace (leaning = quicker
// than the day's usual, walking = slower). Hover reads any kilometre; Replay
// sends one figure along it in ten seconds with the real clock running.
// Activities without splits (strength, yoga, pool) get a session card.

const H = 300;
const PAD = {
  l: 56, r: 24, t: 78, b: 30,
};
const REPLAY_SECONDS = 10;
const FIGURE = 0.72; // figure scale: about 44 px tall

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(800);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setW(el.getBoundingClientRect().width || 800);
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width || 800));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Smooth the profile so it reads as ground, not a bar chart.
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

const replayPose = (family, tick, stopped) => {
  if (stopped) return "rest";
  if (family === "ride") return "ride";
  if (family === "swim") return "swim";
  if (family === "hike") return "hike";
  if (family === "walk") return "walk";
  return tick % 2 ? "runB" : "run";
};

const SESSION_POSES = {
  WeightTraining: "lift", Yoga: "yoga", Swim: "swim", Workout: "lift", Crossfit: "lift", Pilates: "yoga",
};

/** No splits: one big figure, the time on a dial, the heart in a bar. */
const SessionStory = ({ activity }) => {
  const family = sportFamily(activity.sport);
  const pose = SESSION_POSES[activity.sport]
    || ({
      run: "run", walk: "walk", hike: "hike", ride: "ride", swim: "swim",
    })[family] || "stand";
  const moving = activity.movingTime || 0;
  const elapsed = Math.max(activity.elapsedTime || 0, moving);
  const share = elapsed ? moving / elapsed : 0;
  const c = 2 * Math.PI * 70;
  return (
    <section className="tr-root rounded-2xl border border-stone-200 dark:border-stone-800 bg-gradient-to-b from-amber-50/70 to-white dark:from-stone-900 dark:to-stone-950 p-5 md:p-6" aria-label="The session">
      <p className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">The session</p>
      <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center">
        <svg viewBox="0 0 180 180" className="w-44 h-44 mx-auto" role="img" aria-label={`${formatDuration(moving)} moving of ${formatDuration(elapsed)}`}>
          <circle cx="90" cy="90" r="70" fill="none" stroke="var(--tr-line)" strokeWidth="10" />
          <circle cx="90" cy="90" r="70" fill="none" stroke="#e8a317" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - share)} transform="rotate(-90 90 90)" style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(.16,1,.3,1)" }} />
          <g className="text-stone-900 dark:text-stone-100">
            <StickFigure pose={pose} x={pose === "swim" ? 92 : 88} y={pose === "swim" ? 100 : 118} scale={1.05} />
          </g>
        </svg>
        <dl className="grid grid-cols-2 gap-4 mb-0">
          <div>
            <dt className="font-label text-[10px] uppercase tracking-widest text-stone-400">Moving</dt>
            <dd className="font-headline text-3xl mb-0 tabular-nums text-stone-900 dark:text-stone-100">{formatDuration(moving) || "—"}</dd>
            {elapsed > moving + 30 && <dd className="text-xs text-stone-500 mb-0">{`of ${formatDuration(elapsed)} — ${formatDuration(elapsed - moving)} between sets`}</dd>}
          </div>
          {activity.averageHeartrate && (
            <div>
              <dt className="font-label text-[10px] uppercase tracking-widest text-stone-400">Heart</dt>
              <dd className="font-headline text-3xl mb-1 tabular-nums text-stone-900 dark:text-stone-100">{`${Math.round(activity.averageHeartrate)} bpm`}</dd>
              {activity.maxHeartrate && (
                <dd className="mb-0">
                  <span className="block h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden" aria-hidden="true">
                    <span className="block h-full rounded-full bg-gradient-to-r from-amber-300 to-red-600" style={{ width: `${Math.min(100, (activity.averageHeartrate / activity.maxHeartrate) * 100)}%` }} />
                  </span>
                  <span className="text-xs text-stone-500">{`average, peaking at ${Math.round(activity.maxHeartrate)}`}</span>
                </dd>
              )}
            </div>
          )}
          {activity.calories > 0 && (
            <div>
              <dt className="font-label text-[10px] uppercase tracking-widest text-stone-400">Energy</dt>
              <dd className="font-headline text-3xl mb-0 tabular-nums text-stone-900 dark:text-stone-100">{`${Math.round(activity.calories)} kcal`}</dd>
            </div>
          )}
          {activity.distance > 0 && (
            <div>
              <dt className="font-label text-[10px] uppercase tracking-widest text-stone-400">Distance</dt>
              <dd className="font-headline text-3xl mb-0 tabular-nums text-stone-900 dark:text-stone-100">{formatDistance(activity.distance)}</dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
};
SessionStory.propTypes = { activity: PropTypes.shape({}).isRequired };

const DayStory = ({ activity }) => {
  const story = useMemo(() => storyOf(activity.splits, { sport: activity.sport, startLocal: activity.startLocal }), [activity]);
  const [box, W] = useWidth();
  const [viewRef, seen] = useInView(0.25);
  const [hover, setHover] = useState(null);
  const [replay, setReplay] = useState(null); // { t, tick }
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  if (!story) return <SessionStory activity={activity} />;

  const { points, beats } = story;
  const last = points[points.length - 1];
  const totalKm = last.km || 1;
  const span = Math.max(30, story.range.hi - story.range.lo);
  const mid = (story.range.hi + story.range.lo) / 2;
  const lo = mid - span / 2;
  const x = (km) => PAD.l + (km / totalKm) * (W - PAD.l - PAD.r);
  const y = (e) => H - PAD.b - ((e - lo) / span) * (H - PAD.t - PAD.b - 10);
  const xy = points.map((p) => [x(p.km), y(p.elev)]);
  const line = smooth(xy);
  const area = `${line}L${xy[xy.length - 1][0]} ${H - PAD.b}L${xy[0][0]} ${H - PAD.b}Z`;
  const kept = fitBeats(beats, (i) => xy[i][0], W < 500 ? 54 : 74);
  const pace = (mps) => formatEffortSpeed(activity.sport, mps);

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

  const startReplay = () => {
    cancelAnimationFrame(raf.current);
    const total = last.at;
    if (prefersReducedMotion() || !total) { setReplay(null); return; }
    const t0 = performance.now();
    const tick = (now) => {
      const t = ((now - t0) / 1000) * (total / REPLAY_SECONDS);
      if (t >= total) { setReplay(null); return; }
      setReplay({ t, tick: Math.floor((now - t0) / 140) });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  let runner = null;
  if (replay) {
    const pos = positionAt(points, replay.t);
    const k = Math.min(points.length - 2, Math.floor(pos.p));
    const f = pos.p - k;
    const px = xy[k][0] + (xy[k + 1][0] - xy[k][0]) * f;
    const py = xy[k][1] + (xy[k + 1][1] - xy[k][1]) * f;
    runner = { x: px, y: py, pose: replayPose(story.family, replay.tick, pos.stopped) };
  }

  const onMove = (e) => {
    const r = box.current.getBoundingClientRect();
    const px = e.clientX - r.left;
    let best = 1;
    for (let i = 1; i < xy.length; i += 1) if (Math.abs(xy[i][0] - px) < Math.abs(xy[best][0] - px)) best = i;
    setHover(best);
  };
  const hp = hover != null ? points[hover] : null;

  const hrLo = story.hr?.lo || 0;
  const hrSpan = Math.max(1, (story.hr?.hi || 0) - hrLo);
  const kmStep = [1, 2, 5, 10, 20].find((s) => totalKm / s <= (W < 500 ? 5 : 10)) || 50;
  const ticks = [];
  for (let k = 0; k <= totalKm + 0.001; k += kmStep) ticks.push(k);

  return (
    <section ref={viewRef} className="tr-root rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-4 md:p-6" aria-labelledby="tr-day-title">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
        <div>
          <p className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">The day, kilometre by kilometre</p>
          <h2 id="tr-day-title" className="font-headline text-2xl md:text-3xl text-stone-900 dark:text-stone-100 mb-0">
            {`${formatDistance(activity.distance)} on the ground`}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {replay && (
            <span className="font-mono text-2xl tabular-nums text-amber-600 dark:text-amber-400" aria-live="off">{formatDuration(replay.t)}</span>
          )}
          <button
            type="button"
            onClick={startReplay}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-900 font-label text-xs uppercase tracking-widest hover:scale-105 transition-transform"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">{replay ? "replay" : "play_arrow"}</span>
            {replay ? "Restart" : "Replay the day"}
          </button>
        </div>
      </div>

      <div ref={box} className="relative select-none" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg width={W} height={H + 34} className="block" role="img" aria-label={`Terrain over ${formatDistance(activity.distance)}, ${kept.filter((b) => b.label).map((b) => `${b.label} ${detailOf(b) || ""}`).join("; ")}`}>
          <defs>
            <linearGradient id="tr-day-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#f5b400" stopOpacity="0.28" />
              <stop offset="1" stopColor="#f5b400" stopOpacity="0.06" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((f) => {
            const e = lo + span * f;
            return (
              <g key={f}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(e)} y2={y(e)} stroke="var(--tr-grid)" />
                <text x={PAD.l - 8} y={y(e) + 4} textAnchor="end" fontSize="11" fill="var(--tr-muted)">{signed(e)}</text>
              </g>
            );
          })}
          {ticks.map((k) => (
            <text key={k} x={x(k)} y={H - PAD.b + 16} textAnchor="middle" fontSize="11" fill="var(--tr-muted)">{k === 0 ? "0 km" : `${k}`}</text>
          ))}
          <path d={area} fill="url(#tr-day-fill)" style={{ opacity: seen ? 1 : 0, transition: "opacity 1s .4s" }} />
          <path
            d={line}
            fill="none"
            stroke="#f5b400"
            strokeWidth="3.5"
            strokeLinecap="round"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={seen ? 0 : 1}
            style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(.16,1,.3,1)" }}
          />

          {/* Heart-rate ribbon: one band per kilometre, darker = harder. */}
          {story.hr && points.slice(1).map((p, k) => (p.hr ? (
            <rect
              key={p.i}
              x={xy[k][0]}
              y={H + 8}
              width={Math.max(1, xy[k + 1][0] - xy[k][0] - 1)}
              height="12"
              rx="2"
              fill="#dc2626"
              fillOpacity={0.12 + 0.88 * ((p.hr - hrLo) / hrSpan)}
            />
          ) : null))}
          {story.hr && (
            <text x={PAD.l - 8} y={H + 18} textAnchor="end" fontSize="10" fill="var(--tr-muted)">♥</text>
          )}

          <g className="text-stone-900 dark:text-stone-100" style={{ opacity: replay ? 0.22 : 1, transition: "opacity .3s" }}>
            {seen && kept.map((b, n) => {
              const [bx, by] = xy[b.i];
              const detail = detailOf(b);
              // Labels near an edge hang inward so they are never cut off.
              let anchor = "middle";
              if (bx > W - 90) anchor = "end";
              else if (bx < PAD.l + 50) anchor = "start";
              const lx = anchor === "end" ? Math.min(bx + 14, W - 4) : bx - (anchor === "start" ? 10 : 0);
              return (
                <g key={`${b.kind}${b.i}`} className="tr-pop" style={{ animationDelay: `${400 + n * 120}ms` }}>
                  <StickFigure pose={b.pose} x={bx} y={by - 2} scale={FIGURE} />
                  {b.label && (
                    <g>
                      <text x={lx} y={by - 56} textAnchor={anchor} fontSize="11" fontWeight="700" fill="currentColor" stroke="var(--tr-surface)" strokeWidth="4" paintOrder="stroke">{b.label}</text>
                      {detail && <text x={lx} y={by - 43} textAnchor={anchor} fontSize="11" fill="var(--tr-muted)" stroke="var(--tr-surface)" strokeWidth="4" paintOrder="stroke">{detail}</text>}
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {runner && (
            <g className="text-stone-900 dark:text-white">
              <StickFigure pose={runner.pose} x={runner.x} y={runner.y - 2} scale={0.85} />
            </g>
          )}

          {hp && (
            <g pointerEvents="none">
              <line x1={xy[hover][0]} x2={xy[hover][0]} y1={PAD.t - 20} y2={H + 20} stroke="var(--tr-muted)" strokeDasharray="3 4" />
              <circle cx={xy[hover][0]} cy={xy[hover][1]} r="5" fill="#f5b400" stroke="var(--tr-surface)" strokeWidth="2" />
            </g>
          )}
        </svg>
        {hp && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 px-3 py-2 rounded-lg shadow-xl text-xs leading-snug whitespace-nowrap bg-white text-stone-800 border border-stone-200 dark:bg-stone-900 dark:text-stone-100 dark:border-stone-700"
            style={{
              left: xy[hover][0], top: Math.max(0, xy[hover][1] - 120), transform: `translateX(${xy[hover][0] > W * 0.66 ? "calc(-100% - 12px)" : "12px"})`,
            }}
          >
            <strong className="block">{`Km ${hp.split.split}${hp.split.distance < 950 ? ` (${Math.round(hp.split.distance)} m)` : ""}`}</strong>
            <span className="block tabular-nums">{pace(hp.speed)}</span>
            {hp.hr && <span className="block tabular-nums">{`♥ ${Math.round(hp.hr)} bpm`}</span>}
            {hp.split.elevation_difference != null && <span className="block tabular-nums">{signed(hp.split.elevation_difference)}</span>}
            {hp.stopped >= STOP_SECONDS && <span className="block">{`stopped ${formatDuration(hp.stopped)}`}</span>}
            <span className="block text-stone-400 tabular-nums">{`at ${formatDuration(hp.at)}`}</span>
          </div>
        )}
      </div>

      <p className="mt-2 mb-0 font-label text-[10px] uppercase tracking-widest text-stone-400 leading-relaxed">
        Line: climb and drop from the start · a leaning stride is quicker than the day&apos;s usual, a walk slower · a campfire is a stop
        {story.hr ? ` · red ribbon: heart rate, ${Math.round(story.hr.lo)}–${Math.round(story.hr.hi)} bpm` : ""}
      </p>
    </section>
  );
};

DayStory.propTypes = {
  activity: PropTypes.shape({
    splits: PropTypes.arrayOf(PropTypes.shape({})),
    sport: PropTypes.string,
    startLocal: PropTypes.string,
    distance: PropTypes.number,
    movingTime: PropTypes.number,
  }).isRequired,
};

export default DayStory;
