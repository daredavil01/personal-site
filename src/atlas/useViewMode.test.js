import { resolveViewMode } from "./useViewMode";

const base = {
  param: null,
  storedView: null,
  reducedMotion: false,
  preview: false,
  atlasLive: false,
};

describe("resolveViewMode priority order", () => {
  it("defaults to classic pre-flip when nothing else applies", () => {
    expect(resolveViewMode(base)).toBe("classic");
  });

  it("defaults to atlas once ATLAS_LIVE flips", () => {
    expect(resolveViewMode({ ...base, atlasLive: true })).toBe("atlas");
  });

  it("1: URL param beats everything, both directions", () => {
    expect(resolveViewMode({
      ...base, param: "atlas", storedView: "classic", reducedMotion: true,
    })).toBe("atlas");
    expect(resolveViewMode({
      ...base, param: "classic", storedView: "atlas", preview: true, atlasLive: true,
    })).toBe("classic");
  });

  it("2: stored preference beats reduced-motion, preview, and the flag", () => {
    expect(resolveViewMode({
      ...base, storedView: "atlas", reducedMotion: true,
    })).toBe("atlas");
    expect(resolveViewMode({
      ...base, storedView: "classic", preview: true, atlasLive: true,
    })).toBe("classic");
  });

  it("3: reduced motion forces classic over preview and the flag", () => {
    expect(resolveViewMode({
      ...base, reducedMotion: true, preview: true, atlasLive: true,
    })).toBe("classic");
  });

  it("4: preview flag turns atlas on pre-flip", () => {
    expect(resolveViewMode({ ...base, preview: true })).toBe("atlas");
  });

  it("ignores junk param values", () => {
    expect(resolveViewMode({ ...base, param: "wat", atlasLive: true })).toBe("atlas");
    expect(resolveViewMode({ ...base, param: "wat" })).toBe("classic");
  });
});
