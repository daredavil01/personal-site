import { buildShareSnapshot, MAX_TURNS } from "./askShareSnapshot";

const user = (content) => ({ role: "user", content });
const answer = (content, extra = {}) => ({
  role: "assistant",
  content,
  sources: [{ entity_type: "trek", entity_id: 1, title: "Ghangad Fort", url: "/treks/1" }],
  linkable: ["/treks/1", "/treks/2"],
  ...extra,
});

const thread = [
  user("Which forts has he trekked?"),
  answer("He has climbed [Ghangad Fort](/treks/1) [1]."),
  user("Tell me about that one"),
  answer("An easy 1.5-hour trek.", { linkable: ["/treks/2", "/books/7"] }),
];

describe("buildShareSnapshot", () => {
  it("takes the title from the first question and the summary from the first answer", () => {
    const { ok, snapshot } = buildShareSnapshot(thread);
    expect(ok).toBe(true);
    expect(snapshot.title).toBe("Which forts has he trekked?");
    expect(snapshot.summary).toBe("He has climbed [Ghangad Fort](/treks/1) [1].");
    expect(snapshot.turnCount ?? snapshot.thread.length).toBe(4);
  });

  it("hoists one deduped linkable list for the whole share", () => {
    // Per-turn it is the same roster repeated — most of the row, for nothing.
    const { snapshot } = buildShareSnapshot(thread);
    expect(snapshot.linkable.sort()).toEqual(["/books/7", "/treks/1", "/treks/2"]);
  });

  it("drops the turn in flight rather than freezing a half-written answer", () => {
    const { snapshot } = buildShareSnapshot([
      ...thread, user("and the next?"), { role: "assistant", content: "", streaming: true },
    ]);
    expect(snapshot.thread).toHaveLength(5);
    expect(snapshot.thread.at(-1).role).toBe("user");
  });

  it("keeps only what a shared page renders", () => {
    const { snapshot } = buildShareSnapshot(thread);
    const a = snapshot.thread[1];
    expect(Object.keys(a).sort()).toEqual(["content", "feedback", "role", "scope", "sources", "widened"]);
    expect(a.sources[0].title).toBe("Ghangad Fort");
  });

  it("flags a refusal against the configured note, not a hardcoded phrase", () => {
    const refusalNote = "Nothing in the archive answers that.";
    const refused = [user("his age?"), answer("Nothing in the archive answers that.")];
    expect(buildShareSnapshot(refused, { refusalNote }).snapshot.hasRefusal).toBe(true);
    expect(buildShareSnapshot(thread, { refusalNote }).snapshot.hasRefusal).toBe(false);
    // No note configured must not mean "everything is a refusal".
    expect(buildShareSnapshot(refused).snapshot.hasRefusal).toBe(false);
  });

  it("flags a thumbs-down and a sourceless answer", () => {
    const rated = [
      user("q"), answer("a", { feedback: { rating: -1 } }),
      user("q2"), answer("a2", { sources: [] }),
    ];
    const { snapshot } = buildShareSnapshot(rated);
    expect(snapshot.hasDownvote).toBe(true);
    expect(snapshot.noSources).toBe(true);
    expect(snapshot.thread[1].feedback).toEqual({ rating: -1 });
  });

  it("carries the chips that were on", () => {
    expect(buildShareSnapshot(thread, { types: ["book", "book", "trek"] }).snapshot.types)
      .toEqual(["book", "trek"]);
  });

  it("refuses what cannot be shared, with a reason", () => {
    expect(buildShareSnapshot([]).reason).toBe("empty");
    expect(buildShareSnapshot([user("only a question")]).reason).toBe("no-answer");
    const long = Array.from({ length: MAX_TURNS + 1 }, (_, i) => (
      i % 2 ? answer(`a${i}`) : user(`q${i}`)
    ));
    expect(buildShareSnapshot(long).reason).toBe("too-long");
    expect(buildShareSnapshot([user("q"), answer("x".repeat(120000))]).reason).toBe("too-large");
  });
});
