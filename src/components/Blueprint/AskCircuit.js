import React, { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_ASK_SETTINGS, DEFAULT_QUESTION_POOL, EMBEDDING_MODEL, SEARCH_ONLY_TIER,
} from "../../data/askConfig";

// Sheet A-03: the /ask pipeline drawn as a circuit (functions/api/ask.js).
// Send a question and the current runs through it stage by stage; open a
// switch on the model ladder, or take the embedding service offline, and watch
// it fall through to the next rung exactly the way the worker does. The rungs
// are the DEFAULT_ASK_SETTINGS ladder — the live order is rows in ask_settings.

const STEP_MS = 650;
const TIERS = DEFAULT_ASK_SETTINGS.tiers || [];
const MATCH = DEFAULT_ASK_SETTINGS.match_count;
const RUNG_Y = [90, 170, 250, 330];
const BUS_X = 630;
const OUT_X = 870;

const prefersReducedMotion = () => typeof window !== "undefined"
  && window.matchMedia
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The order the stages light in, and what each one logs, for the current
// switch positions. One stage can light several nodes (the search fans out).
export function circuitSequence({ question, embedDown, down }) {
  const steps = [
    { nodes: ["in"], log: `Q: "${question}"` },
    { nodes: ["gate"], log: "Settings read (cached 60 s). Quota reserved by ask_quota(), which fails closed." },
    embedDown
      ? { nodes: ["keyword", "facts"], log: "No embedding. hybrid_search runs keyword-only and nothing breaks." }
      : {
        nodes: ["keyword", "embed", "semantic", "facts"],
        log: `Embedded with ${EMBEDDING_MODEL}. Keyword and semantic halves run together; site_facts() loads alongside.`,
      },
    { nodes: ["rrf"], log: `Up to ${Math.min(MATCH * 3, 30)} candidates fused by reciprocal rank; matches under the floors dropped.` },
    { nodes: ["rerank"], log: `Type chips re-rank, never scope. Capped per entity, ${MATCH} kept.` },
  ];
  let answered = null;
  TIERS.forEach((tier, i) => {
    if (answered !== null) return;
    if (down.includes(i)) {
      steps.push({ nodes: [`rung-${i}`], failed: true, log: `${tier.name} unavailable: falling through to the next rung.` });
    } else {
      answered = i;
      steps.push({ nodes: [`rung-${i}`], log: `${tier.name} (${tier.model}) writes the answer.` });
    }
  });
  if (answered === null) {
    answered = TIERS.length;
    steps.push({ nodes: [`rung-${TIERS.length}`], log: "Every model is down: search-only, the sources without prose." });
  }
  steps.push(
    { nodes: ["sanitise"], log: "Links checked against what the archive supplied. Anything else is stripped." },
    { nodes: ["stream"], log: "Streamed as SSE: the source cards first, then the answer." },
    { nodes: ["log"], log: "ask_log() runs in waitUntil, after the response, so it never slows the answer." },
  );
  return { steps, answered };
}

const Box = ({
  x, y, w, h, title, sub, state,
}) => {
  const stroke = {
    idle: "bp-stroke", lit: "bp-stroke-red", failed: "bp-stroke-red", offline: "bp-stroke-faint",
  }[state];
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        className={`${state === "lit" ? "bp-fill-red-soft" : "bp-fill-paper"} ${stroke}`}
        strokeWidth={state === "lit" ? 2.2 : 1.6}
        strokeDasharray={state === "offline" || state === "failed" ? "5 4" : undefined}
      />
      <text x={x + w / 2} y={y + h / 2 - 3} textAnchor="middle" className={`bp-svg-label ${state === "lit" ? "bp-fill-red" : "bp-fill-ink"}`} fontSize="11" opacity={state === "offline" ? 0.45 : 1}>
        {title}
      </text>
      <text x={x + w / 2} y={y + h / 2 + 13} textAnchor="middle" className="bp-svg-mono bp-fill-soft" fontSize="10" opacity={state === "offline" ? 0.45 : 1}>
        {sub}
      </text>
      {(state === "offline" || state === "failed") && (
        <g>
          <rect x={x + w - 44} y={y - 8} width="44" height="14" className="bp-fill-red" />
          <text x={x + w - 22} y={y + 2} textAnchor="middle" className="bp-svg-mono bp-fill-paper" fontSize="9">
            {state === "failed" ? "DOWN" : "OFFLINE"}
          </text>
        </g>
      )}
    </g>
  );
};

