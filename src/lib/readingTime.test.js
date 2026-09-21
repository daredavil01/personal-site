import { countWords, readingLabel, readingMinutes } from "./readingTime";

describe("readingTime", () => {
  it("counts whitespace-delimited words in either script", () => {
    expect(countWords("one two  three\nfour")).toBe(4);
    expect(countWords("मी आज धावलो")).toBe(3);
    expect(countWords("   ")).toBe(0);
    expect(countWords(null)).toBe(0);
  });

  it("rounds to whole minutes and never returns a fraction", () => {
    expect(readingMinutes(1039)).toBe(5);
    expect(readingMinutes(200)).toBe(1);
  });

  it("floors a short post at one minute rather than zero", () => {
    expect(readingMinutes(12)).toBe(1);
  });

  it("says nothing at all when there are no words", () => {
    expect(readingMinutes(0)).toBe(0);
    expect(readingMinutes(undefined)).toBe(0);
    expect(readingLabel(0)).toBe("");
    expect(readingLabel("nonsense")).toBe("");
  });

  it("labels a real post", () => {
    expect(readingLabel(1039)).toBe("5 min read");
  });
});
