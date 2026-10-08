import React from "react";
import PropTypes from "prop-types";
import { COLLECTIONS, FEATURES, fmt, resolve } from "./features";

// Sheet A-01: the site drawn as a floor plan. Each feature is a room, its
// "floor area" is a live count, and clicking one redlines it and opens its
// specification. Coordinates are a 960×600 plan inside a margin that holds the
// column/row grid bubbles, the way a real general-arrangement drawing is set out.

const M = 56; // margin around the plan for grid bubbles and the entrance
const W = 960;
const H = 600;
const DOOR = 30;

const COLUMN_GRID = [0, 260, 520, 740, 960];
const ROW_GRID = [0, 190, 400, 600];

const activate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

// A door: a gap in the wall, the leaf standing open, and its swing arc. The
// hinge is at (x, y); `h` doors sit on a horizontal wall, `v` on a vertical one.
const Door = ({ x, y, dir, locked }) => {
  const gap = dir === "h"
    ? <rect x={x} y={y - 5} width={DOOR} height={10} className="bp-fill-paper" />
    : <rect x={x - 5} y={y} width={10} height={DOOR} className="bp-fill-paper" />;
  const leaf = dir === "h"
    ? <line x1={x} y1={y} x2={x} y2={y - DOOR} className="bp-stroke" strokeWidth="1.5" />
    : <line x1={x} y1={y} x2={x + DOOR} y2={y} className="bp-stroke" strokeWidth="1.5" />;
  const arc = dir === "h"
    ? `M${x + DOOR},${y} A${DOOR},${DOOR} 0 0 0 ${x},${y - DOOR}`
    : `M${x},${y + DOOR} A${DOOR},${DOOR} 0 0 0 ${x + DOOR},${y}`;
  // A padlock beside the staff-only door.
  const lx = dir === "h" ? x + DOOR + 10 : x + 10;
  const ly = dir === "h" ? y - 22 : y + DOOR + 8;
  return (
    <g>
      {gap}
      {leaf}
      <path d={arc} fill="none" className="bp-stroke-soft" strokeWidth="1" />
      {locked && (
        <g transform={`translate(${lx},${ly})`}>
          <path d="M3,7 V4 a4,4 0 0 1 8,0 V7" fill="none" className="bp-stroke-red" strokeWidth="1.6" />
          <rect x="0" y="7" width="14" height="10" rx="1.5" className="bp-fill-red" />
        </g>
      )}
    </g>
  );
};

