// The cover (sheet A-00), the episode title cards, and the end card.

import {
  C, FONT, H, W, drawOn, easeOut, fade, label, n, prog, text, wrap,
} from "../draw.mjs";

// --- cover: the stack as an exploded axonometric --------------------------------

const COS = Math.cos(Math.PI / 6);
const CX = 300;
const CY = 650;
const SW = 250;
const SD = 175;
const T = 14;
const GAP = 54;

const iso = (x, y, z) => [CX + (x - y) * COS, CY + (x + y) * 0.5 - z];
const pts = (list) => list.map(([x, y]) => `${n(x)},${n(y)}`).join(" ");

export function cover({ layers, riserLayers }) {
  const slabs = layers.map((layer, i) => {
    const z = (layers.length - 1 - i) * GAP;
    return {
      layer,
      z,
      // Built from the ground up: the foundation lands first.
      at: 1.6 + (layers.length - 1 - i) * 0.36,
    };
  });

  return (t) => {
    const parts = [
      label(64, 132, "Sheet A-00 · Cover", { size: 20, fill: C.red, opacity: fade(t, 0.3) }),
      text(64, 246, "The Blueprint", {
        size: 104, font: FONT.serif, weight: 700, opacity: fade(t, 0.5, 0.6),
      }),
      text(66, 302, "How sankettambare.in is built,", { size: 32, fill: C.soft, opacity: fade(t, 0.9, 0.5) }),
      text(66, 344, "drawn as six sheets.", { size: 32, fill: C.soft, opacity: fade(t, 1.0, 0.5) }),
    ];

    // Bottom slab first, so each one above paints over the one below.
    slabs.slice().reverse().forEach(({ layer, z, at }) => {
      const k = easeOut(prog(t, at, at + 0.55));
      if (k <= 0) return;
      const lift = (1 - k) * -70;
      const p = (x, y) => {
        const [px, py] = iso(x, y, z);
        return [px, py + lift];
      };
      const a = p(0, 0);
      const b = p(SW, 0);
      const c = p(SW, SD);
      const d = p(0, SD);
      const down = ([x, y]) => [x, y + T];
      const reached = riserLayers.includes(layer.id);
      parts.push(`<g opacity="${k.toFixed(3)}">
        <polygon points="${pts([d, c, down(c), down(d)])}" fill="${C.ink}" fill-opacity="0.22" stroke="${C.ink}" stroke-width="1.4"/>
        <polygon points="${pts([c, b, down(b), down(c)])}" fill="${C.ink}" fill-opacity="0.12" stroke="${C.ink}" stroke-width="1.4"/>
        <polygon points="${pts([a, b, c, d])}" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>
        ${[0.25, 0.5, 0.75].map((f) => {
    const [x1, y1] = p(SW * 0.12, SD * f);
    const [x2, y2] = p(SW * 0.88, SD * f);
    return `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${C.ink}" stroke-opacity="0.18"/>`;
  }).join("")}
        <line x1="${n(b[0] + 6)}" y1="${n(b[1] + T / 2)}" x2="590" y2="${n(b[1] + T / 2)}" stroke="${C.ink}" stroke-opacity="0.3"/>
        ${label(602, b[1] + T / 2 + 7, `${layer.level} · ${layer.label}`, { size: 20, fill: reached ? C.ink : C.soft })}
        ${text(604, b[1] + T / 2 + 34, layer.note, { size: 17, fill: C.soft })}
      </g>`);
    });

    // The riser: one feature threaded down every slab it touches.
    const centres = slabs
      .filter(({ layer }) => riserLayers.includes(layer.id))
      .map(({ z }) => iso(SW / 2, SD / 2, z));
    if (centres.length > 1) {
      const k = prog(t, 4.0, 5.2);
      const [x1, y1] = centres[0];
      const [, y2] = centres[centres.length - 1];
      const len = y2 - y1;
      if (k > 0) {
        parts.push(`<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x1)}" y2="${n(y2)}" stroke="${C.red}" stroke-width="4"${drawOn(len, k)}/>`);
        centres.forEach(([x, y]) => {
          const on = prog(t, 4.0 + ((y - y1) / len) * 1.2, 4.2 + ((y - y1) / len) * 1.2);
          if (on > 0) parts.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(7 * easeOut(on))}" fill="${C.red}"/>`);
        });
        parts.push(label(x1 + 16, y1 - 14, "Riser 102 · Ask", { size: 15, fill: C.red, opacity: fade(t, 4.6) }));
      }
    }
    return parts.join("");
  };
}

// --- episode title cards ------------------------------------------------------

export function episodeCard({ no, total, sheet, title, line }) {
  const num = String(no).padStart(2, "0");
  // Composed at t = 0, so the first frame doubles as the episode's thumbnail.
  return (t) => {
    const slide = (1 - easeOut(prog(t, 0, 0.7))) * -40;
    const lines = wrap(line, 34, 2);
    return [
      label(64, 150, `The Blueprint · episode ${num} of ${String(total).padStart(2, "0")}`, { size: 20, fill: C.soft }),
      label(64, 186, `Sheet ${sheet}`, { size: 20, fill: C.red }),
      text(56 + slide, 560, num, { size: 330, font: FONT.serif, weight: 700, fill: C.red }),
      `<line x1="64" y1="612" x2="${W - 64}" y2="612" stroke="${C.red}" stroke-width="4"${drawOn(W - 128, prog(t, 0.1, 1.0))}/>`,
      text(64, 718, title, { size: 96, font: FONT.serif, weight: 700 }),
      ...lines.map((l, i) => text(66, 790 + i * 48, l, { size: 38, fill: C.soft })),
    ].join("");
  };
}

// --- end card -------------------------------------------------------------------

export function endCard({ date, releases, rev }) {
  return (t) => [
    label(64, 150, "The Blueprint", { size: 20, fill: C.red }),
    text(64, 400, "Every drawing", { size: 92, font: FONT.serif, weight: 700, opacity: fade(t, 0.1, 0.5) }),
    text(64, 500, "is live.", { size: 92, font: FONT.serif, weight: 700, opacity: fade(t, 0.3, 0.5) }),
    text(66, 590, "Select the rooms, throw the switches,", { size: 36, fill: C.soft, opacity: fade(t, 0.7, 0.5) }),
    text(66, 636, "follow the riser down the stack.", { size: 36, fill: C.soft, opacity: fade(t, 0.8, 0.5) }),
    `<rect x="64" y="${H - 352}" width="${W - 128}" height="96" fill="${C.redSoft}" stroke="${C.red}" stroke-width="2.5"${fade(t, 1.2, 0.5) < 1 ? ` opacity="${fade(t, 1.2, 0.5).toFixed(3)}"` : ""}/>`,
    label(W / 2, H - 290, "sankettambare.in/blueprint", {
      size: 40, anchor: "middle", fill: C.red, opacity: fade(t, 1.2, 0.5),
    }),
    text(W / 2, H - 200, [
      "Numbers drawn from the live site",
      date,
      releases ? `${releases.toLocaleString("en-IN")} releases` : null,
      rev ? `rev ${rev}` : null,
    ].filter(Boolean).join(" · "), {
      size: 22, anchor: "middle", fill: C.soft, opacity: fade(t, 1.6, 0.5),
    }),
  ].join("");
}
