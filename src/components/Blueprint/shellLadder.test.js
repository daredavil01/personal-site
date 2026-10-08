import { resolveViewMode } from "../../atlas/useViewMode";
import { SHELL_RULES, decideShell } from "./shellLadder";

// Every combination the five inputs can take.
const SHELLS = [null, "atlas", "classic"];
const BOOLS = [false, true];
const combos = [];
SHELLS.forEach((param) => SHELLS.forEach((storedView) => BOOLS.forEach((reducedMotion) => (
  BOOLS.forEach((preview) => ["atlas", "classic"].forEach((defaultView) => {
    combos.push({ param, storedView, reducedMotion, preview, defaultView });
  }))
))));

describe("the shell ladder drawn on /blueprint", () => {
  it("picks the same shell as resolveViewMode for every input", () => {
    expect(combos).toHaveLength(72);
    combos.forEach((inputs) => {
      expect({ inputs, shell: decideShell(inputs).shell })
        .toEqual({ inputs, shell: resolveViewMode(inputs) });
    });
  });

  it("names the rule that decided, in priority order", () => {
    expect(decideShell({ param: "atlas", storedView: "classic", reducedMotion: true }).rule.id).toBe("param");
    expect(decideShell({ storedView: "classic", preview: true }).rule.id).toBe("stored");
    expect(decideShell({ reducedMotion: true, preview: true }).rule.id).toBe("motion");
    expect(decideShell({ preview: true, defaultView: "classic" }).rule.id).toBe("preview");
    expect(decideShell({ defaultView: "classic" })).toMatchObject({ index: SHELL_RULES.length - 1, shell: "classic" });
  });
});