// Furniture, drawn the way a plan draws it: outlines only, in the soft ink.
const Furniture = ({ kind, cx, cy }) => {
  const line = { fill: "none", className: "bp-stroke-soft", strokeWidth: 1.4 };
  switch (kind) {
    case "compass":
      return (
        <g transform={`translate(${cx},${cy})`}>
          <circle r="34" {...line} />
          <circle r="24" {...line} strokeDasharray="2 4" />
          <polygon points="0,-34 6,-6 0,0 -6,-6" className="bp-fill-soft" />
          <polygon points="0,34 6,6 0,0 -6,6" {...line} />
          <polygon points="-34,0 -6,-6 0,0 -6,6" {...line} />
          <polygon points="34,0 6,-6 0,0 6,6" {...line} />
          <text y="-40" textAnchor="middle" className="bp-svg-label bp-fill-soft" fontSize="10">N</text>
        </g>
      );
    case "table":
      return (
        <g transform={`translate(${cx},${cy})`}>
          <circle r="22" {...line} />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <rect key={a} x="-7" y="-41" width="14" height="10" rx="2" {...line} transform={`rotate(${a})`} />
          ))}
          <path d="M-9,-6 h18 v9 h-11 l-5,5 v-5 h-2 z" {...line} />
        </g>
      );
    case "desk":
      return (
        <g transform={`translate(${cx},${cy})`}>
          <rect x="-48" y="-18" width="96" height="36" {...line} />
          <rect x="-17" y="-11" width="34" height="22" {...line} />
          <polyline points="-17,-11 0,2 17,-11" {...line} />
          <circle cy="32" r="9" {...line} />
        </g>
      );
    case "office":
      return (
        <g transform={`translate(${cx},${cy})`}>
          <rect x="-44" y="-16" width="88" height="32" {...line} />
          <rect x="-30" y="-10" width="26" height="16" {...line} />
          <circle cy="30" r="9" {...line} />
          <line x1="-44" y1="-26" x2="44" y2="-26" {...line} strokeDasharray="3 3" />
        </g>
      );
    case "loom":
      return (
        <g transform={`translate(${cx},${cy})`}>
          {[-36, -12, 12, 36].map((x) => (
            <line key={`w${x}`} x1={x} y1="-30" x2={x} y2="30" {...line} />
          ))}
          <path d="M-46,-18 C-24,-30 -24,0 0,-12 S24,-24 46,-18" {...line} />
          <path d="M-46,6 C-24,-6 -24,24 0,12 S24,0 46,6" {...line} />
          <path d="M-46,26 C-24,14 -24,40 0,30 S24,18 46,26" {...line} />
        </g>
      );
    case "chart":
      return (
        <g transform={`translate(${cx},${cy})`}>
          <line x1="-46" y1="30" x2="46" y2="30" {...line} />
          {[18, 34, 26, 48, 40].map((h, i) => (
            <rect key={i} x={-42 + i * 18} y={30 - h} width="12" height={h} {...line} />
          ))}
        </g>
      );
    case "card":
      // A card with its dimension lines — 1200 × 630, the only size there is.
      return (
        <g transform={`translate(${cx},${cy})`}>
          <rect x="-44" y="-20" width="84" height="44" {...line} />
          <rect x="-40" y="-24" width="84" height="44" {...line} strokeDasharray="2 3" />
          <line x1="-44" y1="34" x2="40" y2="34" {...line} />
          <line x1="-44" y1="30" x2="-44" y2="38" {...line} />
          <line x1="40" y1="30" x2="40" y2="38" {...line} />
          <text x="-2" y="48" textAnchor="middle" className="bp-svg-mono bp-fill-soft" fontSize="9">1200</text>
          <line x1="50" y1="-20" x2="50" y2="24" {...line} />
          <text x="54" y="5" className="bp-svg-mono bp-fill-soft" fontSize="9">630</text>
        </g>
      );
    case "rug":
      return (
        <g transform={`translate(${cx},${cy})`}>
          <rect x="-56" y="-26" width="112" height="52" {...line} />
          <rect x="-48" y="-18" width="96" height="36" {...line} strokeDasharray="3 3" />
          {[-56, 56].map((x) => [-20, -10, 0, 10, 20].map((y) => (
            <line key={`${x}${y}`} x1={x} y1={y} x2={x + (x < 0 ? -6 : 6)} y2={y} {...line} />
          )))}
        </g>
      );
    case "stairs":
      // Stairs in plan: treads, a cut line and the arrow saying which way is up.
      return (
        <g transform={`translate(${cx},${cy})`}>
          <rect x="-60" y="-22" width="120" height="44" {...line} />
          {[-45, -30, -15, 0, 15, 30, 45].map((x) => (
            <line key={x} x1={x} y1="-22" x2={x} y2="22" {...line} />
          ))}
          <line x1="-52" y1="0" x2="48" y2="0" className="bp-stroke" strokeWidth="1.4" />
          <polyline points="40,-6 50,0 40,6" fill="none" className="bp-stroke" strokeWidth="1.4" />
          <text x="-52" y="-28" className="bp-svg-label bp-fill-soft" fontSize="9">Up</text>
        </g>
      );
    case "game":
      return (
        <g transform={`translate(${cx},${cy})`}>
          <circle r="26" {...line} />
          <rect x="-11" y="-11" width="22" height="22" {...line} transform="rotate(45)" />
          <circle cx="-38" r="8" {...line} />
          <circle cx="38" r="8" {...line} />
        </g>
      );
    default:
      return null;
  }
};

