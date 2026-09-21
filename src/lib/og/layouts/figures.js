// The bespoke visual vocabulary. Each figure returns an SVG STRING, which
// `svgShape` wraps into an <img> — satori lays out images but cannot lay out
// raw SVG children, so anything path-based has to arrive this way.
//
// Figures are deterministic: every one that needs variation derives it from
// `hashString`, the same FNV-1a used by the micro-blog pinboard. The same fort
// list always draws the same ridge.

import { hashString, seededRandom, colorForTag } from "../../generativeArt.js";
import { COLORS, RIBBON } from "../tokens.js";

const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// --- /books ------------------------------------------------------------------

// Vertical book spines. Widths and heights are hashed per title, so the shelf
// is stable for a given library and looks like a shelf rather than a bar chart.
export const spineStack = (titles, { width = 560, height = 420, colors = [] } = {}) => {
  const given = (titles || []).map(String).filter(Boolean);
  if (!given.length) return "";
  // A shelf has to read as a shelf: /stats gives eight top genres, and eight
  // bars this wide read as a column chart instead. Expand a short list the way
  // `ridgeline` does — hash the name with an index — so the shelf is still
  // derived from this library and still deterministic.
  const list = given.length >= 12
    ? given.slice(0, 16)
    : Array.from({ length: 15 }, (_, i) => `${given[i % given.length]}-${i}`);
  const gap = 7;
  const slot = (width - gap * (list.length - 1)) / list.length;
  const shelfY = height - 8;
  const bars = list.map((title, i) => {
    const rnd = seededRandom(hashString(String(title)));
    // Wide variance on purpose: near-uniform heights read as a bar chart, and
    // the figure has to say "shelf" before any text is legible.
    const w = slot * (0.5 + rnd() * 0.5);
    const hh = (shelfY - 10) * (0.52 + rnd() * 0.48);
    const x = i * (slot + gap) + (slot - w) / 2;
    const y = shelfY - hh;
    const fill = colors[i % Math.max(colors.length, 1)] || RIBBON[i % RIBBON.length];
    // Two rules per spine stand in for the title block on a real jacket.
    const rules = [0.16, 0.24].map((frac) => `<rect x="${(x + w * 0.16).toFixed(1)}" y="${(y + hh * frac).toFixed(1)}" width="${(w * 0.68).toFixed(1)}" height="3" rx="1.5" fill="${COLORS.ink}" opacity="0.32"/>`).join("");
    return [
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${hh.toFixed(1)}" rx="2" fill="${fill}" opacity="0.94"/>`,
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(w * 0.22).toFixed(1)}" height="${hh.toFixed(1)}" fill="${COLORS.text}" opacity="0.1"/>`,
      rules,
    ].join("");
  }).join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    bars,
    `<rect x="0" y="${shelfY}" width="${width}" height="5" rx="2.5" fill="${COLORS.textFaint}" opacity="0.5"/>`,
    `</svg>`,
  ].join("");
};

// --- /treks ------------------------------------------------------------------

// A summit ridge. Peak heights are hashed from the fort names, so the skyline
// is this trek log's skyline and not a generic mountain.
export const ridgeline = (names, { width = 1200, height = 260, accent = COLORS.teal, flag = true } = {}) => {
  // A detail card knows ONE fort, and a one-point ridge is a flat line. Expand
  // a short list into a full skyline by hashing the name with an index, so
  // every fort still gets its own distinctive profile, deterministically.
  const given = (names && names.length ? names : ["ridge"]).map(String);
  const list = given.length >= 5
    ? given.slice(0, 9)
    : Array.from({ length: 7 }, (_, i) => `${given[i % given.length]}-${i}`);
  const points = list.map((name, i) => {
    const rnd = seededRandom(hashString(String(name)));
    const x = (width / (list.length - 1 || 1)) * i;
    const y = height * (0.18 + rnd() * 0.6);
    return { x, y };
  });
  // Valleys between peaks keep it reading as terrain rather than a zigzag.
  const path = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = points[i - 1];
    const midX = (prev.x + p.x) / 2;
    const midY = Math.max(prev.y, p.y) + height * 0.16;
    return `${acc} L ${midX.toFixed(1)} ${Math.min(midY, height).toFixed(1)} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, "");
  const highest = points.reduce((best, p) => (p.y < best.y ? p : best), points[0]);
  const flagMark = flag
    ? `<line x1="${highest.x.toFixed(1)}" y1="${highest.y.toFixed(1)}" x2="${highest.x.toFixed(1)}" y2="${(highest.y - 42).toFixed(1)}" stroke="${accent}" stroke-width="3"/>`
      + `<path d="M ${highest.x.toFixed(1)} ${(highest.y - 42).toFixed(1)} l 30 9 l -30 9 z" fill="${accent}"/>`
    : "";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<path d="${path} L ${width} ${height} L 0 ${height} Z" fill="${accent}" opacity="0.18"/>`,
    `<path d="${path}" fill="none" stroke="${accent}" stroke-width="4" stroke-linejoin="round"/>`,
    flagMark,
    `</svg>`,
  ].join("");
};

