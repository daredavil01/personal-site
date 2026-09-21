import { langFor, pickVoice } from "./ReadAloud";

describe("ReadAloud voice choice", () => {
  it("asks for Marathi, then Hindi, for Devanagari text", () => {
    expect(langFor("मन शांत आहे")).toEqual(["mr", "hi"]);
  });

  it("asks for English otherwise", () => {
    expect(langFor("a quiet mind")).toEqual(["en"]);
  });

  it("prefers the first language that the device actually has", () => {
    const voices = [{ lang: "en-US" }, { lang: "hi-IN" }];
    expect(pickVoice(voices, ["mr", "hi"])).toEqual({ lang: "hi-IN" });
  });

  it("returns null when nothing matches, so no button is rendered", () => {
    expect(pickVoice([{ lang: "en-GB" }], ["mr", "hi"])).toBeNull();
    expect(pickVoice([], ["en"])).toBeNull();
  });
});