// The Archives room holds one alcove per collection, each a shelf of spines.
const Alcoves = ({ room, ctx }) => {
  const cols = 4;
  const pad = 18;
  const gap = 10;
  const top = room.y + 78;
  const w = (room.w - pad * 2 - gap * (cols - 1)) / cols;
  // Leave the bottom clear for the door into the foyer.
  const h = (room.h - (top - room.y) - 34 - gap) / 2;
  return COLLECTIONS.map((col, i) => {
    const x = room.x + pad + (i % cols) * (w + gap);
    const y = top + Math.floor(i / cols) * (h + gap);
    const count = fmt(col.count(ctx));
    return (
      <g key={col.id}>
        <rect x={x} y={y} width={w} height={h} fill="none" className="bp-stroke-soft" strokeWidth="1.2" />
        {[0, 1, 2, 3, 4, 5, 6].map((k) => (
          <line
            key={k}
            x1={x + 8 + k * 5}
            y1={y + h - 6}
            x2={x + 8 + k * 5}
            y2={y + h - 14 - ((k * 7) % 9)}
            className="bp-stroke-soft"
            strokeWidth="2.5"
          />
        ))}
        <text x={x + 8} y={y + 16} className="bp-svg-label bp-fill-ink" fontSize="10">{col.label}</text>
        {count && (
          <text x={x + w - 8} y={y + h - 8} textAnchor="end" className="bp-svg-mono bp-fill-soft" fontSize="11">
            {count}
          </text>
        )}
      </g>
    );
  });
};

