// Sheet A-03: the /ask pipeline as a circuit. A question goes in, the current
// runs stage by stage, the first model's switch is thrown open, and the
// answer falls through to the next rung — the sequence and its log lines are
// the page's own circuitSequence(), so the film and /blueprint cannot differ.

import {
  C, box, drawOn, easeOut, fade, label, n, pathOf, polyLength, prog, text, wrap,
} from "../draw.mjs";

export const RUN0 = 2.2;
export const STEP = 0.9;
export const stepTime = (i) => RUN0 + i * STEP;

const BUS_X = 716;
const OUT_X = 1034;
const RUNG_Y = [330, 412, 494, 576];
const CHAIN_Y = 770;

/**
 * @param {object} d
 * @param {string} d.question
 * @param {{ steps: object[], answered: number }} d.sequence  circuitSequence() output
 * @param {{ name: string, model: string }[]} d.rungs  the ladder, search-only last
 * @param {number[]} d.down  rungs thrown open during the run
 */
export function circuit({ question, sequence, rungs, down }) {
  const { steps, answered } = sequence;
  const failIndex = steps.findIndex((s) => s.failed);

  const wires = [
    { id: "q", pts: [[104, 330], [116, 330]], on: "gate" },
    { id: "split", pts: [[232, 330], [252, 330]], on: "keyword" },
    { id: "kw", pts: [[252, 330], [252, 260], [274, 260]], on: "keyword" },
    { id: "emb", pts: [[252, 330], [252, 400], [274, 400]], on: "embed" },
    { id: "sem", pts: [[360, 400], [370, 400]], on: "semantic" },
    { id: "kw-rrf", pts: [[470, 260], [512, 260], [512, 304]], on: "rrf" },
    { id: "sem-rrf", pts: [[470, 400], [512, 400], [512, 356]], on: "rrf" },
    { id: "rrf-out", pts: [[538, 330], [556, 330]], on: "rerank" },
    { id: "facts", pts: [[686, 438], [BUS_X, 438]], on: "rerank" },
    ...rungs.map((r, i) => ({ id: `in-${i}`, pts: [[686, 330], [BUS_X, 330], [BUS_X, RUNG_Y[i]], [726, RUNG_Y[i]]], on: `rung-${i}` })),
    ...rungs.map((r, i) => ({
      id: `out-${i}`, pts: [[1010, RUNG_Y[i]], [OUT_X, RUNG_Y[i]], [OUT_X, CHAIN_Y], [1010, CHAIN_Y]], on: "sanitise", only: i === answered,
    })),
    { id: "stream", pts: [[850, CHAIN_Y], [810, CHAIN_Y]], on: "stream" },
    { id: "log", pts: [[650, CHAIN_Y], [610, CHAIN_Y]], on: "log", dashed: true },
  ];

  return (t) => {
    const phase = t < RUN0 ? -1 : Math.min(steps.length - 1, Math.floor((t - RUN0) / STEP));
    const reached = new Map();
    steps.slice(0, phase + 1).forEach((s) => s.nodes.forEach((id) => reached.set(id, s.failed ? "failed" : "lit")));
    const state = (id) => reached.get(id) || "idle";
    const appear = (i) => fade(t, 0.1 + i * 0.07, 0.4);
    const parts = [];

    // The question.
    parts.push(`<rect x="64" y="186" width="952" height="50" fill="${C.panel}" stroke="${C.ink}" stroke-opacity="0.2" opacity="${fade(t, 0.8).toFixed(3)}"/>`);
    parts.push(label(84, 218, "Input", { size: 15, fill: C.red, opacity: fade(t, 0.8) }));
    const typed = Math.round(question.length * prog(t, 1.0, 1.9));
    parts.push(text(170, 219, question.slice(0, typed), { size: 22, opacity: fade(t, 1.0) }));

    // Wires: drawn on first, then lit red, current flowing, as the run reaches them.
    const ordered = wires
      .map((w, i) => ({ ...w, i, lit: reached.has(w.on) && (w.only === undefined || w.only) }))
      .sort((a, b) => Number(a.lit) - Number(b.lit));
    ordered.forEach((w) => {
      const d = pathOf(w.pts);
      if (w.lit) {
        parts.push(`<path d="${d}" fill="none" stroke="${C.red}" stroke-width="3.2" stroke-dasharray="10 6" stroke-dashoffset="${n(-t * 40)}"/>`);
      } else {
        const len = polyLength(w.pts);
        parts.push(`<path d="${d}" fill="none" stroke="${C.ink}" stroke-opacity="${w.dashed ? 0.4 : 0.55}" stroke-width="2"${w.dashed ? ' stroke-dasharray="4 6"' : drawOn(len, prog(t, 0.3 + w.i * 0.05, 1.0 + w.i * 0.05))}/>`);
      }
    });
    [[252, 330], [BUS_X, 330], [BUS_X, 438], [OUT_X, CHAIN_Y]].forEach(([x, y]) => parts.push(`<circle cx="${x}" cy="${y}" r="5" fill="${C.ink}" opacity="${fade(t, 1.0).toFixed(3)}"/>`));

    // Components.
    const inLit = reached.has("in");
    parts.push(`<g opacity="${appear(0).toFixed(3)}"><circle cx="84" cy="330" r="20" fill="${inLit ? C.redSoft : C.paper}" stroke="${inLit ? C.red : C.ink}" stroke-width="2.4"/>${label(84, 336, "Q", { size: 17, anchor: "middle" })}</g>`);
    parts.push(box(116, 302, 116, 56, "Gate", "quota, turnstile", { state: state("gate"), appear: appear(1), titleSize: 15, subSize: 12 }));
    parts.push(box(274, 232, 196, 56, "Keyword", "tsvector · ts_rank_cd", { state: state("keyword"), appear: appear(2), titleSize: 15, subSize: 12 }));
    parts.push(box(274, 372, 86, 56, "Embed", "bge-m3", { state: state("embed"), appear: appear(3), titleSize: 14, subSize: 12 }));
    parts.push(box(370, 372, 100, 56, "Semantic", "pgvector", { state: state("semantic"), appear: appear(4), titleSize: 13, subSize: 12 }));
    const rrfLit = reached.has("rrf");
    parts.push(`<g opacity="${appear(5).toFixed(3)}"><circle cx="512" cy="330" r="26" fill="${rrfLit ? C.redSoft : C.paper}" stroke="${rrfLit ? C.red : C.ink}" stroke-width="2.4"/>${label(512, 335, "RRF", { size: 14, anchor: "middle", fill: rrfLit ? C.red : C.ink })}</g>`);
    parts.push(box(556, 302, 130, 56, "Re-rank", "chips · caps", { state: state("rerank"), appear: appear(6), titleSize: 15, subSize: 12 }));
    parts.push(box(556, 412, 130, 52, "Facts", "site_facts()", { state: state("facts"), appear: appear(7), titleSize: 15, subSize: 12 }));
    parts.push(label(BUS_X + 10, 284, "Model ladder", { size: 14, fill: C.soft, opacity: appear(8) }));

    // The ladder: a switch and a model on every rung.
    rungs.forEach((r, i) => {
      const y = RUNG_Y[i];
      const switchable = i < rungs.length - 1;
      // A thrown switch swings open just before the current reaches it.
      const open = down.includes(i) ? easeOut(prog(t, stepTime(failIndex) - 0.55, stepTime(failIndex) - 0.25)) : 0;
      const o = appear(9 + i);
      if (switchable) {
        parts.push(`<g opacity="${o.toFixed(3)}">
          <circle cx="730" cy="${y}" r="4" fill="${C.ink}"/><circle cx="756" cy="${y}" r="4" fill="${C.ink}"/>
          <line x1="730" y1="${y}" x2="${n(756 - open * 6)}" y2="${n(y - open * 20)}" stroke="${open > 0 ? C.red : C.ink}" stroke-width="3"/>
          <line x1="760" y1="${y}" x2="766" y2="${y}" stroke="${C.ink}" stroke-opacity="0.55" stroke-width="2"/>
        </g>`);
      } else {
        parts.push(`<line x1="726" y1="${y}" x2="766" y2="${y}" stroke="${C.ink}" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="3 4" opacity="${o.toFixed(3)}"/>`);
      }
      let st = state(`rung-${i}`);
      if (st === "idle" && open > 0.5) st = "failed";
      parts.push(box(766, y - 28, 244, 56, r.name, r.model.length > 32 ? `${r.model.slice(0, 31)}…` : r.model, {
        state: st, appear: o, titleSize: 14, subSize: 12,
      }));
    });

    parts.push(box(850, CHAIN_Y - 28, 160, 56, "Sanitise", "archive links only", { state: state("sanitise"), appear: appear(13), titleSize: 15, subSize: 12 }));
    parts.push(box(650, CHAIN_Y - 28, 160, 56, "SSE stream", "sources first", { state: state("stream"), appear: appear(14), titleSize: 15, subSize: 12 }));
    parts.push(box(450, CHAIN_Y - 28, 160, 56, "ask_log()", "after, waitUntil", { state: state("log"), appear: appear(15), titleSize: 15, subSize: 12 }));

    // The log, typing itself out, newest at the bottom.
    const co = fade(t, 1.2);
    parts.push(`<rect x="64" y="470" width="456" height="252" fill="${C.panel}" stroke="${C.ink}" stroke-opacity="0.2" opacity="${co.toFixed(3)}"/>`);
    parts.push(label(84, 498, "Circuit log", { size: 13, fill: C.red, opacity: co }));
    const shown = steps.slice(0, phase + 1).map((s, i) => ({ ...s, i })).slice(-4);
    let y = 528;
    shown.forEach((s) => {
      const chars = Math.round(s.log.length * prog(t, stepTime(s.i), stepTime(s.i) + 0.45));
      wrap(s.log, 50, 2).forEach((line, li) => {
        const before = wrap(s.log, 50, 2).slice(0, li).join(" ").length + (li ? 1 : 0);
        const visible = line.slice(0, Math.max(0, chars - before));
        if (visible) parts.push(text(li ? 112 : 84, y, li ? visible : `${String(s.i).padStart(2, "0")}  ${visible}`, { size: 15, fill: s.failed ? C.red : C.ink }));
        y += 21;
      });
      y += 6;
    });
    return parts.join("");
  };
}
