// Drawing kit for the Blueprint film: the frame, the palette, type, easing,
// and strokes that draw themselves on. Pure functions of time — every frame
// is rebuilt from scratch from `t`, so a frame can be rendered alone, in any
// order, and always comes out the same.
//
// The palette is the page's dark (cyanotype) tokens from
// src/components/Blueprint/blueprint.css: pale lines on blueprint blue, with
// the redline for whatever the drawing is pointing at.

export const W = 1080;
export const H = 1080;
export const FPS = 30;

export const C = {
  paper: "#0c2342",
  panel: "#0f2a4f",
  ink: "#d4e5fb",
  soft: "rgba(212,229,251,0.64)",
  faint: "rgba(212,229,251,0.2)",
  fill: "rgba(212,229,251,0.06)",
  red: "#ff7a5c",
  redSoft: "rgba(255,122,92,0.2)",
};

export const FONT = {
  serif: "Noto Serif",
  body: "Inter",
  label: "Plus Jakarta Sans",
};

// --- time ---------------------------------------------------------------------

export const clamp01 = (x) => Math.max(0, Math.min(1, x));
/** Progress through [a, b], clamped to 0..1. */
export const prog = (t, a, b) => clamp01((t - a) / (b - a));
export const easeOut = (x) => 1 - (1 - clamp01(x)) ** 3;
export const ease = (x) => {
  const k = clamp01(x);
  return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
};
export const lerp = (a, b, k) => a + (b - a) * k;
/** Fades in over [a, a+d] and, when `out` is given, out over [out-d, out]. */
export const fade = (t, a, d = 0.4, out = Infinity) => Math.min(prog(t, a, a + d), 1 - prog(t, out - d, out));

// --- strings ------------------------------------------------------------------

export const esc = (s) => String(s)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

export const n = (v) => Number(v).toFixed(1);

/** Words into lines of at most `max` characters; at most `lines` lines. */
export function wrap(words, max, lines = 2) {
  const out = [""];
  String(words).split(/\s+/).forEach((word) => {
    const cur = out[out.length - 1];
    if (cur && `${cur} ${word}`.length > max) out.push(word);
    else out[out.length - 1] = cur ? `${cur} ${word}` : word;
  });
  if (out.length <= lines) return out;
  const kept = out.slice(0, lines);
  kept[lines - 1] = `${kept[lines - 1].slice(0, max - 1)}…`;
  return kept;
}

/** The first number in `label`, counted up to its value by `k`. */
export function countUp(label, k) {
  return String(label).replace(/[\d,]+/, (m) => {
    const target = Number(m.replace(/,/g, ""));
    return Math.round(target * easeOut(k)).toLocaleString("en-IN");
  });
}

// --- primitives ---------------------------------------------------------------

const op = (o) => (o < 1 ? ` opacity="${Math.max(0, o).toFixed(3)}"` : "");

export function text(x, y, s, {
  size = 24, font = FONT.body, weight = 400, fill = C.ink, anchor = "start", spacing = 0, opacity = 1,
} = {}) {
  if (opacity <= 0) return "";
  return `<text x="${n(x)}" y="${n(y)}" font-family="${font}" font-weight="${weight}" font-size="${size}" fill="${fill}" text-anchor="${anchor}"${spacing ? ` letter-spacing="${spacing}"` : ""}${op(opacity)}>${esc(s)}</text>`;
}

/** Tracked uppercase, the drawing's technical lettering. */
export const label = (x, y, s, o = {}) => text(x, y, String(s).toUpperCase(), {
  font: FONT.label, weight: 700, spacing: (o.size || 18) * 0.14, ...o,
});

/**
 * Stroke attributes that draw a path on to fraction `p` of `len` — resvg
 * ignores pathLength, so every caller passes the real length.
 */
export const drawOn = (len, p) => (p >= 1
  ? ""
  : ` stroke-dasharray="${n(len)} ${n(len + 1)}" stroke-dashoffset="${n(len * (1 - clamp01(p)))}"`);

export const polyLength = (pts) => pts.slice(1)
  .reduce((sum, [x, y], i) => sum + Math.hypot(x - pts[i][0], y - pts[i][1]), 0);

/** A point `k` of the way along a polyline. */
export function along(pts, k) {
  const total = polyLength(pts);
  let left = total * clamp01(k);
  for (let i = 1; i < pts.length; i += 1) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (left <= seg || i === pts.length - 1) {
      const f = seg ? Math.min(1, left / seg) : 0;
      return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
    }
    left -= seg;
  }
  return pts[pts.length - 1];
}

export const pathOf = (pts) => `M${pts.map(([x, y]) => `${n(x)},${n(y)}`).join(" L")}`;

/** A rectangle drawn on from its top-left corner, clockwise. */
export function rectOn(x, y, w, h, p, attrs = "") {
  if (p <= 0) return "";
  const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
  return `<path d="${pathOf(pts)}" fill="none"${attrs}${drawOn(polyLength(pts), p)}/>`;
}

