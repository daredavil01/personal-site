// Sheet A-01: the site plan. The walls draw themselves, the rooms are named
// and measured (live counts, counting up), and then the redline walks from
// room to room.

import {
  C, countUp, easeOut, fade, label, n, prog, rectOn, text,
} from "../draw.mjs";

const S = 0.94;
const OX = 88;
const OY = 262;
const X = (x) => OX + x * S;
const Y = (y) => OY + y * S;
const DOOR = 30 * S;

const SHORT = { atlas: "Atlas", ask: "Ask" };

// Measures worth counting up to; "2 exhibits" ticking from 0 is just noise.
const counts = (area) => Number((String(area).match(/[\d,]+/) || ["0"])[0].replace(/,/g, "")) >= 10;

// The furniture from src/components/Blueprint/SitePlan.js, in outline.
const LINE = `fill="none" stroke="${C.ink}" stroke-opacity="0.62" stroke-width="1.6"`;
const FURNITURE = {
  compass: `<circle r="34" ${LINE}/><circle r="24" ${LINE} stroke-dasharray="2 4"/>
    <polygon points="0,-34 6,-6 0,0 -6,-6" fill="${C.ink}" fill-opacity="0.62"/>
    <polygon points="0,34 6,6 0,0 -6,6" ${LINE}/><polygon points="-34,0 -6,-6 0,0 -6,6" ${LINE}/><polygon points="34,0 6,-6 0,0 6,6" ${LINE}/>`,
  table: `<circle r="22" ${LINE}/>${[0, 60, 120, 180, 240, 300].map((a) => `<rect x="-7" y="-41" width="14" height="10" rx="2" ${LINE} transform="rotate(${a})"/>`).join("")}
    <path d="M-9,-6 h18 v9 h-11 l-5,5 v-5 h-2 z" ${LINE}/>`,
  desk: `<rect x="-48" y="-18" width="96" height="36" ${LINE}/><rect x="-17" y="-11" width="34" height="22" ${LINE}/>
    <polyline points="-17,-11 0,2 17,-11" ${LINE}/><circle cy="32" r="9" ${LINE}/>`,
  office: `<rect x="-44" y="-16" width="88" height="32" ${LINE}/><rect x="-30" y="-10" width="26" height="16" ${LINE}/>
    <circle cy="30" r="9" ${LINE}/><line x1="-44" y1="-26" x2="44" y2="-26" ${LINE} stroke-dasharray="3 3"/>`,
  loom: `${[-36, -12, 12, 36].map((x) => `<line x1="${x}" y1="-30" x2="${x}" y2="30" ${LINE}/>`).join("")}
    <path d="M-46,-18 C-24,-30 -24,0 0,-12 S24,-24 46,-18" ${LINE}/><path d="M-46,6 C-24,-6 -24,24 0,12 S24,0 46,6" ${LINE}/>
    <path d="M-46,26 C-24,14 -24,40 0,30 S24,18 46,26" ${LINE}/>`,
  chart: `<line x1="-46" y1="30" x2="46" y2="30" ${LINE}/>${[18, 34, 26, 48, 40].map((h, i) => `<rect x="${-42 + i * 18}" y="${30 - h}" width="12" height="${h}" ${LINE}/>`).join("")}`,
  card: `<rect x="-44" y="-20" width="84" height="44" ${LINE}/><rect x="-40" y="-24" width="84" height="44" ${LINE} stroke-dasharray="2 3"/>
    <line x1="-44" y1="34" x2="40" y2="34" ${LINE}/><line x1="-44" y1="30" x2="-44" y2="38" ${LINE}/><line x1="40" y1="30" x2="40" y2="38" ${LINE}/>`,
  rug: `<rect x="-56" y="-26" width="112" height="52" ${LINE}/><rect x="-48" y="-18" width="96" height="36" ${LINE} stroke-dasharray="3 3"/>`,
  stairs: `<rect x="-60" y="-22" width="120" height="44" ${LINE}/>${[-45, -30, -15, 0, 15, 30, 45].map((x) => `<line x1="${x}" y1="-22" x2="${x}" y2="22" ${LINE}/>`).join("")}
    <line x1="-52" y1="0" x2="48" y2="0" stroke="${C.ink}" stroke-width="1.6"/><polyline points="40,-6 50,0 40,6" fill="none" stroke="${C.ink}" stroke-width="1.6"/>`,
  game: `<circle r="26" ${LINE}/><rect x="-11" y="-11" width="22" height="22" ${LINE} transform="rotate(45)"/>
    <circle cx="-38" r="8" ${LINE}/><circle cx="38" r="8" ${LINE}/>`,
};

