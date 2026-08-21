import { resolveViewMode } from "./useViewMode";

const base = {
  param: null,
  storedView: null,
  reducedMotion: false,
  preview: false,
  defaultView: "classic",
};

describe("resolveViewMode priority order", () => {
  it("defaults to classic when nothing else applies", () => {
    expect(resolveViewMode(base)).toBe("classic");
  });

  it("defaults to atlas when DEFAULT_VIEW says so", () => {
    expect(resolveViewMode({ ...base, defaultView: "atlas" })).toBe("atlas");
  });

  it("1: URL param beats everything, both directions", () => {
    expect(resolveViewMode({
      ...base, param: "atlas", storedView: "classic", reducedMotion: true,
    })).toBe("atlas");
    expect(resolveViewMode({
      ...base, param: "classic", storedView: "atlas", preview: true, defaultView: "atlas",
    })).toBe("classic");
  });

  it("2: stored preference beats reduced-motion, preview, and the default", () => {
    expect(resolveViewMode({
      ...base, storedView: "atlas", reducedMotion: true,
    })).toBe("atlas");
    expect(resolveViewMode({
      ...base, storedView: "classic", preview: true, defaultView: "atlas",
    })).toBe("classic");
  });

  it("3: reduced motion forces classic over preview and the default", () => {
    expect(resolveViewMode({
      ...base, reducedMotion: true, preview: true, defaultView: "atlas",
    })).toBe("classic");
  });

  it("4: preview flag turns atlas on over a classic default", () => {
    expect(resolveViewMode({ ...base, preview: true })).toBe("atlas");
  });

  it("ignores junk param values", () => {
    expect(resolveViewMode({ ...base, param: "wat", defaultView: "atlas" })).toBe("atlas");
    expect(resolveViewMode({ ...base, param: "wat" })).toBe("classic");
  });
});