// The 404 variant: the same ridge, with a dotted path that stops part way up.
export const lostTrail = (width = 1200, height = 300) => {
  const ridge = ridgeline(["lost", "trail", "nowhere", "here"], { width, height, accent: COLORS.textFaint, flag: false });
  const dots = `<path d="M 80 ${height - 30} Q ${width * 0.3} ${height - 120} ${width * 0.52} ${height - 90}" fill="none" stroke="${COLORS.amber}" stroke-width="5" stroke-dasharray="3 18" stroke-linecap="round"/>`
    + `<circle cx="${width * 0.52}" cy="${height - 90}" r="9" fill="${COLORS.amber}"/>`;
  return ridge.replace("</svg>", `${dots}</svg>`);
};

// --- /100-days-to-offload ---------------------------------------------------

// 100 dots, `filled` of them lit. Reads as a progress texture at thumbnail size
// and as a countable grid at full size.
export const dotMatrix = (filled, { total = 100, width = 620, columns = 20, accent = COLORS.orange } = {}) => {
  const rows = Math.ceil(total / columns);
  const step = width / columns;
  const r = Math.max(4, step * 0.28);
  const dots = Array.from({ length: total }, (_, i) => {
    const cx = (i % columns) * step + step / 2;
    const cy = Math.floor(i / columns) * step + step / 2;
    const on = i < filled;
    const hue = on ? accent : COLORS.panelEdge;
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${hue}" opacity="${on ? 0.95 : 0.55}"/>`;
  }).join("");
  const height = rows * step;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${dots}</svg>`;
};

export const progressBar = (pct, { width = 900, height = 48, accent = COLORS.orange } = {}) => {
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect x="0" y="0" width="${width}" height="${height}" rx="${height / 2}" fill="${COLORS.panelEdge}" opacity="0.6"/>`,
    `<rect x="0" y="0" width="${((width * clamped) / 100).toFixed(1)}" height="${height}" rx="${height / 2}" fill="${accent}"/>`,
    `</svg>`,
  ].join("");
};

// --- /tags ------------------------------------------------------------------