const door = ({ x, y, dir, locked }, o) => {
  const px = X(x);
  const py = Y(y);
  const gap = dir === "h"
    ? `<rect x="${n(px)}" y="${n(py - 6)}" width="${n(DOOR)}" height="12" fill="${C.paper}"/>`
    : `<rect x="${n(px - 6)}" y="${n(py)}" width="12" height="${n(DOOR)}" fill="${C.paper}"/>`;
  const swing = dir === "h"
    ? `<line x1="${n(px)}" y1="${n(py)}" x2="${n(px)}" y2="${n(py - DOOR)}" stroke="${C.ink}" stroke-width="1.8"/>
       <path d="M${n(px + DOOR)},${n(py)} A${n(DOOR)},${n(DOOR)} 0 0 0 ${n(px)},${n(py - DOOR)}" fill="none" stroke="${C.ink}" stroke-opacity="0.6"/>`
    : `<line x1="${n(px)}" y1="${n(py)}" x2="${n(px + DOOR)}" y2="${n(py)}" stroke="${C.ink}" stroke-width="1.8"/>
       <path d="M${n(px)},${n(py + DOOR)} A${n(DOOR)},${n(DOOR)} 0 0 0 ${n(px + DOOR)},${n(py)}" fill="none" stroke="${C.ink}" stroke-opacity="0.6"/>`;
  const lock = locked
    ? `<g transform="translate(${n(px + DOOR + 10)},${n(py - 26)})"><path d="M3,8 V4 a5,5 0 0 1 10,0 V8" fill="none" stroke="${C.red}" stroke-width="2"/><rect x="0" y="8" width="16" height="12" rx="2" fill="${C.red}"/></g>`
    : "";
  return `<g opacity="${o.toFixed(3)}">${gap}${swing}${lock}</g>`;
};

/**
 * @param {object} d
 * @param {object[]} d.features   FEATURES from src/components/Blueprint/features.js
 * @param {object[]} d.collections COLLECTIONS, each with a resolved `count`
 * @param {(f: object) => string|null} d.areaOf  a room's resolved area label
 * @param {{ at: number, id: string }[]} d.tour  which rooms the redline visits, when
 */
