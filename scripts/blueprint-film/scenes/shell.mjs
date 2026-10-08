// Sheet A-05: the shell switch. Three visitors drop down the chute one after
// another; each falls past every rule with no opinion until one sends them to
// the Atlas or the Classic bin. Who goes where is decideShell() itself — the
// function shellLadder.test.js holds to resolveViewMode for every input.

import {
  C, FONT, along, ease, easeOut, fade, label, n, pathOf, polyLength, prog, text, wrap, drawOn,
} from "../draw.mjs";

export const VISIT = 4.2;
export const START = 0.6;

const CHUTE = 450;
const RULE_Y = [322, 394, 466, 538, 610];
const BIN = { atlas: 230, classic: 670 };
const BIN_Y = 724;

const showValue = (rule, i) => {
  switch (rule.id) {
    case "param": return i.param ? `?view=${i.param}` : "absent";
    case "stored": return i.storedView || "none saved";
    case "motion": return i.reducedMotion ? "reduce" : "no preference";
    case "preview": return i.preview ? "set" : "unset";
    default: return `"${i.defaultView}"`;
  }
};

const wireframe = (frame, o) => {
  const L = `fill="none" stroke="${C.ink}" stroke-opacity="0.62" stroke-width="1.6"`;
  const content = `<rect x="70" y="92" width="150" height="10" fill="${C.ink}" fill-opacity="0.7"/>
    ${[112, 124, 136].map((y) => `<rect x="70" y="${y}" width="${y === 136 ? 100 : 150}" height="5" fill="${C.ink}" fill-opacity="0.4"/>`).join("")}
    <rect x="70" y="148" width="150" height="30" ${L} stroke-dasharray="4 4"/>`;
  const inner = frame === "atlas"
    ? `<polyline points="0,74 34,48 62,62 100,30 134,58 168,36 210,64 244,42 296,70" ${L}/>
       <circle cx="252" cy="22" r="10" ${L}/>
       ${label(14, 20, "Map › Region", { size: 10, fill: C.soft })}
       <line x1="0" y1="80" x2="296" y2="80" ${L}/>${content}
       <circle cx="268" cy="104" r="11" fill="none" stroke="${C.red}" stroke-width="2"/>
       ${[128, 148, 168].map((y) => `<circle cx="268" cy="${y}" r="6" ${L}/>`).join("")}
       <circle cx="22" cy="188" r="11" fill="none" stroke="${C.red}" stroke-width="2"/>`
    : `<line x1="0" y1="26" x2="296" y2="26" ${L}/><rect x="12" y="10" width="56" height="6" fill="${C.ink}" fill-opacity="0.7"/>
       ${[160, 192, 224, 256].map((x) => `<rect x="${x}" y="12" width="22" height="4" fill="${C.ink}" fill-opacity="0.45"/>`).join("")}
       <line x1="240" y1="26" x2="240" y2="180" ${L}/><circle cx="268" cy="56" r="14" ${L}/>
       ${[82, 92, 102].map((y) => `<rect x="252" y="${y}" width="32" height="4" fill="${C.ink}" fill-opacity="0.45"/>`).join("")}
       ${content}<line x1="0" y1="186" x2="296" y2="186" ${L}/>`;
  return `<g transform="translate(710,276)" opacity="${o.toFixed(3)}"><rect x="0" y="0" width="296" height="206" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>${inner}</g>`;
};

/**
 * @param {object} d
 * @param {object[]} d.rules  SHELL_RULES
 * @param {(i: object) => { index: number, rule: object, shell: string }} d.decide  decideShell
 * @param {{ who: string, inputs: object }[]} d.visitors
 */
