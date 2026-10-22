import { pickTags, tagQuestions, tagState } from "./assistTags";

describe("tag suggestions as Jev questions", () => {
  const vocab = [
    { name: "running", description: "Races and training" },
    { name: "किल्ले", description: "" },
    { name: "books" },
    { name: "" },
  ];

  it("asks one yes/no question per named tag, keyed by position", () => {
    const { spec, names } = tagQuestions(vocab);
    expect(Object.keys(spec)).toEqual(["t0", "t1", "t2"]);
    expect(spec.t0).toEqual({ type: "bool", instructions: 'The entry belongs under the tag "running" (Races and training)' });
    expect(names).toEqual({ t0: "running", t1: "किल्ले", t2: "books" });
  });

  it("splits by probability, drops tags already on the row, reads both answer shapes", () => {
    const { names } = tagQuestions(vocab);
    const answers = { t0: { noul: 0.92 }, t1: { probability: 0.55 }, t2: { noul: 0.1 } };
    expect(pickTags(answers, names)).toEqual({ suggested: ["running"], maybe: ["किल्ले"] });
    expect(pickTags(answers, names, ["Running"])).toEqual({ suggested: [], maybe: ["किल्ले"] });
  });

  it("keeps only scalar fields in the state", () => {
    expect(tagState("books", { title: "X", tags: ["a"], year: 2024, note: "" }))
      .toEqual({ content_type: "books", entry: { title: "X", year: "2024" } });
  });
});
