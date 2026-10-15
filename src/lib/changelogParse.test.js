import { parseBuffer } from "./changelogParse";

const entry = (v) => `## [${v}] — 2026-10-08\n\n### Fixed\n\n- **Thing** (\`a.js\`): fixed.\n`;

describe("parseBuffer", () => {
  it("returns the entries of a clean buffer", () => {
    expect(parseBuffer(entry("v1.0.1") + entry("v1.0.0")).map((e) => e.version)).toEqual(["v1.0.1", "v1.0.0"]);
  });

  it("refuses a version that appears twice", () => {
    expect(() => parseBuffer(entry("v1.0.1") + entry("v1.0.1") + entry("v1.0.0"))).toThrow("v1.0.1 appears more than once");
  });

  it("refuses a heading it could not parse", () => {
    expect(() => parseBuffer(`${entry("v1.0.1")}## [v1.0.0] — someday\n`)).toThrow("one is malformed");
  });
});
