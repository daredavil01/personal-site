import {
  ALL_THEME_IDS, FAMILIES, THEMES, contrast, themeFor, themeFromColor,
} from "./themes";

const TOKENS = ["id", "label", "family", "note", "base", "background", "ink", "muted", "accent", "rule", "chip", "panel", "logo", "signature"];

describe("share themes", () => {
  it("has at least 40 themes with unique ids", () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(39);
    expect(new Set(ALL_THEME_IDS).size).toBe(ALL_THEME_IDS.length);
  });

  it.each(THEMES.map((t) => [t.id, t]))("%s carries every token and a real family", (id, t) => {
    TOKENS.forEach((k) => expect(t[k]).toBeTruthy());
    expect(FAMILIES.some((f) => f.id === t.family)).toBe(true);
  });

  it.each(THEMES.map((t) => [t.id, t]))("%s text is legible on its ground", (id, t) => {
    expect(contrast(t.ink, t.base)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.muted, t.base)).toBeGreaterThanOrEqual(3);
  });

  it.each(["#b22200", "#0f766e", "#facc15", "#ffffff", "#000000", "#7c3aed"])("builds legible adaptive themes from %s", (hex) => {
    [true, false].forEach((dark) => {
      const t = themeFromColor(hex, { dark });
      expect(contrast(t.ink, t.base)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.accent, t.base)).toBeGreaterThanOrEqual(2.5);
    });
  });

  it("falls back to light for an unknown or unresolvable id", () => {
    expect(themeFor("nope").id).toBe("light");
    expect(themeFor("photo").id).toBe("light");
    expect(themeFor("photo", { photoColor: "#336699" }).family).toBe("adaptive");
  });
});
