import {
  BASE_DESIGN, applyCase, cardText, defaultDesign, estimateSize, highlightSegments, languageOf, quoteWrap, sanitizeDesign, sentencesOf,
} from "./shareDesign";

describe("shareDesign", () => {
  it("detects Marathi by share of letters", () => {
    expect(languageOf("आज खूप पाऊस पडला आणि मी धावलो")).toBe("mr");
    expect(languageOf("A run in the rain, आज")).toBe("en");
  });

  it("opens each kind on a fitting layout and a script-safe pairing", () => {
    expect(defaultDesign("book", { body: "x" }).layout).toBe("index");
    expect(defaultDesign("sport", {}).layout).toBe("ticket");
    expect(defaultDesign("trek", { imageUrl: "a.jpg" }).layout).toBe("polaroid");
    expect(defaultDesign("microblog", { quote: true }).layout).toBe("pullquote");
    expect(defaultDesign("microblog", { body: "मराठी मजकूर इथे" }).pairing).toBe("tiro");
    expect(defaultDesign("ask", { body: "x" }).includeImage).toBe(false);
  });

  it("drops unknown values and Latin-only pairings on Marathi text", () => {
    const d = sanitizeDesign({
      theme: "nope", layout: "poster", pairing: "bebas", align: "diagonal", accent: "red", showTags: false,
    }, BASE_DESIGN, "mr");
    expect(d.theme).toBe("light");
    expect(d.layout).toBe("poster");
    expect(d.pairing).toBe("site");
    expect(d.align).toBe("left");
    expect(d.accent).toBeNull();
    expect(d.showTags).toBe(false);
    expect(sanitizeDesign({ pairing: "kalam", accent: "#ABCDEF" }, BASE_DESIGN, "mr")).toMatchObject({ pairing: "kalam", accent: "#abcdef" });
  });

  it("splits English and Marathi sentences, without duplicates", () => {
    expect(sentencesOf("One. Two! One.")).toEqual(["One.", "Two!"]);
    expect(sentencesOf("आज पाऊस आला। मी धावलो।")).toHaveLength(2);
  });

  it("marks only the first case-insensitive match", () => {
    expect(highlightSegments("The finish line, the finish", "FINISH")).toEqual([
      { text: "The ", mark: false }, { text: "finish", mark: true }, { text: " line, the finish", mark: false },
    ]);
    expect(highlightSegments("abc", "zz")).toEqual([{ text: "abc", mark: false }]);
  });

  it("changes case and wraps quotes", () => {
    expect(applyCase("hello world", "title")).toBe("Hello World");
    expect(applyCase("Hi", "upper")).toBe("HI");
    expect(quoteWrap("x", "guillemet")).toBe("«x»");
    expect(quoteWrap("x", "none")).toBe("x");
  });

  it("sizes type inside its bounds and shrinks as text grows", () => {
    const short = estimateSize({ chars: 30, boxW: 920, boxH: 700 });
    const long = estimateSize({ chars: 1500, boxW: 920, boxH: 700 });
    expect(short).toBe(72);
    expect(long).toBeLessThan(short);
    expect(long).toBeGreaterThanOrEqual(26);
    expect(estimateSize({ chars: 30, boxW: 920, boxH: 700, size: "s" })).toBeLessThan(short);
  });

  it("prefers edits over the model's text", () => {
    expect(cardText({ title: "T", body: "B" }, { body: "E" })).toEqual({ title: "T", body: "E" });
  });
});
