import { ADAPTERS } from "./shareCardConfig";
import {
  PRESETS, designCatalogue, isKnown, localSuggestions, pairingForLang, postHour, presetDesign,
} from "./presets";
import { pairingFor, pairingSupports } from "./typography";

describe("presets", () => {
  it.each(PRESETS.map((p) => [p.id, p]))("%s references a real theme, layout and pairing", (id, p) => {
    expect(isKnown.theme(p.design.theme)).toBe(true);
    expect(isKnown.layout(p.design.layout)).toBe(true);
    expect(isKnown.pairing(p.design.pairing)).toBe(true);
  });

  it("swaps every preset onto a Devanagari pairing for Marathi", () => {
    PRESETS.forEach((p) => expect(pairingSupports(pairingFor(presetDesign(p, "mr").pairing), "mr")).toBe(true));
    expect(pairingForLang("bebas", "mr")).toBe("yatra");
    expect(pairingForLang("bebas", "en")).toBe("bebas");
  });

  it.each(Object.keys(ADAPTERS))("gives %s at least three suggestions", (kind) => {
    const s = localSuggestions(kind, { body: "A short line.", footerUrl: `x/${kind}` });
    expect(s.length).toBeGreaterThanOrEqual(3);
    s.forEach((x) => expect(x.why).toBeTruthy());
  });

  it("never suggests a polaroid without a photo or a ticket without numbers", () => {
    const s = localSuggestions("trek", { title: "Fort", footerUrl: "x" }, { limit: 20 });
    expect(s.some((x) => ["polaroid", "ticket"].includes(x.design.layout))).toBe(false);
  });

  it("reads the hour from a micro-post signature, either script", () => {
    expect(postHour("text\n#25:09:2021::11:37:pm")).toBe(23);
    expect(postHour("#३१:५:२०१९::३:५६:am")).toBe(3);
    expect(postHour("met at 11:30 pm")).toBeNull();
    const night = localSuggestions("microblog", { body: "quiet.\n#1:1:2020::11:50:pm", footerUrl: "a" });
    expect(night[0].id).toBe("night-thought");
  });

  it("puts Marathi presets first for Marathi posts", () => {
    const s = localSuggestions("microblog", { body: "आज पाऊस आला.", footerUrl: "b" }, { lang: "mr" });
    expect(["warli-tale", "paithani", "kolam-morning", "saffron-shout"]).toContain(s[0].id);
  });

  it("lists every id in the AI catalogue", () => {
    const cat = designCatalogue();
    expect(cat.presets).toHaveLength(PRESETS.length);
    expect(cat.themes.length).toBeGreaterThan(30);
    expect(cat.layouts).toHaveLength(10);
  });
});
