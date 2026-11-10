import React, {
  useEffect, useMemo, useRef, useState,
} from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import { formationOf, swarmOrder } from "../../lib/swarmLayouts";
import { sportFamily } from "../../lib/training";
import {
  formatDistance, formatDuration, formatEffortSpeed, sportLabel,
} from "../../lib/strava";
import { prefersReducedMotion, useWidth } from "../Arena/Arena";

// The swarm: every activity as one dot on a canvas, re-forming whenever the
// lens changes (src/lib/swarmLayouts.js decides where each dot goes; this
// only flies them there). The first formation rises from the horizon in the
// order the log was written. Hover names a dot, a click opens it; a tap pins
// the card so its link can be pressed. Filters dim, never remove, so a dot
// keeps its place. The same numbers are in the plates below as text — the
// canvas is the picture, not the only copy.

// Sport colours tuned for the dark stage (the paper set is in training.css).
export const STAGE_COLORS = {
  run: "#ff7a45", walk: "#2fd39a", hike: "#ffc23d", ride: "#4c9bff", swim: "#9d8cff", other: "#b9b3d6",
};

const TWEEN_MS = 1100;
const STAGGER_MS = 700;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);
const HIT = 16;

const Swarm = ({
  rows, lens, isActive, raceIds, height, label,
}) => {
  const [wrapRef, width] = useWidth(0);
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const order = useMemo(() => swarmOrder(rows), [rows]);
  const colors = useMemo(() => order.map((r) => STAGE_COLORS[sportFamily(r.sport)] || STAGE_COLORS.other), [order]);
  const [tip, setTip] = useState(null); // { i, x, y, pinned }
  const tipRef = useRef(null);
  tipRef.current = tip;

  // Everything the draw loop reads lives in refs, so a re-render never restarts it.
  const state = useRef({
    cur: null, from: null, to: null, marks: [], t0: 0, first: true, visible: true,
  });
  const activeRef = useRef(isActive);
  activeRef.current = isActive;
  const raceRef = useRef(raceIds);
  raceRef.current = raceIds;
  const drawRef = useRef(() => {});
  const rafRef = useRef(0);

  // A new formation (lens, data or size changed): tween from wherever the dots are.
  useEffect(() => {
    if (!width || !order.length) return;
    const s = state.current;
    const target = formationOf(lens, order, width, height);
    const n = order.length;
    const still = prefersReducedMotion();
    if (!s.cur || s.cur.x.length !== n) {
      // First light: the dots rise from the horizon.
      s.cur = { x: Float32Array.from(target.x), y: new Float32Array(n).fill(height + 30), r: Float32Array.from(target.r) };
      s.first = true;
    } else {
      s.first = false;
    }
    if (still) {
      s.cur = { x: Float32Array.from(target.x), y: Float32Array.from(target.y), r: Float32Array.from(target.r) };
    }
    s.from = { x: Float32Array.from(s.cur.x), y: Float32Array.from(s.cur.y), r: Float32Array.from(s.cur.r) };
    s.to = target;
    s.marks = target.marks;
    s.t0 = performance.now();
    setTip(null);
    drawRef.current(true);
  }, [lens, order, width, height]);

  // The draw loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width) return undefined;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    const still = prefersReducedMotion();

    const frame = (now) => {
      rafRef.current = 0;
      const s = state.current;
      if (!s.to || !s.cur) return;
      const n = order.length;
      const stagger = s.first ? STAGGER_MS * 1.6 : STAGGER_MS;
      const total = TWEEN_MS + stagger;
      const elapsed = still ? total : now - s.t0;
      const moving = elapsed < total;
      for (let i = 0; i < n; i += 1) {
        const t = Math.min(1, Math.max(0, (elapsed - (i / n) * stagger) / TWEEN_MS));
        const k = ease(t);
        s.cur.x[i] = s.from.x[i] + (s.to.x[i] - s.from.x[i]) * k;
        s.cur.y[i] = s.from.y[i] + (s.to.y[i] - s.from.y[i]) * k;
        s.cur.r[i] = s.from.r[i] + (s.to.r[i] - s.from.r[i]) * k;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Axis marks fade in with the formation.
      const markAlpha = Math.min(1, elapsed / 700);
      ctx.lineWidth = 1;
      s.marks.forEach((m) => {
        if (m.kind === "line") {
          ctx.strokeStyle = `rgba(255,255,255,${(m.faint ? 0.07 : 0.16) * markAlpha})`;
          ctx.beginPath();
          ctx.moveTo(m.x1, m.y1);
          ctx.lineTo(m.x2, m.y2);
          ctx.stroke();
        } else if (m.kind === "ring") {
          ctx.strokeStyle = `rgba(255,255,255,${0.1 * markAlpha})`;
          ctx.beginPath();
          ctx.arc(m.cx, m.cy, m.r, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.font = `${m.strong ? 600 : 500} ${m.strong ? 12 : 10.5}px "Plus Jakarta Sans", system-ui, sans-serif`;
          ctx.textAlign = m.align || "left";
          ctx.fillStyle = `rgba(${m.strong ? "226,230,245" : "152,162,195"},${markAlpha})`;
          ctx.fillText(m.text.toUpperCase(), m.x, m.y);
        }
      });

      // Dots: additive, so a crowded week glows.
      const active = activeRef.current;
      const races = raceRef.current;
      const hover = tipRef.current ? tipRef.current.i : -1;
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < n; i += 1) {
        const on = !active || active(order[i]);
        const twinkle = still || moving ? 1 : 0.9 + 0.1 * Math.sin(now / 900 + i * 1.7);
        ctx.globalAlpha = on ? 0.62 * twinkle : 0.08;
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.arc(s.cur.x[i], s.cur.y[i], Math.max(0.6, s.cur.r[i]), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      // Race days wear a gold ring; the newest session pulses.
      if (races && races.size) {
        ctx.strokeStyle = "rgba(255,200,97,0.95)";
        ctx.lineWidth = 1.4;
        for (let i = 0; i < n; i += 1) {
          if (!races.has(order[i].id) || (active && !active(order[i]))) continue; // eslint-disable-line no-continue
          ctx.beginPath();
          ctx.arc(s.cur.x[i], s.cur.y[i], s.cur.r[i] + 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      if (n && !moving) {
        const i = n - 1;
        const beat = still ? 0.5 : (now % 1800) / 1800;
        ctx.strokeStyle = `rgba(255,255,255,${0.75 * (1 - beat)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(s.cur.x[i], s.cur.y[i], s.cur.r[i] + 2 + beat * 12, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (hover >= 0 && hover < n) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.cur.x[hover], s.cur.y[hover], s.cur.r[hover] + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      if ((moving || !still) && s.visible) rafRef.current = requestAnimationFrame(frame);
    };

    drawRef.current = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(frame);
    };
    drawRef.current();

    // Idle twinkle only while the canvas is on screen.
    let io;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(([e]) => {
        state.current.visible = e.isIntersecting;
        if (e.isIntersecting) drawRef.current();
      });
      io.observe(canvas);
    }
    const fonts = document.fonts && document.fonts.ready;
    if (fonts) fonts.then(() => drawRef.current());
    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      if (io) io.disconnect();
    };
  }, [width, height, order, colors]);

  // A filter or a hover changed: one more frame is enough.
  useEffect(() => { drawRef.current(); }, [isActive, raceIds, tip]);

  const nearest = (e) => {
    const s = state.current;
    if (!s.cur) return null;
    const box = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - box.left;
    const py = e.clientY - box.top;
    let best = -1;
    let bestD = HIT * HIT;
    const active = activeRef.current;
    for (let i = order.length - 1; i >= 0; i -= 1) {
      if (active && !active(order[i])) continue; // eslint-disable-line no-continue
      const dx = s.cur.x[i] - px;
      const dy = s.cur.y[i] - py;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    }
    return best < 0 ? null : { i: best, x: s.cur.x[best], y: s.cur.y[best] };
  };

  const onMove = (e) => {
    if (e.pointerType !== "mouse" || (tipRef.current && tipRef.current.pinned)) return;
    const hit = nearest(e);
    if ((hit ? hit.i : -1) !== (tipRef.current ? tipRef.current.i : -1)) setTip(hit);
  };
  const onLeave = () => { if (!tipRef.current?.pinned) setTip(null); };
  const onClick = (e) => {
    const hit = nearest(e);
    if (!hit) { setTip(null); return; }
    if (e.nativeEvent.pointerType === "mouse") navigate(`/training/${order[hit.i].id}`);
    else setTip({ ...hit, pinned: true });
  };

  const hot = tip ? order[tip.i] : null;
  const flip = tip && tip.x > width * 0.6;
  const below = tip && tip.y < 110;

  return (
    <div ref={wrapRef} className="relative w-full select-none" style={{ height }}>
      <canvas
        ref={canvasRef}
        aria-label={label}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: tip ? "pointer" : "crosshair", touchAction: "pan-y" }}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onClick={onClick}
      />
      {hot && (
        <div
          role="status"
          className={`absolute z-10 w-56 rounded-xl border border-white/15 bg-[#0b1024]/95 backdrop-blur px-3.5 py-3 shadow-2xl ${tip.pinned ? "" : "pointer-events-none"}`}
          style={{
            left: tip.x,
            top: tip.y,
            transform: `translate(${flip ? "calc(-100% - 14px)" : "14px"}, ${below ? "14px" : "calc(-100% - 14px)"})`,
          }}
        >
          <p className="ar-kicker mb-1 flex items-center gap-1.5" style={{ fontSize: "0.58rem", color: "#98a2c3" }}>
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: colors[tip.i] }} aria-hidden="true" />
            {`${sportLabel(hot.sport)} · ${new Date(`${hot.date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`}
          </p>
          <p className="mb-1.5 text-sm font-semibold leading-snug text-white">{hot.name}</p>
          <p className="ar-display mb-0 text-xl font-semibold text-white leading-none">
            {[formatDistance(hot.distance), formatDuration(hot.movingTime)].filter(Boolean).join("  ·  ")}
          </p>
          <p className="mb-0 mt-1.5 text-[11px] text-[#98a2c3]">
            {[
              hot.startLocal ? `${hot.startLocal.slice(11, 16)} start` : null,
              Number(hot.distance) > 0 ? formatEffortSpeed(hot.sport, hot.averageSpeed) : null,
              hot.averageHeartrate ? `${Math.round(hot.averageHeartrate)} bpm` : null,
            ].filter(Boolean).join(" · ")}
          </p>
          {raceIds && raceIds.has(hot.id) && <p className="mb-0 mt-1.5 text-[11px] font-semibold text-[#ffc861]">Race day</p>}
          {tip.pinned && (
            <Link to={`/training/${hot.id}`} className="mt-2.5 inline-flex items-center gap-1 ar-kicker no-underline text-[#ff6b3d]" style={{ fontSize: "0.62rem" }}>
              Open this session
              <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_forward</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

Swarm.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  lens: PropTypes.string.isRequired,
  /** row → false dims its dot. Null shows everything. */
  isActive: PropTypes.func,
  /** ids of activities that were a /sports race. */
  raceIds: PropTypes.instanceOf(Set),
  height: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
};
Swarm.defaultProps = { isActive: null, raceIds: null };

export default Swarm;
