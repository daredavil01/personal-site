import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { DEFAULT_VIEW } from "../../config/featureFlags";
import { useWorld } from "../../atlas/world/WorldContext";
import useViewMode from "../../atlas/useViewMode";
import { SHELL_RULES, decideShell } from "./shellLadder";

// Sheet A-05: two shells, one content. Every page renders the same component
// inside either the Atlas or the Classic shell, and five rules — first match
// wins — decide which. Set the inputs and watch a visitor drop down the chute
// past every rule with no opinion until one sends them to a bin.

const GATE_Y = [86, 150, 214, 278, 342];
const CHUTE_X = 210;
const BIN_Y = 400;
const BIN = { atlas: 100, classic: 320 };

const showValue = (rule, inputs) => {
  switch (rule.id) {
    case "param": return inputs.param ? `?view=${inputs.param}` : "absent";
    case "stored": return inputs.storedView || "none saved";
    case "motion": return inputs.reducedMotion ? "reduce" : "no preference";
    case "preview": return inputs.preview ? "set" : "unset";
    default: return `"${inputs.defaultView}"`;
  }
};

const Chute = ({ inputs }) => {
  const { index, shell } = decideShell(inputs);
  const gateY = GATE_Y[index];
  const binX = BIN[shell];
  const toLeft = shell === "atlas";
  // Kicked out of the chute at the deciding gate, then down the side lane.
  const lane = toLeft ? CHUTE_X - 24 : CHUTE_X + 24;
  const trajectory = `M${CHUTE_X},28 V${gateY} L${lane},${gateY + 16} V372 L${binX},${BIN_Y - 6}`;
  return (
    <svg viewBox="0 0 420 470" className="w-full max-w-[460px] h-auto block mx-auto" role="img" aria-label={`Rule ${index + 1}, ${SHELL_RULES[index].label}, sends this visitor to the ${shell} shell`}>
      {/* Hopper and chute. */}
      <path d={`M${CHUTE_X - 40},6 L${CHUTE_X - 10},34 M${CHUTE_X + 40},6 L${CHUTE_X + 10},34`} className="bp-stroke" strokeWidth="2" fill="none" />
      <line x1={CHUTE_X - 10} y1={34} x2={CHUTE_X - 10} y2={372} className="bp-stroke" strokeWidth="2" />
      <line x1={CHUTE_X + 10} y1={34} x2={CHUTE_X + 10} y2={372} className="bp-stroke" strokeWidth="2" />
      <text x={CHUTE_X + 48} y={18} className="bp-svg-mono bp-fill-soft" fontSize="10">a visitor arrives</text>

      {SHELL_RULES.map((rule, i) => {
        const y = GATE_Y[i];
        const winner = i === index;
        const asked = i <= index;
        let status = "never asked";
        if (winner) status = `decides: ${shell}`;
        else if (asked) status = "no opinion, pass";
        return (
          <g key={rule.id} opacity={asked ? 1 : 0.4}>
            <text x={CHUTE_X - 40} y={y - 4} textAnchor="end" className={`bp-svg-label ${winner ? "bp-fill-red" : "bp-fill-ink"}`} fontSize="10">
              {`${i + 1} · ${rule.label}`}
            </text>
            <text x={CHUTE_X - 40} y={y + 11} textAnchor="end" className="bp-svg-mono bp-fill-soft" fontSize="10">
              {showValue(rule, inputs)}
            </text>
            <text x={CHUTE_X + 40} y={y + 4} className={`bp-svg-mono ${winner ? "bp-fill-red" : "bp-fill-soft"}`} fontSize="10">
              {status}
            </text>
            {winner ? (
              <line
                x1={toLeft ? CHUTE_X + 10 : CHUTE_X - 10}
                y1={y - 14}
                x2={toLeft ? CHUTE_X - 10 : CHUTE_X + 10}
                y2={y + 6}
                className="bp-stroke-red"
                strokeWidth="3.5"
              />
            ) : (
              <g>
                <line x1={CHUTE_X - 16} y1={y} x2={CHUTE_X - 10} y2={y} className="bp-stroke-soft" strokeWidth="2" />
                <line x1={CHUTE_X + 10} y1={y} x2={CHUTE_X + 16} y2={y} className="bp-stroke-soft" strokeWidth="2" />
              </g>
            )}
          </g>
        );
      })}

      {/* Bins. */}
      {Object.entries(BIN).map(([name, x]) => (
        <g key={name}>
          <path d={`M${x - 70},${BIN_Y} V${BIN_Y + 54} H${x + 70} V${BIN_Y}`} fill="none" className={name === shell ? "bp-stroke-red" : "bp-stroke"} strokeWidth={name === shell ? 3 : 2} />
          <text x={x} y={BIN_Y + 44} textAnchor="middle" className={`bp-svg-label ${name === shell ? "bp-fill-red" : "bp-fill-soft"}`} fontSize="13">
            {name}
          </text>
        </g>
      ))}

      {/* The visitor's path, redrawn whenever an input changes. */}
      <path key={trajectory} d={trajectory} pathLength="1" fill="none" className="bp-stroke-red bp-draw" strokeWidth="2.5" strokeDasharray="1" />
      <circle key={`ball-${trajectory}`} cx={binX} cy={BIN_Y + 18} r="9" className="bp-fill-red bp-fade-in" />
    </svg>
  );
};

