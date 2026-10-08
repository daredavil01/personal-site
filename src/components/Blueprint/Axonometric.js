import React, { useState } from "react";
import PropTypes from "prop-types";
import { LAYERS } from "./features";

// The cover drawing: the stack as an exploded axonometric, one slab per layer,
// with the selected room's riser threaded through the slabs it touches. Hover
// or focus a slab to read what lives on it.

const CX = 118;
const CY = 252;
const SW = 170; // slab width along x
const SD = 120; // slab depth along y
const T = 12; // slab thickness
const GAP = 48;
const COS = Math.cos(Math.PI / 6);

const iso = (x, y, z) => [CX + (x - y) * COS, CY + (x + y) * 0.5 - z];
const pts = (list) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

const slab = (z) => {
  const a = iso(0, 0, z);
  const b = iso(SW, 0, z);
  const c = iso(SW, SD, z);
  const d = iso(0, SD, z);
  const down = ([x, y]) => [x, y + T];
  return {
    top: [a, b, c, d],
    left: [d, c, down(c), down(d)],
    right: [c, b, down(b), down(c)],
    corners: [a, b, c, d],
    anchor: down(b),
    centre: iso(SW / 2, SD / 2, z),
  };
};

// Top layer highest.
const SLABS = LAYERS.map((layer, i) => ({ layer, z: (LAYERS.length - 1 - i) * GAP, ...slab((LAYERS.length - 1 - i) * GAP) }));

const Axonometric = ({ feature }) => {
  const [hover, setHover] = useState(null);
  const touched = feature ? SLABS.filter((s) => feature.layers[s.layer.id]) : [];
  const riser = touched.length ? [touched[0].centre, touched[touched.length - 1].centre] : null;

  const hovered = SLABS.find((s) => s.layer.id === hover);

  return (
    <figure className="m-0 flex flex-col gap-1">
      <svg viewBox="0 0 460 420" className="w-full h-auto block" role="group" aria-label="Exploded axonometric of the site's stack">
      {/* Explosion lines at the four corners. */}
      {[0, 1, 2, 3].map((k) => (
        <line
          key={k}
          x1={SLABS[0].corners[k][0]}
          y1={SLABS[0].corners[k][1]}
          x2={SLABS[SLABS.length - 1].corners[k][0]}
          y2={SLABS[SLABS.length - 1].corners[k][1]}
          className="bp-stroke-faint"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
      ))}

      {/* Bottom slab first, so each one above paints over the one below. */}
      {SLABS.slice().reverse().map((s, i) => {
        const hot = hover === s.layer.id;
        const reached = !feature || touched.includes(s);
        let ink = reached ? "bp-stroke" : "bp-stroke-soft";
        if (hot) ink = "bp-stroke-red";
        return (
          <g
            key={s.layer.id}
            className="bp-hit"
            opacity={reached || hot ? 1 : 0.55}
            tabIndex={0}
            role="button"
            aria-pressed={hot}
            aria-label={`${s.layer.level}, ${s.layer.label}: ${s.layer.note}`}
            onClick={() => setHover(s.layer.id)}
            onMouseEnter={() => setHover(s.layer.id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(s.layer.id)}
            onBlur={() => setHover(null)}
          >
            <polygon points={pts(s.left)} className={`bp-fill-soft ${ink}`} fillOpacity="0.35" strokeWidth="1.2" />
            <polygon points={pts(s.right)} className={`bp-fill-soft ${ink}`} fillOpacity="0.2" strokeWidth="1.2" />
            <polygon
              points={pts(s.top)}
              pathLength="1"
              className={`${hot ? "bp-fill-red-soft" : "bp-fill-paper"} ${ink} bp-draw`}
              strokeWidth="1.6"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
            {/* A hint of what is on each floor: rows of rooms drawn on the slab. */}
            {[0.25, 0.5, 0.75].map((f) => {
              const p1 = iso(SW * 0.12, SD * f, s.z);
              const p2 = iso(SW * 0.88, SD * f, s.z);
              return <line key={f} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} className="bp-stroke-faint" strokeWidth="1" />;
            })}
            <line x1={s.anchor[0] + 4} y1={s.anchor[1] - T / 2} x2={300} y2={s.anchor[1] - T / 2} className={hot ? "bp-stroke-red" : "bp-stroke-faint"} strokeWidth="1" />
            <text x={306} y={s.anchor[1] - T / 2 - 2} className={`bp-svg-label ${hot ? "bp-fill-red" : "bp-fill-ink"}`} fontSize="11">
              {`${s.layer.level} · ${s.layer.label}`}
            </text>
          </g>
        );
      })}

      {riser && (
        <g pointerEvents="none">
          <line x1={riser[0][0]} y1={riser[0][1]} x2={riser[1][0]} y2={riser[1][1]} className="bp-stroke-red bp-flow" strokeWidth="3" />
          {touched.map((s) => (
            <circle key={s.layer.id} cx={s.centre[0]} cy={s.centre[1]} r="5" className="bp-fill-red" />
          ))}
          <text x={riser[0][0] + 10} y={riser[0][1] - 10} className="bp-svg-label bp-fill-red" fontSize="10">
            {`Riser ${feature.no}`}
          </text>
        </g>
      )}
      </svg>
      <figcaption className="bp-mono text-[10px] uppercase tracking-[0.18em] bp-soft min-h-[1.25rem]" aria-live="polite">
        {hovered ? `${hovered.layer.level} · ${hovered.layer.note}` : "Exploded axonometric · hover a slab"}
      </figcaption>
    </figure>
  );
};

Axonometric.propTypes = {
  feature: PropTypes.shape({}),
};

Axonometric.defaultProps = {
  feature: null,
};

export default Axonometric;
