// Sheet A-02: the section. The building draws itself, then a red riser grows
// down through every floor one feature touches, calling out the file it
// touches on each — and then a second feature, which skips a floor.

import {
  C, drawOn, easeOut, fade, label, n, pathOf, polyLength, prog, rectOn, text, wrap,
} from "../draw.mjs";

const LEFT = 150;
const RIGHT = 600;
const ROOF_TOP = 236;
const EAVES = 312;
const FH = 96;
const RISER_X = 536;
const CALLOUT_X = 630;

/**
 * @param {object} d
 * @param {object[]} d.layers  LAYERS from features.js, top to bottom
 * @param {{ feature: object, at: number, until: number }[]} d.risers
 */
export function section({ layers, risers }) {
  const floors = layers.map((layer, i) => {
    if (i === 0) return { ...layer, top: ROOF_TOP, bottom: EAVES, mid: 288 };
    const top = EAVES + (i - 1) * FH;
    return { ...layer, top, bottom: top + FH, mid: top + FH / 2 };
  });
  const grade = floors.find((f) => f.id === "db").top;
  const base = floors[floors.length - 1].bottom;
  const roof = [[LEFT - 16, EAVES], [(LEFT + RIGHT) / 2, ROOF_TOP], [RIGHT + 16, EAVES], [LEFT - 16, EAVES]];

  const riser = ({ feature, at, until }, t) => {
    const touched = floors.filter((f) => feature.layers[f.id]);
    if (!touched.length) return "";
    const y1 = touched[0].mid;
    const y2 = touched[touched.length - 1].mid;
    const grow = 0.45 * touched.length + 0.4;
    const k = easeOut(prog(t, at, at + grow));
    const out = 1 - prog(t, until - 0.5, until);
    if (k <= 0 || out <= 0) return "";
    const tip = y1 + (y2 - y1) * k;
    const parts = [
      label(RISER_X, 206, `Riser ${feature.no} · ${feature.name}`, { size: 17, anchor: "middle", fill: C.red, opacity: fade(t, at, 0.4) }),
      `<rect x="${RISER_X - 9}" y="${n(y1 - 14)}" width="18" height="${n(tip - y1 + 28)}" rx="9" fill="${C.redSoft}" stroke="${C.red}" stroke-width="2.5"/>`,
      `<line x1="${RISER_X}" y1="${n(y1)}" x2="${RISER_X}" y2="${n(tip)}" stroke="${C.red}" stroke-width="3" stroke-dasharray="10 6" stroke-dashoffset="${n(-t * 40)}"/>`,
    ];
    floors.filter((f) => f.mid >= y1 && f.mid <= y2).forEach((f) => {
      const reachedAt = at + ((f.mid - y1) / Math.max(1, y2 - y1)) * grow;
      const o = fade(t, reachedAt, 0.35);
      if (o <= 0) return;
      const what = feature.layers[f.id];
      if (!what) {
        parts.push(label(CALLOUT_X, f.mid + 6, "passes through", { size: 15, fill: C.soft, opacity: o }));
        return;
      }
      const lines = wrap(what, 34, 2);
      parts.push(`<g opacity="${o.toFixed(3)}">
        <circle cx="${RISER_X}" cy="${n(f.mid)}" r="15" fill="none" stroke="${C.red}" stroke-width="2"/>
        <circle cx="${RISER_X}" cy="${n(f.mid)}" r="${n(8 * easeOut(prog(t, reachedAt, reachedAt + 0.3)))}" fill="${C.red}"/>
        <line x1="${RISER_X + 15}" y1="${n(f.mid)}" x2="${CALLOUT_X - 10}" y2="${n(f.mid)}" stroke="${C.red}" stroke-width="1.6"${drawOn(CALLOUT_X - RISER_X - 25, prog(t, reachedAt, reachedAt + 0.3))}/>
        ${label(CALLOUT_X, f.mid - 16, f.label, { size: 14, fill: C.red })}
        ${lines.map((line, i) => text(CALLOUT_X, f.mid + 8 + i * 22, line, { size: 18 })).join("")}
      </g>`);
    });
    return `<g opacity="${out.toFixed(3)}">${parts.join("")}</g>`;
  };

  return (t) => {
    const parts = [
      // Ground: hatched earth beside the building, from grade down.
      `<g opacity="${fade(t, 0.8, 0.6).toFixed(3)}">${Array.from({ length: 6 }, (_, i) => `<line x1="${92 + i * 8}" y1="${n(base + 30)}" x2="${104 + i * 8}" y2="${n(grade)}" stroke="${C.ink}" stroke-opacity="0.22"/>`).join("")}</g>`,
      `<line x1="86" y1="${grade}" x2="${RIGHT + 30}" y2="${grade}" stroke="${C.ink}" stroke-width="3.5"${drawOn(RIGHT - 56, prog(t, 0.6, 1.4))}/>`,
      // Roof and the two shells under it.
      `<path d="${pathOf(roof)}" fill="${C.fill}" stroke="${C.ink}" stroke-width="3"${drawOn(polyLength(roof), prog(t, 0, 1.2))}/>`,
      `<line x1="${(LEFT + RIGHT) / 2}" y1="${ROOF_TOP}" x2="${(LEFT + RIGHT) / 2}" y2="${EAVES}" stroke="${C.ink}" stroke-opacity="0.5" stroke-dasharray="5 5" opacity="${fade(t, 1.0).toFixed(3)}"/>`,
      label((LEFT * 3 + RIGHT) / 4 + 24, EAVES - 16, "Atlas", { size: 17, anchor: "middle", opacity: fade(t, 1.2) }),
      label((LEFT + RIGHT * 3) / 4 - 40, EAVES - 16, "Classic", { size: 17, anchor: "middle", opacity: fade(t, 1.3) }),
    ];

    floors.slice(1).forEach((f, i) => {
      const k = prog(t, 0.3 + i * 0.18, 1.1 + i * 0.18);
      parts.push(rectOn(LEFT, f.top, RIGHT - LEFT, FH, k, ` stroke="${C.ink}" stroke-width="2"`));
      parts.push(`<rect x="${LEFT - 7}" y="${f.bottom - 6}" width="${RIGHT - LEFT + 14}" height="6" fill="${C.ink}" fill-opacity="${f.top >= grade ? 0.9 : 0.55}" opacity="${fade(t, 0.8 + i * 0.18).toFixed(3)}"/>`);
      const o = fade(t, 1.2 + i * 0.12, 0.4);
      parts.push(label(LEFT + 36, f.top + 42, f.label, { size: 20, opacity: o }));
      parts.push(text(LEFT + 36, f.top + 68, f.note, { size: 16, fill: C.soft, opacity: o }));
    });
    [LEFT + 10, RIGHT - 20].forEach((x) => parts.push(`<rect x="${x}" y="${EAVES}" width="10" height="${base - EAVES}" fill="${C.fill}" stroke="${C.ink}" stroke-opacity="0.5" opacity="${fade(t, 1.0).toFixed(3)}"/>`));
    [LEFT + 15, RIGHT - 15].forEach((x) => parts.push(`<polygon points="${x - 30},${base + 26} ${x + 30},${base + 26} ${x + 14},${base} ${x - 14},${base}" fill="${C.fill}" stroke="${C.ink}" stroke-width="1.8" opacity="${fade(t, 1.2).toFixed(3)}"/>`));

    // Level marks: each floor's top, the roof's at the ridge.
    floors.forEach((f, i) => {
      const y = i === 0 ? ROOF_TOP : f.top;
      const o = fade(t, 1.0 + i * 0.08, 0.4);
      parts.push(`<g opacity="${o.toFixed(3)}"><line x1="40" y1="${y}" x2="${i === 0 ? (LEFT + RIGHT) / 2 - 16 : LEFT - 14}" y2="${y}" stroke="${C.ink}" stroke-opacity="0.22"/>
        <polygon points="44,${y - 11} 58,${y - 11} 51,${y}" fill="${C.ink}"/></g>`);
      parts.push(label(66, y - 4, f.level, { size: 14, fill: C.soft, opacity: o }));
    });

    risers.forEach((r) => parts.push(riser(r, t)));
    return parts.join("");
  };
}