// Swatch cloud. Sizes come from each tag's item count, colours from
// `colorForTag` — the same resolution /tags and the micro-blog pinboard use, so
// the cloud is the vocabulary's actual palette.
//
// It has to go through colorForTag rather than read `tag.color`: almost no tag
// has a colour stored, so taking `color || violet` painted all 44 swatches one
// shade and the card lost the only thing it was drawing.
export const swatchCloud = (tags, { width = 1072, height = 300 } = {}) => {
  const list = (tags || []).slice(0, 44);
  if (!list.length) return "";
  const max = list.reduce((m, t) => Math.max(m, Number(t.total) || 1), 1);
  let x = 0;
  let y = 0;
  let rowH = 0;
  let row = 0;
  const placed = [];
  list.forEach((tag) => {
    const weight = (Number(tag.total) || 1) / max;
    const size = 26 + Math.round(weight * 64);
    if (x + size > width) { x = 0; y += rowH + 12; rowH = 0; row += 1; }
    if (y + size <= height) {
      placed.push({
        row,
        svg: `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="8" fill="${colorForTag(tag.name, tag.color)}" opacity="0.88"/>`,
      });
    }
    x += size + 12;
    rowH = Math.max(rowH, size);
  });
  // A last row holding one or two swatches reads as a stray dot under the
  // block rather than as part of the cloud, so drop it.
  const lastRow = placed.length ? placed[placed.length - 1].row : 0;
  const tail = placed.filter((c) => c.row === lastRow).length;
  const cells = (tail < 3 && lastRow > 0 ? placed.filter((c) => c.row !== lastRow) : placed)
    .map((c) => c.svg).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${cells}</svg>`;
};

// --- /mindmap, /interactive-me ---------------------------------------------

// Radial spokes for /mindmap: a centre with labelled branches.
export const radialSpokes = (count, { size = 360, accent = COLORS.blue } = {}) => {
  const n = Math.max(3, count || 6);
  const c = size / 2;
  const spokes = Array.from({ length: n }, (_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const x = c + Math.cos(angle) * (c - 28);
    const y = c + Math.sin(angle) * (c - 28);
    return [
      `<line x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${accent}" stroke-width="3" opacity="0.6"/>`,
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="16" fill="${accent}" opacity="0.9"/>`,
    ].join("");
  }).join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    spokes,
    `<circle cx="${c}" cy="${c}" r="28" fill="${COLORS.text}"/>`,
    `</svg>`,
  ].join("");
};

// A connected curve of nodes for /interactive-me, echoing that page's own
// alternating-node-and-bezier timeline.
export const connectedCurve = (count, { width = 1000, height = 220, accent = COLORS.cyan } = {}) => {
  const n = Math.max(4, count || 9);
  const step = width / (n - 1);
  const nodes = Array.from({ length: n }, (_, i) => ({
    x: i * step,
    y: i % 2 === 0 ? height * 0.28 : height * 0.72,
  }));
  const path = nodes.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = nodes[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx.toFixed(1)} ${prev.y.toFixed(1)}, ${cx.toFixed(1)} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, "");
  const dots = nodes.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="14" fill="${accent}" opacity="0.92"/>`).join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<path d="${path}" fill="none" stroke="${accent}" stroke-width="3" opacity="0.5"/>${dots}</svg>`,
  ].join("");
};

// --- /presentations ---------------------------------------------------------

// Three fanned 16:9 frames — a deck, seen edge-on.
export const slideFan = ({ width = 520, height = 340, accent = COLORS.blue } = {}) => {
  const frames = [
    { dx: 46, dy: 0, rot: 7, op: 0.28 },
    { dx: 24, dy: 14, rot: 3.5, op: 0.5 },
    { dx: 0, dy: 28, rot: 0, op: 1 },
  ].map(({ dx, dy, rot, op }) => {
    const w = width - 70;
    const hh = w * (9 / 16);
    return [
      `<g transform="translate(${dx} ${dy}) rotate(${rot} ${w / 2} ${hh / 2})">`,
      `<rect x="0" y="0" width="${w}" height="${hh.toFixed(1)}" rx="10" fill="${COLORS.panel}" stroke="${accent}" stroke-width="3" opacity="${op}"/>`,
      `</g>`,
    ].join("");
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${frames}</svg>`;
};

// --- /stats -----------------------------------------------------------------