/** A labelled box, the circuit's and the flow's component. */
export function box(x, y, w, h, title, sub, {
  state = "idle", appear = 1, titleSize = 17, subSize = 13,
} = {}) {
  if (appear <= 0) return "";
  const lit = state === "lit";
  const dim = state === "offline";
  const stroke = lit || state === "failed" ? C.red : C.ink;
  const dash = state === "failed" || dim ? ' stroke-dasharray="7 5"' : "";
  return `<g${op(appear)}>
    <rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${lit ? C.redSoft : C.paper}" stroke="${stroke}" stroke-width="${lit ? 2.6 : 1.8}"${dash}${dim ? ' stroke-opacity="0.35"' : ""}/>
    ${label(x + w / 2, y + h / 2 + (sub ? -2 : titleSize * 0.35), title, { size: titleSize, anchor: "middle", fill: lit ? C.red : C.ink, opacity: dim ? 0.4 : 1 })}
    ${sub ? text(x + w / 2, y + h / 2 + subSize + 6, sub, { size: subSize, anchor: "middle", fill: C.soft, opacity: dim ? 0.4 : 1 }) : ""}
    ${state === "failed" || dim ? `<rect x="${n(x + w - 66)}" y="${n(y - 11)}" width="66" height="20" fill="${C.red}"/>${label(x + w - 33, y + 4, dim ? "offline" : "down", { size: 12, anchor: "middle", fill: C.paper })}` : ""}
  </g>`;
}

// --- the sheet ------------------------------------------------------------------

const GRID = `<defs>
  <pattern id="bp-grid-s" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="${C.ink}" stroke-opacity="0.05"/></pattern>
  <pattern id="bp-grid-l" width="120" height="120" patternUnits="userSpaceOnUse"><path d="M120 0H0V120" fill="none" stroke="${C.ink}" stroke-opacity="0.1"/></pattern>
  <pattern id="bp-hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="14" stroke="${C.red}" stroke-width="3" stroke-opacity="0.45"/></pattern>
</defs>`;

/** The caption for time `t` from `beats` ([{ at, text }]), crossfaded. */
export function captionAt(beats, t, end) {
  const i = beats.reduce((found, b, k) => (b.at <= t ? k : found), -1);
  if (i < 0) return { text: "", opacity: 0 };
  const next = beats[i + 1] ? beats[i + 1].at : end;
  return { text: beats[i].text, opacity: fade(t, beats[i].at, 0.35, next) };
}

/**
 * One full frame: the sheet (grid, border, registration marks), its header
 * and footer, the caption, and the body drawn by the scene.
 */
export function frame({
  body = "", sheet = null, title = null, series = null, rev = null, caption = null, border = 1, headerIn = 1,
}) {
  const perimeter = 2 * ((W - 48) + (H - 48));
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    GRID,
    `<rect width="${W}" height="${H}" fill="${C.paper}"/>`,
    `<rect width="${W}" height="${H}" fill="url(#bp-grid-s)"${op(border)}/>`,
    `<rect width="${W}" height="${H}" fill="url(#bp-grid-l)"${op(border)}/>`,
    `<rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="${C.ink}" stroke-width="2"${drawOn(perimeter, border)}/>`,
    `<rect x="32" y="32" width="${W - 64}" height="${H - 64}" fill="none" stroke="${C.ink}" stroke-opacity="0.2"${op(border)}/>`,
    `<path d="M22,46 V22 H46 M${W - 22},${H - 46} V${H - 22} H${W - 46}" fill="none" stroke="${C.red}" stroke-width="5"/>`,
  ];
  if (sheet) {
    parts.push(label(64, 96, `Sheet ${sheet}`, { size: 20, fill: C.red, opacity: headerIn }));
    parts.push(text(64, 158, title, { size: 56, font: FONT.serif, weight: 700, opacity: headerIn }));
  }
  if (series) {
    parts.push(label(W - 64, 92, "The Blueprint", { size: 16, anchor: "end", fill: C.soft, opacity: headerIn }));
    parts.push(label(W - 64, 120, series, { size: 16, anchor: "end", fill: C.red, opacity: headerIn }));
  }
  if (caption && caption.text && caption.opacity > 0) {
    const lines = wrap(caption.text, 54, 2);
    parts.push(`<rect x="64" y="${lines.length > 1 ? 916 : 934}" width="5" height="${lines.length > 1 ? 74 : 38}" fill="${C.red}"${op(caption.opacity)}/>`);
    lines.forEach((line, i) => parts.push(text(86, (lines.length > 1 ? 944 : 962) + i * 42, line, { size: 32, opacity: caption.opacity })));
  }
  parts.push(`<line x1="64" y1="1008" x2="${W - 64}" y2="1008" stroke="${C.ink}" stroke-opacity="0.18"/>`);
  parts.push(label(64, 1036, "sankettambare.in/blueprint", { size: 15, fill: C.soft }));
  if (rev) parts.push(label(W - 64, 1036, `Rev ${rev}`, { size: 15, anchor: "end", fill: C.soft }));
  parts.push(body, "</svg>");
  return parts.join("");
}