export function plan({ features, collections, areaOf, tour }) {
  const order = features.map((f) => f.id);
  const W0 = 960;
  const H0 = 600;

  return (t) => {
    const parts = [];

    // Structural grid and bubbles.
    const g = fade(t, 0.2, 0.8);
    [0, 260, 520, 740, 960].forEach((x, i) => {
      parts.push(`<line x1="${n(X(x))}" y1="${n(OY - 26)}" x2="${n(X(x))}" y2="${n(Y(H0) + 12)}" stroke="${C.ink}" stroke-opacity="${(0.2 * g).toFixed(3)}" stroke-dasharray="10 4 2 4"/>`);
      parts.push(`<circle cx="${n(X(x))}" cy="${n(OY - 40)}" r="15" fill="${C.paper}" stroke="${C.ink}" stroke-opacity="${(0.6 * g).toFixed(3)}"/>`);
      parts.push(label(X(x), OY - 34, String.fromCharCode(65 + i), { size: 15, anchor: "middle", fill: C.soft, opacity: g }));
    });

    // The redline: current room hatched, outline drawn on.
    const current = tour.reduce((found, stop, i) => (stop.at <= t ? i : found), -1);
    if (current >= 0) {
      const stop = tour[current];
      const next = tour[current + 1];
      const f = features.find((x) => x.id === stop.id);
      const on = fade(t, stop.at, 0.35, next ? next.at : Infinity);
      const { x, y, w, h } = f.plan;
      parts.push(`<rect x="${n(X(x))}" y="${n(Y(y))}" width="${n(w * S)}" height="${n(h * S)}" fill="${C.redSoft}" opacity="${on.toFixed(3)}"/>`);
      parts.push(`<rect x="${n(X(x))}" y="${n(Y(y))}" width="${n(w * S)}" height="${n(h * S)}" fill="url(#bp-hatch)" opacity="${on.toFixed(3)}"/>`);
    }

    // Walls, room by room, then the outer wall over them.
    features.forEach((f, i) => {
      const { x, y, w, h } = f.plan;
      parts.push(rectOn(X(x), Y(y), w * S, h * S, prog(t, 0.2 + i * 0.12, 1.1 + i * 0.12), ` stroke="${C.ink}" stroke-width="3"`));
    });
    parts.push(rectOn(X(0), Y(0), W0 * S, H0 * S, prog(t, 0, 1.8), ` stroke="${C.ink}" stroke-width="8"`));

    // Doors, and the entrance.
    const dOn = fade(t, 2.0, 0.6);
    features.filter((f) => f.door).forEach((f) => parts.push(door(f.door, dOn)));
    parts.push(`<g opacity="${dOn.toFixed(3)}">
      <rect x="${n(X(330))}" y="${n(Y(H0) - 7)}" width="${n(70 * S)}" height="14" fill="${C.paper}"/>
      <polyline points="${n(X(352))},${n(Y(H0) + 34)} ${n(X(365))},${n(Y(H0) + 16)} ${n(X(378))},${n(Y(H0) + 34)}" fill="none" stroke="${C.red}" stroke-width="2.5"/>
    </g>`);
    parts.push(label(X(392), Y(H0) + 34, "Entrance", { size: 15, fill: C.red, opacity: dOn }));

    // Names, measures and furniture.
    features.forEach((f, i) => {
      const { x, y, w, h } = f.plan;
      const o = fade(t, 2.2 + order.indexOf(f.id) * 0.08, 0.4);
      if (o <= 0) return;
      const selected = current >= 0 && tour[current].id === f.id;
      const cx = X(x + w / 2);
      const area = areaOf(f);
      parts.push(`<g opacity="${o.toFixed(3)}">
        <rect x="${n(X(x) + 9)}" y="${n(Y(y) + 9)}" width="44" height="22" fill="${selected ? C.red : C.ink}"/>
        ${text(X(x) + 31, Y(y) + 25, f.no, { size: 15, anchor: "middle", fill: C.paper, weight: 700 })}
        ${label(cx, Y(y) + 58, SHORT[f.id] || f.name, { size: 21, anchor: "middle", fill: selected ? C.red : C.ink })}
        ${area ? text(cx, Y(y) + 84, counts(area) ? countUp(area, prog(t, 2.6, 4.2)) : area, { size: 18, anchor: "middle", fill: C.soft }) : ""}
      </g>`);
      if (f.furniture === "alcoves") {
        const cols = 4;
        const pad = 16;
        const gap = 9;
        // Shallow enough to keep the bottom clear for the door into the foyer.
        const top = Y(y) + 98;
        const aw = (w * S - pad * 2 - gap * (cols - 1)) / cols;
        const ah = 32;
        collections.forEach((col, k) => {
          const ax = X(x) + pad + (k % cols) * (aw + gap);
          const ay = top + Math.floor(k / cols) * (ah + gap);
          const ao = fade(t, 2.8 + k * 0.06, 0.4);
          parts.push(`<g opacity="${ao.toFixed(3)}">
            <rect x="${n(ax)}" y="${n(ay)}" width="${n(aw)}" height="${ah}" fill="none" stroke="${C.ink}" stroke-opacity="0.62" stroke-width="1.4"/>
            ${label(ax + 8, ay + 14, col.label, { size: 11 })}
            ${col.count ? text(ax + aw - 7, ay + 28, countUp(col.count, prog(t, 2.8, 4.4)), { size: 14, anchor: "end", fill: C.soft }) : ""}
          </g>`);
        });
      } else if (FURNITURE[f.furniture]) {
        const cy = Y(y) + 96 + (h * S - 96) / 2;
        parts.push(`<g transform="translate(${n(cx)},${n(cy)}) scale(1.05)" opacity="${fade(t, 2.6 + i * 0.05, 0.6).toFixed(3)}">${FURNITURE[f.furniture]}</g>`);
      }
    });

    // The redline outline, drawn on over everything else.
    if (current >= 0) {
      const stop = tour[current];
      const next = tour[current + 1];
      const f = features.find((x) => x.id === stop.id);
      const { x, y, w, h } = f.plan;
      const out = 1 - prog(t, next ? next.at - 0.3 : Infinity, next ? next.at : Infinity);
      const k = easeOut(prog(t, stop.at, stop.at + 0.6));
      parts.push(`<g opacity="${out.toFixed(3)}">${rectOn(X(x) + 4, Y(y) + 4, w * S - 8, h * S - 8, k, ` stroke="${C.red}" stroke-width="4"`)}</g>`);
    }

    return parts.join("");
  };
}