// The two shells as wireframes: same content block, different frame.
const Wireframe = ({ shell }) => {
  const line = { className: "bp-stroke-soft", strokeWidth: 1.4, fill: "none" };
  const content = (
    <g>
      <rect x="60" y="78" width="120" height="8" className="bp-fill-ink" opacity="0.7" />
      {[94, 104, 114].map((y) => <rect key={y} x="60" y={y} width={y === 114 ? 80 : 120} height="4" className="bp-fill-soft" opacity="0.6" />)}
      <rect x="60" y="124" width="120" height="22" {...line} strokeDasharray="3 3" />
    </g>
  );
  if (shell === "atlas") {
    return (
      <svg viewBox="0 0 240 170" className="w-full h-auto block" role="img" aria-label="Wireframe of the Atlas shell">
        <rect x="1" y="1" width="238" height="168" {...line} className="bp-stroke" />
        <polyline points="1,62 30,40 52,52 84,24 112,48 140,30 176,54 204,36 239,58" {...line} className="bp-stroke" />
        <circle cx="200" cy="18" r="8" {...line} />
        <text x="12" y="16" className="bp-svg-mono bp-fill-soft" fontSize="8">Map › Region</text>
        <line x1="1" y1="66" x2="239" y2="66" {...line} />
        {content}
        <circle cx="216" cy="88" r="9" {...line} className="bp-stroke-red" />
        <path d="M216,81 L219,88 L216,95 L213,88 Z" className="bp-fill-red" />
        {[106, 122, 138].map((y) => <circle key={y} cx="216" cy={y} r="5" {...line} />)}
        <circle cx="18" cy="152" r="9" {...line} className="bp-stroke-red" />
        <text x="32" y="155" className="bp-svg-mono bp-fill-soft" fontSize="8">return to map</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 240 170" className="w-full h-auto block" role="img" aria-label="Wireframe of the Classic shell">
      <rect x="1" y="1" width="238" height="168" {...line} className="bp-stroke" />
      <line x1="1" y1="22" x2="239" y2="22" {...line} />
      <rect x="10" y="9" width="44" height="5" className="bp-fill-ink" opacity="0.7" />
      {[130, 158, 186, 214].map((x) => <rect key={x} x={x} y="10" width="18" height="3" className="bp-fill-soft" />)}
      <line x1="196" y1="22" x2="196" y2="150" {...line} />
      <circle cx="218" cy="48" r="12" {...line} />
      {[70, 78, 86].map((y) => <rect key={y} x="204" y={y} width="28" height="3" className="bp-fill-soft" />)}
      {content}
      <line x1="1" y1="150" x2="239" y2="150" {...line} />
      {[60, 100, 140].map((x) => <rect key={x} x={x} y="158" width="28" height="3" className="bp-fill-soft" />)}
    </svg>
  );
};

const Segmented = ({ label, options, value, onChange }) => (
  <div className="flex flex-col gap-1">
    <span className="bp-mono text-[10px] uppercase tracking-[0.18em] bp-soft">{label}</span>
    <div className="flex flex-wrap gap-1" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className="bp-chip bp-mono text-[10px] uppercase tracking-wider px-2 py-1"
        >
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

const SHELL_OPTIONS = [
  { value: null, label: "none" }, { value: "atlas", label: "atlas" }, { value: "classic", label: "classic" },
];
const ON_OFF = [{ value: false, label: "off" }, { value: true, label: "on" }];

const ShellResolver = () => {
  const location = useLocation();
  const { world, preview } = useWorld();
  const current = useViewMode();
  const other = current === "atlas" ? "classic" : "atlas";
  const [inputs, setInputs] = useState({
    param: null, storedView: null, reducedMotion: false, preview: false, defaultView: DEFAULT_VIEW,
  });
  const set = (key) => (value) => setInputs((i) => ({ ...i, [key]: value }));
  const { shell, rule } = decideShell(inputs);

  // The inputs this browser is actually presenting, read the same way
  // useViewMode reads them.
  const loadMine = () => {
    const raw = new URLSearchParams(location.search).get("view");
    setInputs({
      param: raw === "atlas" || raw === "classic" ? raw : null,
      storedView: world.view === "atlas" || world.view === "classic" ? world.view : null,
      reducedMotion: Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches),
      preview: Boolean(preview),
      defaultView: DEFAULT_VIEW,
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,0.8fr)] items-start">
      <div className="flex flex-col gap-3">
        <Segmented label="1 · ?view= in the URL" options={SHELL_OPTIONS} value={inputs.param} onChange={set("param")} />
        <Segmented label="2 · Stored choice" options={SHELL_OPTIONS} value={inputs.storedView} onChange={set("storedView")} />
        <Segmented label="3 · Reduced motion" options={ON_OFF} value={inputs.reducedMotion} onChange={set("reducedMotion")} />
        <Segmented label="4 · Preview flag" options={ON_OFF} value={inputs.preview} onChange={set("preview")} />
        <Segmented
          label={`5 · DEFAULT_VIEW (shipped: ${DEFAULT_VIEW})`}
          options={[{ value: "classic", label: "classic" }, { value: "atlas", label: "atlas" }]}
          value={inputs.defaultView}
          onChange={set("defaultView")}
        />
        <button
          type="button"
          onClick={loadMine}
          className="bp-chip bp-chip-red bp-mono text-[10px] uppercase tracking-wider px-3 py-1.5 self-start mt-1"
        >
          Load this browser's inputs
        </button>
      </div>

      <Chute inputs={inputs} />

      <div className="flex flex-col gap-3">
        <div key={shell} className="bp-panel bp-fade-in p-3">
          <Wireframe shell={shell} />
        </div>
        <p className="bp-mono text-[10px] uppercase tracking-[0.2em] bp-red m-0">
          {`${shell} shell · rule ${SHELL_RULES.indexOf(rule) + 1}`}
        </p>
        <p className="font-body text-sm bp-ink m-0">
          {shell === "atlas"
            ? "The page sits under its region's illustrated band, with the compass, passport and return portal over it."
            : "The page sits in the editorial frame: navigation bar, sidebar and footer."}
          {" "}
          The content in the middle is identical: PageShell is the only switch.
        </p>
        <p className="font-body text-xs bp-soft m-0">{rule.note}</p>
        <a
          href={`?view=${other}`}
          className="bp-chip bp-mono text-[10px] uppercase tracking-wider px-3 py-1.5 self-start no-underline"
        >
          {`You are in ${current}. Switch to ${other} (remembered)`}
        </a>
      </div>
    </div>
  );
};

export default ShellResolver;
