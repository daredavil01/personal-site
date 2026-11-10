import React, {
  useEffect, useMemo, useRef, useState,
} from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Chip, prefersReducedMotion, useSeen, useWidth } from "../Arena/Arena";
import {
  MONTHS, courseKm, distanceName, formatDelta, formatDuration, formatPace,
} from "../../lib/raceLog";

// The start line: every race at one distance set off by the same gun. Each
// lane is a real finish, run here at its own even pace (a finish time is all
// a race row holds), fast-forwarded so the slowest takes about fourteen
// seconds. The clock is race time. As each one crosses, its photo joins the
// photo-finish strip in finishing order. It plays itself once, the first
// time it is on screen; after that the scrubber and Replay are the reader's.

const PLAY_SECONDS = 14;
const short = (title) => String(title || "")
  .replace(/\b(19|20)\d{2}\b/g, "")
  .replace(/\b(half|marathon|hm)\b/gi, "")
  .replace(/\s+/g, " ")
  .trim() || title;
const clock = (secs) => {
  const s = Math.max(0, Math.floor(secs));
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const StartLine = ({ races }) => {
  const options = useMemo(() => {
    const counts = new Map();
    races.forEach((r) => { if (r.secs && r.distKey != null) counts.set(r.distKey, (counts.get(r.distKey) || 0) + 1); });
    return [...counts].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).map(([key, n]) => ({ key, n }));
  }, [races]);
  const [picked, setPicked] = useState(null);
  const dist = options.some((o) => o.key === picked) ? picked : options[0]?.key;

  const lanes = useMemo(() => {
    const at = races.filter((r) => r.distKey === dist && r.secs);
    const order = [...at].sort((a, b) => a.secs - b.secs);
    return at.map((r) => ({ ...r, rank: order.indexOf(r) + 1 }));
  }, [races, dist]);
  const finishers = useMemo(() => [...lanes].sort((a, b) => a.secs - b.secs), [lanes]);
  const slowest = finishers.length ? finishers[finishers.length - 1].secs : 1;
  const fastest = finishers[0];

  const [wrapRef, width] = useWidth(0);
  const [seenRef, seen] = useSeen(0.35);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  const play = (from = 0) => {
    cancelAnimationFrame(raf.current);
    if (prefersReducedMotion()) { setT(slowest); setPlaying(false); return; }
    const t0 = performance.now() - (from / slowest) * PLAY_SECONDS * 1000;
    setPlaying(true);
    const tick = (now) => {
      const next = Math.min(slowest, ((now - t0) / (PLAY_SECONDS * 1000)) * slowest);
      setT(next);
      if (next < slowest) raf.current = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const stop = () => { cancelAnimationFrame(raf.current); setPlaying(false); };

  // The gun: once when first seen, and again whenever the distance changes.
  useEffect(() => {
    if (seen && slowest > 1) play(0);
    return () => cancelAnimationFrame(raf.current);
  }, [seen, dist, slowest]); // `play` is rebuilt every render; these three are what should fire the gun

  if (!options.length || !lanes.length) return null;

  const narrow = width < 620;
  const laneH = narrow ? 22 : 27;
  const labelW = narrow ? 34 : 178;
  const timeW = narrow ? 58 : 86;
  const top = 26;
  const H = top + lanes.length * laneH + 8;
  const x0 = labelW + 8;
  const x1 = Math.max(x0 + 40, width - timeW - 10);
  const km = courseKm(dist);
  const ticks = [];
  for (let k = narrow ? 10 : 5; k < km - (narrow ? 6 : 2.5); k += narrow ? 10 : 5) ticks.push(k);
  const xOf = (share) => x0 + share * (x1 - x0);
  const done = finishers.filter((r) => t >= r.secs).length;
  const leader = finishers[0];
  const leaderKm = Math.min(km, (t / leader.secs) * km);

  return (
    <div ref={seenRef}>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 mb-5">
        <div className="min-w-0 flex flex-col gap-3">
          <p className="ar-kicker mb-0 ar-stage-ember">The start line</p>
          <h2 className="ar-h2">{`${lanes.length} ${distanceName(dist).toLowerCase()}s, one gun`}</h2>
          <p className="mb-0 text-sm leading-relaxed ar-stage-muted max-w-xl">
            {`Every ${distanceName(dist).toLowerCase()} I have finished, started together and run at its own average pace. Oldest at the top; the gold lane is the personal best.`}
          </p>
          {options.length > 1 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Distance">
              {options.map((o) => (
                <Chip key={o.key} active={o.key === dist} onClick={() => setPicked(o.key)}>{`${distanceName(o.key)} · ${o.n}`}</Chip>
              ))}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="ar-kicker mb-1 ar-stage-muted" style={{ fontSize: "0.6rem" }}>Race clock</p>
          <p className="ar-num mb-0 ar-stage-gold" style={{ fontSize: "clamp(2.8rem, 8cqw, 5rem)" }} aria-live="off">{clock(t)}</p>
          <p className="mb-0 mt-1 text-xs ar-stage-muted tabular-nums">
            {done === lanes.length ? `All ${lanes.length} home` : `${done} of ${lanes.length} home · leader at ${leaderKm.toFixed(1)} km`}
          </p>
        </div>
      </div>

      <div ref={wrapRef} className="w-full">
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label={`${lanes.length} ${distanceName(dist)} finishes replayed together. Fastest: ${fastest.title}, ${formatDuration(fastest.secs)}; slowest: ${formatDuration(slowest)}.`}>
            {ticks.map((k) => (
              <g key={k}>
                <line x1={xOf(k / km)} x2={xOf(k / km)} y1={top - 4} y2={H - 6} stroke="rgba(255,255,255,0.09)" />
                <text x={xOf(k / km)} y={12} textAnchor="middle" fontSize="10" fill="#98a2c3" style={{ letterSpacing: "0.1em" }}>{`${k} KM`}</text>
              </g>
            ))}
            {!narrow && <text x={x0} y={12} textAnchor="start" fontSize="10" fill="#98a2c3" style={{ letterSpacing: "0.1em" }}>START</text>}
            <text x={x1} y={12} textAnchor="end" fontSize="10" fill="#f4f1ea" fontWeight="700" style={{ letterSpacing: "0.1em" }}>{`${narrow ? "" : "FINISH · "}${Number(km.toFixed(1))} KM`}</text>
            <line x1={x0} x2={x0} y1={top - 4} y2={H - 6} stroke="rgba(255,255,255,0.35)" />
            {/* the chequered line */}
            {Array.from({ length: Math.ceil((H - 2 - top) / 5) }, (_, i) => (
              <rect key={i} x={x1 + (i % 2 ? 0 : 3)} y={top - 4 + i * 5} width="3" height="5" fill="#f4f1ea" opacity="0.85" />
            ))}
            {lanes.map((r, i) => {
              const y = top + i * laneH + laneH / 2;
              const share = Math.min(1, t / r.secs);
              const home = t >= r.secs;
              const best = r.isBest;
              const color = best ? "#ffc861" : "#ff6b3d";
              return (
                <g key={r.id}>
                  <line x1={x0} x2={x1} y1={y} y2={y} stroke="rgba(255,255,255,0.07)" />
                  <text x={labelW} y={y + 4} textAnchor="end" fontSize={narrow ? 10 : 11.5} fill={best ? "#ffc861" : "#c9cfe6"} fontWeight={best ? 700 : 500}>
                    {narrow ? `’${String(r.year).slice(2)}` : `${short(r.title)} ’${String(r.year).slice(2)}`}
                  </text>
                  <line x1={x0} x2={xOf(share)} y1={y} y2={y} stroke={color} strokeWidth={best ? 3 : 2} strokeLinecap="round" opacity={home ? 0.5 : 0.9} />
                  <circle cx={xOf(share)} cy={y} r={best ? 5.5 : 4.5} fill={color} />
                  {!home && playing && <circle cx={xOf(share)} cy={y} r="5" fill="none" stroke={color} className="ar-pulse" />}
                  {home && (
                    <text x={x1 + 12} y={y + 4.5} fontSize={narrow ? 11 : 13} fill={best ? "#ffc861" : "#f4f1ea"} fontWeight="700" className="ar-display" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatDuration(r.secs)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3">
        <button type="button" onClick={() => (playing ? stop() : play(t >= slowest ? 0 : t))} className="ar-chip" style={{ height: "2.25rem", color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}>
          <span className="material-symbols-outlined text-base ar-stage-ember" aria-hidden="true">{playing ? "pause" : t >= slowest ? "replay" : "play_arrow" /* eslint-disable-line no-nested-ternary */}</span>
          {playing ? "Pause" : t >= slowest ? "Fire the gun again" : "Play" /* eslint-disable-line no-nested-ternary */}
        </button>
        <label className="flex-1 min-w-[10rem] flex items-center gap-3" htmlFor="sl-scrub">
          <span className="sr-only">Race time</span>
          <input
            id="sl-scrub"
            type="range"
            min="0"
            max={slowest}
            step="1"
            value={Math.round(t)}
            onChange={(e) => { stop(); setT(Number(e.target.value)); }}
            aria-valuetext={clock(t)}
            className="w-full accent-[#ff6b3d]"
          />
        </label>
      </div>

      <div className="mt-6">
        <p className="ar-kicker mb-3 ar-stage-muted" style={{ fontSize: "0.6rem" }}>Photo finish · in the order they crossed</p>
        <ol className="flex gap-3 pl-0 mb-0 list-none ar-scroll-x pb-2">
          {finishers.map((r, i) => {
            const home = t >= r.secs;
            const photo = r.slideImages?.[0]?.url;
            return (
              <li
                key={r.id}
                className="shrink-0 w-[120px] md:w-[136px]"
                style={{
                  opacity: home ? 1 : 0.18, transform: home ? "none" : "translateY(10px) scale(0.96)", transition: "opacity 0.5s, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <Link to={`/sports/${r.id}`} className="group block no-underline" tabIndex={home ? 0 : -1} aria-label={`${i + 1}. ${r.title}, ${formatDuration(r.secs)}`}>
                  <span className="relative block aspect-[4/5] rounded-lg overflow-hidden bg-white/5 border border-white/10">
                    {photo
                      ? <img src={photo} alt="" loading="lazy" className="w-full h-full object-cover object-top ar-card-photo group-hover:scale-105" />
                      : <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-4xl text-white/20" aria-hidden="true">directions_run</span>}
                    <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" aria-hidden="true" />
                    <span className="absolute top-1.5 left-1.5 min-w-[1.5rem] h-6 px-1.5 rounded-full inline-flex items-center justify-center ar-display font-bold text-sm" style={{ background: i === 0 ? "#ffc861" : "rgba(8,12,26,0.8)", color: i === 0 ? "#1c1917" : "#fff" }}>{i + 1}</span>
                    <span className="absolute left-2 bottom-1.5 ar-num text-2xl text-white">{formatDuration(r.secs)}</span>
                  </span>
                  <span className="block mt-1.5 text-[11px] leading-snug text-white/90 truncate">{short(r.title)}</span>
                  <span className="block text-[10px] ar-stage-muted tabular-nums">
                    {`${MONTHS[r.month]?.slice(0, 3)} ${r.year} · ${i === 0 ? `${formatPace(r.pace)}/km` : formatDelta(r.secs - fastest.secs)}`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

StartLine.propTypes = { races: PropTypes.arrayOf(PropTypes.shape({})).isRequired };

export default StartLine;