const Wire = ({ d, lit, dead }) => (
  <path
    d={d}
    fill="none"
    className={`${lit ? "bp-stroke-red bp-flow" : "bp-stroke-soft"}`}
    strokeWidth={lit ? 2.4 : 1.5}
    strokeDasharray={dead && !lit ? "3 5" : undefined}
    opacity={dead && !lit ? 0.5 : 1}
  />
);

const activate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

const AskCircuit = () => {
  const [qIndex, setQIndex] = useState(() => Math.floor(Math.random() * DEFAULT_QUESTION_POOL.length));
  const [down, setDown] = useState([]);
  const [embedDown, setEmbedDown] = useState(false);
  const [phase, setPhase] = useState(-1);
  const question = DEFAULT_QUESTION_POOL[qIndex].q;

  const { steps, answered } = useMemo(
    () => circuitSequence({ question, embedDown, down }),
    [question, embedDown, down],
  );
  const running = phase >= 0 && phase < steps.length - 1;

  useEffect(() => {
    if (!running) return undefined;
    const t = setTimeout(() => setPhase((p) => p + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [running, phase]);

  const run = () => setPhase(prefersReducedMotion() ? steps.length - 1 : 0);
  // Moving a switch mid-run would light a path the run never took.
  const toggleTier = (i) => {
    setPhase(-1);
    setDown((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));
  };
  const toggleEmbed = () => {
    setPhase(-1);
    setEmbedDown((v) => !v);
  };
  const nextQuestion = () => {
    setPhase(-1);
    setQIndex((i) => (i + 1) % DEFAULT_QUESTION_POOL.length);
  };

  // node id -> "lit" | "failed", for everything the run has reached.
  const reached = useMemo(() => {
    const map = new Map();
    steps.slice(0, phase + 1).forEach((step) => step.nodes.forEach((n) => map.set(n, step.failed ? "failed" : "lit")));
    return map;
  }, [steps, phase]);
  const isLit = (id) => reached.get(id) === "lit";
  const tried = (id) => reached.has(id);
  const nodeState = (id) => {
    if ((id === "embed" || id === "semantic") && embedDown) return "offline";
    return reached.get(id) || "idle";
  };

  const rungs = [...TIERS.map((t) => ({ name: t.name, model: t.model })), { name: SEARCH_ONLY_TIER, model: "sources, no prose" }];
  const wires = [
    { id: "in", d: "M48,150 H72", lit: tried("gate") },
    { id: "split", d: "M182,150 H205", lit: tried("keyword") },
    { id: "kw", d: "M205,150 V90 H228", lit: tried("keyword") },
    { id: "emb", d: "M205,150 V210 H228", lit: isLit("embed"), dead: embedDown },
    { id: "sem", d: "M310,210 H326", lit: isLit("semantic"), dead: embedDown },
    { id: "kw-rrf", d: "M408,90 H450 V130", lit: tried("rrf") },
    { id: "sem-rrf", d: "M408,210 H450 V170", lit: tried("rrf") && !embedDown, dead: embedDown },
    { id: "rrf-out", d: "M470,150 H490", lit: tried("rerank") },
    { id: "facts", d: `M600,261 H${BUS_X}`, lit: tried("rerank") && tried("rung-0") },
    ...rungs.map((r, i) => ({ id: `in-${r.name}`, d: `M600,150 H${BUS_X} V${RUNG_Y[i]} H640`, lit: tried(`rung-${i}`) })),
    ...rungs.map((r, i) => ({
      id: `out-${r.name}`,
      d: `M850,${RUNG_Y[i]} H${OUT_X} V178 H885`,
      lit: answered === i && tried("sanitise"),
      dead: i < TIERS.length && down.includes(i),
    })),
    { id: "stream", d: "M937,206 V262", lit: tried("stream") },
    { id: "log", d: "M937,318 V368", lit: tried("log"), dead: true },
  ];
  const done = phase === steps.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="bp-panel flex flex-wrap items-center gap-3 p-3">
        <span className="bp-mono text-[10px] uppercase tracking-[0.2em] bp-red shrink-0">Input</span>
        <p className="font-body text-sm bp-ink m-0 flex-1 min-w-[12rem]">{question}</p>
        <button type="button" onClick={nextQuestion} className="bp-chip bp-mono text-[10px] uppercase tracking-wider px-2.5 py-1.5">
          Another question
        </button>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="bp-chip bp-chip-red bp-mono text-[10px] uppercase tracking-wider px-3 py-1.5"
          aria-pressed={running}
        >
          {done ? "Send it again" : "Send question ▸"}
        </button>
      </div>

      <div className="bp-scroll">
        <svg viewBox="0 0 1000 440" className="w-full min-w-[720px] h-auto block" role="img" aria-label="The /ask pipeline as a circuit diagram">
          {/* Wires first, so the boxes sit on them — and the lit ones last,
              because several rungs share the bus and an idle wire drawn
              after a lit one would paint over its shared segment. */}
          {wires
            .slice()
            .sort((a, b) => Number(a.lit) - Number(b.lit))
            .map((w) => <Wire key={w.id} d={w.d} lit={w.lit} dead={w.dead} />)}

          {/* Junction dots. */}
          {[[205, 150], [BUS_X, 150], [BUS_X, 261], [OUT_X, 178]].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" className="bp-fill-ink" />
          ))}

          {/* Input terminal. */}
          <circle cx="34" cy="150" r="14" className={`${tried("in") ? "bp-fill-red-soft bp-stroke-red" : "bp-fill-paper bp-stroke"}`} strokeWidth="2" />
          <text x="34" y="154" textAnchor="middle" className="bp-svg-label bp-fill-ink" fontSize="11">Q</text>
          <text x="34" y="182" textAnchor="middle" className="bp-svg-mono bp-fill-soft" fontSize="9">question</text>

          <Box x={72} y={122} w={110} h={56} title="Gate" sub="quota · turnstile" state={nodeState("gate")} />
          <Box x={228} y={62} w={180} h={56} title="Keyword" sub="tsvector · ts_rank_cd" state={nodeState("keyword")} />
          <Box x={228} y={182} w={82} h={56} title="Embed" sub="bge-m3" state={nodeState("embed")} />
          <Box x={326} y={182} w={82} h={56} title="Semantic" sub="pgvector" state={nodeState("semantic")} />

          {/* The fusion junction. */}
          <circle cx="450" cy="150" r="20" className={`${tried("rrf") ? "bp-fill-red-soft bp-stroke-red" : "bp-fill-paper bp-stroke"}`} strokeWidth="2" />
          <text x="450" y="154" textAnchor="middle" className="bp-svg-label bp-fill-ink" fontSize="10">RRF</text>

          <Box x={490} y={122} w={110} h={56} title="Re-rank" sub="chips · caps" state={nodeState("rerank")} />
          <Box x={490} y={236} w={110} h={50} title="Facts" sub="site_facts()" state={nodeState("facts")} />
          <text x="545" y="306" textAnchor="middle" className="bp-svg-mono bp-fill-soft" fontSize="9">rosters + counts</text>

          {/* The model ladder: a switch and a model on every rung. */}
          <text x={BUS_X + 10} y={48} className="bp-svg-label bp-fill-soft" fontSize="10">Model ladder</text>
          {rungs.map((r, i) => {
            const y = RUNG_Y[i];
            const switchable = i < TIERS.length;
            const isDown = switchable && down.includes(i);
            const state = reached.get(`rung-${i}`) || "idle";
            return (
              <g key={r.name}>
                {switchable ? (
                  <g
                    className="bp-hit"
                    role="switch"
                    tabIndex={0}
                    aria-checked={!isDown}
                    aria-label={`${r.name}: ${isDown ? "down" : "up"}. Toggle.`}
                    onClick={() => toggleTier(i)}
                    onKeyDown={activate(() => toggleTier(i))}
                  >
                    <rect className="bp-hit-shape" x="634" y={y - 22} width="40" height="34" />
                    <circle cx="642" cy={y} r="3" className="bp-fill-ink" />
                    <circle cx="668" cy={y} r="3" className="bp-fill-ink" />
                    <line
                      x1="642"
                      y1={y}
                      x2={isDown ? 662 : 668}
                      y2={isDown ? y - 16 : y}
                      className={isDown ? "bp-stroke-red" : "bp-stroke"}
                      strokeWidth="2.2"
                    />
                    <line x1="671" y1={y} x2="680" y2={y} className="bp-stroke-soft" strokeWidth="1.5" />
                  </g>
                ) : (
                  <line x1="640" y1={y} x2="680" y2={y} className="bp-stroke-soft" strokeWidth="1.5" strokeDasharray="2 3" />
                )}
                <Box
                  x={680}
                  y={y - 22}
                  w={170}
                  h={44}
                  title={`${i + 1} · ${r.name}`}
                  sub={r.model.length > 26 ? `${r.model.slice(0, 25)}…` : r.model}
                  state={isDown && state === "idle" ? "failed" : state}
                />
              </g>
            );
          })}

          <Box x={885} y={150} w={105} h={56} title="Sanitise" sub="archive links" state={nodeState("sanitise")} />
          <Box x={885} y={262} w={105} h={56} title="SSE stream" sub="sources first" state={nodeState("stream")} />
          <Box x={872} y={368} w={122} h={44} title="ask_log()" sub="after, waitUntil" state={nodeState("log")} />
        </svg>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-2">
          <p className="bp-mono text-[10px] uppercase tracking-[0.2em] bp-ink m-0">Service switches</p>
          <div className="flex flex-wrap gap-1.5">
            {TIERS.map((t, i) => (
              <button
                key={t.name}
                type="button"
                role="switch"
                aria-checked={!down.includes(i)}
                onClick={() => toggleTier(i)}
                className="bp-chip bp-mono text-[10px] uppercase tracking-wider px-2.5 py-1.5"
              >
                {`${down.includes(i) ? "○" : "●"} ${t.name}`}
              </button>
            ))}
            <button
              type="button"
              role="switch"
              aria-checked={!embedDown}
              onClick={toggleEmbed}
              className="bp-chip bp-mono text-[10px] uppercase tracking-wider px-2.5 py-1.5"
            >
              {`${embedDown ? "○" : "●"} embeddings`}
            </button>
          </div>
          <p className="font-body text-xs bp-soft m-0">
            Switch a rung off and send the question again. Failure is soft at every stage: no
            embedding means keyword-only, no model means search-only. The rungs shown are the
            fallback defaults; the live ladder is a row in <code className="bp-mono">ask_settings</code>.
          </p>
        </div>
        <ol className="bp-panel list-none m-0 p-3 min-h-[9rem] flex flex-col gap-1" aria-live="polite" aria-label="Circuit log">
          {phase < 0 && (
            <li className="bp-mono text-[11px] bp-soft">Waiting for a question…</li>
          )}
          {steps.slice(0, phase + 1).map((step, i) => (
            <li key={`${i}-${step.log}`} className={`bp-fade-in bp-mono text-[11px] leading-snug ${step.failed ? "bp-red" : "bp-ink"}`}>
              <span className="bp-soft mr-2">{String(i).padStart(2, "0")}</span>
              {step.log}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default AskCircuit;
