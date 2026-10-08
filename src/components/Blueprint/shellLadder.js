// The shell switch as an ordered ladder, for sheet A-05.
//
// resolveViewMode (src/atlas/useViewMode.js) answers WHICH shell a visitor
// gets; the drawing also needs to know which rule decided it, so it can show
// the visitor falling past every rung above. shellLadder.test.js checks this
// list against resolveViewMode for every combination of inputs, so the
// drawing cannot drift from the code that actually runs.

const isShell = (v) => v === "classic" || v === "atlas";

export const SHELL_RULES = [
  {
    id: "param",
    label: "?view= in the URL",
    note: "also remembered as the visitor's choice",
    decides: (i) => isShell(i.param),
    result: (i) => i.param,
  },
  {
    id: "stored",
    label: "Stored choice",
    note: "atlas.v1 view, set only by the visitor",
    decides: (i) => isShell(i.storedView),
    result: (i) => i.storedView,
  },
  {
    id: "motion",
    label: "Reduced motion",
    note: "prefers-reduced-motion sends classic",
    decides: (i) => Boolean(i.reducedMotion),
    result: () => "classic",
  },
  {
    id: "preview",
    label: "Preview flag",
    note: "atlas.preview, from the dark build",
    decides: (i) => Boolean(i.preview),
    result: () => "atlas",
  },
  {
    id: "default",
    label: "DEFAULT_VIEW",
    note: "src/config/featureFlags.js",
    decides: () => true,
    result: (i) => (i.defaultView === "atlas" ? "atlas" : "classic"),
  },
];

// The first rule with an opinion, and the shell it picks.
export function decideShell(inputs) {
  const index = SHELL_RULES.findIndex((rule) => rule.decides(inputs));
  return { index, rule: SHELL_RULES[index], shell: SHELL_RULES[index].result(inputs) };
}