// A small bar series. Four of these tile into the "sparkline wall".
export const sparkBars = (values, { width = 240, height = 90, accent = COLORS.cyan } = {}) => {
  const list = (values || []).filter((v) => Number.isFinite(Number(v)));
  if (!list.length) return "";
  const max = list.reduce((m, v) => Math.max(m, Number(v)), 1);
  const slot = width / list.length;
  const bars = list.map((v, i) => {
    const hh = Math.max(2, (Number(v) / max) * height);
    return `<rect x="${(i * slot + slot * 0.15).toFixed(1)}" y="${(height - hh).toFixed(1)}" width="${(slot * 0.7).toFixed(1)}" height="${hh.toFixed(1)}" rx="2" fill="${accent}" opacity="0.9"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${bars}</svg>`;
};

// --- /sports ----------------------------------------------------------------

// A distance dial: concentric arcs for 10K / 21K / 42K.
export const distanceDial = ({ size = 300, accent = COLORS.red } = {}) => {
  const c = size / 2;
  const rings = [0.92, 0.66, 0.4].map((scale, i) => {
    const r = c * scale - 6;
    const circumference = 2 * Math.PI * r;
    const fraction = [0.82, 0.62, 0.42][i];
    return [
      `<circle cx="${c}" cy="${c}" r="${r.toFixed(1)}" fill="none" stroke="${COLORS.panelEdge}" stroke-width="12" opacity="0.5"/>`,
      `<circle cx="${c}" cy="${c}" r="${r.toFixed(1)}" fill="none" stroke="${accent}" stroke-width="12" stroke-linecap="round"`,
      ` stroke-dasharray="${(circumference * fraction).toFixed(1)} ${circumference.toFixed(1)}" transform="rotate(-90 ${c} ${c})" opacity="${0.55 + i * 0.2}"/>`,
    ].join("");
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${rings}</svg>`;
};

// --- /resume ----------------------------------------------------------------

export const timelineRail = (count, { width = 60, height = 380, accent = COLORS.violetLight } = {}) => {
  const n = Math.max(2, count || 4);
  const ticks = Array.from({ length: n }, (_, i) => {
    const y = (height / (n - 1 || 1)) * i;
    return `<circle cx="${width / 2}" cy="${y.toFixed(1)}" r="9" fill="${accent}"/>`;
  }).join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<line x1="${width / 2}" y1="0" x2="${width / 2}" y2="${height}" stroke="${accent}" stroke-width="3" opacity="0.4"/>${ticks}</svg>`,
  ].join("");
};

// --- /ask --------------------------------------------------------------------

// Two chat bubbles. `lines` sets how many answer lines to suggest.
export const chatBubbles = ({ width = 1000, height = 300, accent = COLORS.cyan, lines = 3 } = {}) => {
  const answerLines = Array.from({ length: lines }, (_, i) => {
    const w = width * (0.62 - i * 0.12);
    return `<rect x="24" y="${(150 + i * 34).toFixed(1)}" width="${w.toFixed(1)}" height="14" rx="7" fill="${COLORS.textFaint}" opacity="${0.5 - i * 0.1}"/>`;
  }).join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect x="${width * 0.28}" y="8" width="${width * 0.7}" height="88" rx="22" fill="${accent}" opacity="0.22" stroke="${accent}" stroke-width="2"/>`,
    `<rect x="0" y="122" width="${width * 0.74}" height="${height - 130}" rx="22" fill="${COLORS.panel}" opacity="0.9"/>`,
    answerLines,
    `<rect x="24" y="${(150 + lines * 34).toFixed(1)}" width="16" height="22" fill="${accent}"/>`,
    `</svg>`,
  ].join("");
};

// --- /changelog -------------------------------------------------------------

export const versionStack = ({ width = 420, height = 260, accent = COLORS.textFaint } = {}) => {
  const rows = [0, 1, 2].map((i) => {
    const op = i === 0 ? 1 : 0.4 - i * 0.1;
    const w = width - i * 48;
    return `<rect x="${i * 24}" y="${i * 86}" width="${w}" height="66" rx="12" fill="${COLORS.panel}" stroke="${i === 0 ? COLORS.amber : accent}" stroke-width="${i === 0 ? 3 : 2}" opacity="${op}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${rows}</svg>`;
};

// --- /changelog/graph -------------------------------------------------------

// A commit graph: one trunk, a branch that leaves and merges back, dots for
// commits and ringed dots for the two releases. Deliberately carries no
// numbers — the page's counts are not in computeSiteStats, and a card that
// invents one is worse than a card that shows structure.
export const commitGraph = ({ width = 380, height = 260, accent = COLORS.amber } = {}) => {
  const rows = 8;
  const gap = height / (rows + 1);
  const trunk = 40;
  const branch = 104;
  const y = (i) => gap * (i + 1);

  const line = (x1, y1, x2, y2, colour, w = 3, op = 1) => `<path d="M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-opacity="${op}"/>`;

  const dot = (x, i, release) => `<circle cx="${x}" cy="${y(i)}" r="${release ? 9 : 5}" fill="${release ? accent : COLORS.textFaint}"${release ? ` stroke="${COLORS.panel}" stroke-width="3"` : ""}/>`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    // The trunk, top to bottom.
    line(trunk, y(0), trunk, y(rows - 1), COLORS.textFaint, 3, 0.55),
    // A branch that leaves at row 1 and merges back at row 5.
    line(trunk, y(1), branch, y(2), accent, 3, 0.85),
    line(branch, y(2), branch, y(4), accent, 3, 0.85),
    line(branch, y(4), trunk, y(5), accent, 3, 0.85),
    [0, 1, 3, 5, 6, 7].map((i) => dot(trunk, i, i === 0 || i === 5)).join(""),
    [2, 3, 4].map((i) => dot(branch, i, false)).join(""),
    "</svg>",
  ].join("");
};

export { esc };