const SitePlan = ({ selectedId, onSelect, ctx }) => (
  <div className="bp-scroll">
    <svg
      viewBox={`${-M} ${-M} ${W + M * 2} ${H + M * 2}`}
      className="w-full min-w-[720px] h-auto block"
      role="group"
      aria-label="Site plan: every feature of the site drawn as a room. Select a room to read its specification."
    >
      <defs>
        <pattern id="bp-plan-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="10" className="bp-stroke-red" strokeWidth="2" strokeOpacity="0.35" />
        </pattern>
      </defs>

      {/* Structural grid: lettered columns, numbered rows. */}
      {COLUMN_GRID.map((x, i) => (
        <g key={`c${x}`}>
          <line x1={x} y1={-30} x2={x} y2={H + 14} className="bp-stroke-faint" strokeWidth="1" strokeDasharray="10 4 2 4" />
          <circle cx={x} cy={-38} r="12" className="bp-fill-paper bp-stroke-soft" strokeWidth="1.2" />
          <text x={x} y={-34} textAnchor="middle" className="bp-svg-label bp-fill-soft" fontSize="11">
            {String.fromCharCode(65 + i)}
          </text>
        </g>
      ))}
      {ROW_GRID.map((y, i) => (
        <g key={`r${y}`}>
          <line x1={-30} y1={y} x2={W + 14} y2={y} className="bp-stroke-faint" strokeWidth="1" strokeDasharray="10 4 2 4" />
          <circle cx={-38} cy={y} r="12" className="bp-fill-paper bp-stroke-soft" strokeWidth="1.2" />
          <text x={-38} y={y + 4} textAnchor="middle" className="bp-svg-label bp-fill-soft" fontSize="11">
            {i + 1}
          </text>
        </g>
      ))}

      {/* Selected room fill sits under the walls. */}
      {FEATURES.filter((f) => f.id === selectedId).map(({ id, plan }) => (
        <g key={`sel-${id}`}>
          <rect x={plan.x} y={plan.y} width={plan.w} height={plan.h} className="bp-fill-red-soft" />
          <rect x={plan.x} y={plan.y} width={plan.w} height={plan.h} fill="url(#bp-plan-hatch)" />
        </g>
      ))}

      {/* Walls, then the doors cut through them, then the outer wall. */}
      {FEATURES.map(({ id, plan }) => (
        <rect key={`wall-${id}`} x={plan.x} y={plan.y} width={plan.w} height={plan.h} fill="none" className="bp-stroke" strokeWidth="3" />
      ))}
      {FEATURES.filter((f) => f.door).map(({ id, door }) => <Door key={`door-${id}`} {...door} />)}
      <rect x={0} y={0} width={W} height={H} fill="none" className="bp-stroke" strokeWidth="8" />

      {/* The main entrance: a double door in the outer wall into the foyer. */}
      <rect x={330} y={H - 6} width={70} height={12} className="bp-fill-paper" />
      <line x1={330} y1={H} x2={330} y2={H - 35} className="bp-stroke" strokeWidth="1.5" />
      <line x1={400} y1={H} x2={400} y2={H - 35} className="bp-stroke" strokeWidth="1.5" />
      <path d={`M365,${H} A35,35 0 0 0 330,${H - 35}`} fill="none" className="bp-stroke-soft" strokeWidth="1" />
      <path d={`M365,${H} A35,35 0 0 1 400,${H - 35}`} fill="none" className="bp-stroke-soft" strokeWidth="1" />
      <polyline points={`355,${H + 40} 365,${H + 22} 375,${H + 40}`} fill="none" className="bp-stroke-red" strokeWidth="2" />
      <text x={385} y={H + 38} className="bp-svg-label bp-fill-red" fontSize="11">Entrance · you are here</text>

      {/* Labels and furniture. */}
      {FEATURES.map((f) => {
        const { plan } = f;
        const selected = f.id === selectedId;
        const area = resolve(f.area, ctx);
        const cx = plan.x + plan.w / 2;
        const label = selected ? "bp-fill-red" : "bp-fill-ink";
        return (
          <g key={`label-${f.id}`} pointerEvents="none">
            <rect x={plan.x + 10} y={plan.y + 10} width="34" height="16" className={selected ? "bp-fill-red" : "bp-fill-ink"} />
            <text x={plan.x + 27} y={plan.y + 22} textAnchor="middle" className="bp-svg-mono bp-fill-paper" fontSize="10">
              {f.no}
            </text>
            <text x={cx} y={plan.y + 46} textAnchor="middle" className={`bp-svg-label ${label}`} fontSize="15">
              {f.name}
            </text>
            {area && (
              <text x={cx} y={plan.y + 63} textAnchor="middle" className="bp-svg-mono bp-fill-soft" fontSize="11">
                {area}
              </text>
            )}
            {f.furniture === "alcoves"
              ? <Alcoves room={plan} ctx={ctx} />
              : <Furniture kind={f.furniture} cx={cx} cy={plan.y + 70 + (plan.h - 70) / 2} />}
          </g>
        );
      })}

      {/* Hit areas last, so they sit over the drawing. */}
      {FEATURES.map((f) => {
        const { plan } = f;
        const selected = f.id === selectedId;
        return (
          <g
            key={`hit-${f.id}`}
            className="bp-hit"
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={`Room ${f.no}: ${f.name}`}
            onClick={() => onSelect(f.id)}
            onKeyDown={activate(() => onSelect(f.id))}
          >
            <rect className="bp-hit-shape" x={plan.x + 4} y={plan.y + 4} width={plan.w - 8} height={plan.h - 8} />
            {selected && (
              <rect x={plan.x + 4} y={plan.y + 4} width={plan.w - 8} height={plan.h - 8} fill="none" className="bp-stroke-red" strokeWidth="3" />
            )}
          </g>
        );
      })}
    </svg>
  </div>
);

SitePlan.propTypes = {
  selectedId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  ctx: PropTypes.shape({}),
};

SitePlan.defaultProps = {
  selectedId: null,
  ctx: null,
};

export default SitePlan;