export function shell({ rules, decide, visitors }) {
  const runs = visitors.map((v) => {
    const { index, shell: to } = decide(v.inputs);
    const lane = to === "atlas" ? CHUTE - 32 : CHUTE + 32;
    const gate = RULE_Y[index];
    const pts = [[CHUTE, 250], [CHUTE, gate], [lane, gate + 22], [lane, 680], [BIN[to], BIN_Y - 8]];
    return { ...v, index, to, pts, len: polyLength(pts) };
  });

  return (t) => {
    const vi = Math.max(0, Math.min(runs.length - 1, Math.floor((t - START) / VISIT)));
    const run = runs[vi];
    const u = t - START - vi * VISIT;
    const last = vi === runs.length - 1;
    const out = last ? 1 : 1 - prog(u, VISIT - 0.3, VISIT);
    const k = ease(prog(u, 0.4, 2.2));
    const [bx, by] = along(run.pts, k);
    const parts = [];

    // Who is arriving.
    const vo = Math.min(fade(t, START + vi * VISIT, 0.3), out);
    parts.push(label(64, 214, `Visitor ${vi + 1} of ${runs.length}`, { size: 16, fill: C.red, opacity: vo }));
    parts.push(text(64, 248, run.who, { size: 22, opacity: vo }));

    // The chute and its rules.
    const base = fade(t, 0, 0.5);
    parts.push(`<g opacity="${base.toFixed(3)}">
      <path d="M408,224 L${CHUTE - 12},258 M492,224 L${CHUTE + 12},258" fill="none" stroke="${C.ink}" stroke-width="2.4"/>
      <line x1="${CHUTE - 12}" y1="258" x2="${CHUTE - 12}" y2="650" stroke="${C.ink}" stroke-width="2.4"/>
      <line x1="${CHUTE + 12}" y1="258" x2="${CHUTE + 12}" y2="650" stroke="${C.ink}" stroke-width="2.4"/>
    </g>`);
    rules.forEach((rule, i) => {
      const y = RULE_Y[i];
      const winner = i === run.index;
      const passed = by >= y + 4 || k > 0.6;
      let status = "";
      if (winner && by >= y - 2) status = `decides: ${run.to}`;
      else if (i < run.index && passed) status = "no opinion, pass";
      else if (i > run.index && k >= 1) status = "never asked";
      const dim = i > run.index && k >= 1 ? 0.4 : 1;
      parts.push(label(408, y - 4, `${i + 1} · ${rule.label}`, { size: 16, anchor: "end", fill: winner && status ? C.red : C.ink, opacity: base * dim }));
      parts.push(text(408, y + 20, showValue(rule, run.inputs), { size: 16, anchor: "end", fill: C.soft, opacity: vo * dim }));
      if (status) parts.push(text(CHUTE + 46, y + 6, status, { size: 16, fill: winner ? C.red : C.soft, opacity: out * dim }));
      if (winner && by >= y - 2) {
        const left = run.to === "atlas";
        parts.push(`<line x1="${left ? CHUTE + 12 : CHUTE - 12}" y1="${y - 16}" x2="${left ? CHUTE - 12 : CHUTE + 12}" y2="${y + 8}" stroke="${C.red}" stroke-width="4.5" opacity="${out.toFixed(3)}"/>`);
      } else {
        parts.push(`<path d="M${CHUTE - 20},${y} H${CHUTE - 12} M${CHUTE + 12},${y} H${CHUTE + 20}" stroke="${C.ink}" stroke-opacity="0.55" stroke-width="2.4" opacity="${base.toFixed(3)}"/>`);
      }
    });

    // Bins, with a tally of everyone who has landed so far.
    Object.entries(BIN).forEach(([name, x]) => {
      const landed = runs.filter((r, i) => r.to === name && (i < vi || (i === vi && k >= 1))).length;
      const hot = run.to === name && k >= 1;
      parts.push(`<path d="M${x - 110},${BIN_Y} V${BIN_Y + 78} H${x + 110} V${BIN_Y}" fill="${hot ? C.redSoft : "none"}" stroke="${hot ? C.red : C.ink}" stroke-width="${hot ? 3.5 : 2.4}" opacity="${base.toFixed(3)}"/>`);
      parts.push(label(x - 92, BIN_Y + 60, name, { size: 18, fill: hot ? C.red : C.soft, opacity: base }));
      parts.push(text(x + 92, BIN_Y + 62, String(landed), {
        size: 44, font: FONT.serif, weight: 700, anchor: "end", fill: hot ? C.red : C.ink, opacity: base,
      }));
    });

    // The visitor's path and the visitor.
    if (k > 0) {
      parts.push(`<path d="${pathOf(run.pts)}" fill="none" stroke="${C.red}" stroke-width="3"${drawOn(run.len, k)} opacity="${out.toFixed(3)}"/>`);
      parts.push(`<circle cx="${n(bx)}" cy="${n(by)}" r="11" fill="${C.red}" opacity="${out.toFixed(3)}"/>`);
    }

    // What they get: the shell's frame around the same content.
    const landedRuns = runs.filter((r, i) => i < vi || (i === vi && k >= 1));
    const shown = landedRuns[landedRuns.length - 1];
    if (shown) {
      const wo = shown === run ? easeOut(prog(u, 2.2, 2.6)) : 1;
      parts.push(wireframe(shown.to, wo * (shown === run ? out : 1)));
      const ro = shown === run ? fade(t, START + vi * VISIT + 2.3, 0.4) * out : 1;
      parts.push(label(710, 520, `${shown.to} shell · rule ${shown.index + 1}`, { size: 16, fill: C.red, opacity: ro }));
      wrap(shown.to === "atlas"
        ? "The page under its region's band, with the compass, passport and return portal."
        : "The page in the editorial frame: navigation, sidebar, footer.", 34, 3)
        .forEach((l, i) => parts.push(text(710, 552 + i * 26, l, { size: 19, fill: C.soft, opacity: ro })));
    }
    return parts.join("");
  };
}
