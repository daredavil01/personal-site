import {
  buildSharePrompt, parseShareSuggestions, pickShareFromJev, shareQuestions, shareState,
} from "./shareSuggest";

describe("shareSuggest", () => {
  it("builds a prompt holding the post and the catalogue", () => {
    const p = buildSharePrompt({
      kind: "microblog", text: "x".repeat(5000), lang: "mr", hasImage: false, tags: ["running"],
    });
    expect(p).toMatch("Language: Marathi");
    expect(p).toMatch("- starfield:");
    expect(p).toMatch("- ticket:");
    expect(p.length).toBeLessThan(12000);
  });

  it("keeps only drawable designs and drops invented ids", () => {
    const out = parseShareSuggestions({
      designs: [
        { theme: "warli", layout: "poster", pairing: "bebas", accent: "#FFAA00", why: "bold", excerpt: "आज पाऊस" },
        { theme: "made-up", layout: "poster", pairing: "site" },
        { preset: "night-thought", why: "late" },
        { theme: "warli", layout: "poster", pairing: "bebas" },
        { theme: "film", layout: "polaroid", pairing: "instrument", excerpt: "not in text" },
      ],
    }, { text: "आज पाऊस आला.", lang: "mr", hasImage: false });
    expect(out).toHaveLength(3);
    expect(out[0].design).toMatchObject({
      theme: "warli", layout: "poster", pairing: "yatra", accent: "#ffaa00",
    });
    expect(out[0].excerpt).toBe("आज पाऊस");
    expect(out[1].design.theme).toBe("starfield");
    expect(out[2].design.layout).toBe("editorial");
    expect(out[2].excerpt).toBeNull();
  });

  it("survives garbage", () => {
    expect(parseShareSuggestions(null)).toEqual([]);
    expect(parseShareSuggestions({ designs: "no" })).toEqual([]);
  });

  it("asks Jev one question per preset and keeps the likeliest", () => {
    const { spec, names } = shareQuestions();
    expect(Object.keys(spec)).toHaveLength(Object.keys(names).length);
    const answers = { p0: { noul: 0.2 }, p1: { probability: 0.9 }, p2: { noul: 0.6 } };
    const picked = pickShareFromJev(answers, names, { lang: "en", hasImage: false });
    expect(picked.map((d) => d.id)).toEqual([`jev-${names.p1}`, `jev-${names.p2}`]);
    expect(picked[0].why).toMatch("90% fit");
    expect(shareState({ kind: "book", text: "t", lang: "en" }).language).toBe("English");
  });
});
