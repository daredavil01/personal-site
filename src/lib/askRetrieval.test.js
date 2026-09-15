import { retrievalQuery, selectChunks } from "./askRetrieval";

// content_chunks rows keep their database spelling all the way to the worker.
const chunk = (type, id, index = 0) => ({
  entity_type: type,
  entity_id: id,
  chunk_index: index,
  title: `${type} ${id}`,
});

// A realistic global ranking for "which forts has he trekked?": the treks rank
// first, a couple of books trail behind on loose similarity.
const forts = [
  chunk("trek", 1), chunk("trek", 2), chunk("instagram", 9),
  chunk("book", 7), chunk("book", 8),
];

describe("selectChunks", () => {
  it("keeps only the chosen types when enough of them ranked", () => {
    const pool = [chunk("book", 1), chunk("book", 2), chunk("book", 3), chunk("trek", 4)];
    const { picked, widened } = selectChunks({ chunks: pool, types: ["book"], question: "latest book" });
    expect(widened).toBe(false);
    expect(picked.map((c) => c.entity_type)).toEqual(["book", "book", "book"]);
  });

  it("widens to everything when the chips fight the question", () => {
    // The Books chip on "which forts has he trekked?" — the log's #50 and #124.
    const { picked, widened } = selectChunks({
      chunks: forts, types: ["book"], question: "Which forts has he trekked?",
    });
    expect(widened).toBe(true);
    expect(picked.map((c) => c.entity_type)).toContain("trek");
  });

  it("sinks site and page chunks beneath real content", () => {
    const pool = [chunk("site", 1), chunk("page", 2), chunk("microblog", 3)];
    const { picked } = selectChunks({ chunks: pool, question: "What are the most recent micro posts?" });
    expect(picked[0].entity_type).toBe("microblog");
  });

  it("keeps them in place when the question is about the site", () => {
    const pool = [chunk("site", 1), chunk("microblog", 3)];
    const { picked } = selectChunks({ chunks: pool, question: "How did you build this second brain?" });
    expect(picked[0].entity_type).toBe("site");
  });

  it("caps how many chunks one entity may contribute", () => {
    const pool = [
      chunk("project", 1, 0), chunk("project", 1, 1), chunk("project", 1, 2),
      chunk("project", 1, 3), chunk("book", 2),
    ];
    const { picked } = selectChunks({ chunks: pool, question: "the E20 project", perEntity: 2 });
    expect(picked).toHaveLength(3);
    expect(picked.filter((c) => c.entity_id === 1)).toHaveLength(2);
  });

  it("honours the limit", () => {
    const pool = Array.from({ length: 20 }, (_, i) => chunk("book", i));
    expect(selectChunks({ chunks: pool, question: "books", limit: 8 }).picked).toHaveLength(8);
  });

  it("survives an empty result", () => {
    expect(selectChunks({ chunks: [], types: ["book"], question: "x" }))
      .toEqual({ picked: [], widened: true });
  });
});

describe("retrievalQuery", () => {
  it("carries the previous question into a short follow-up", () => {
    const history = [
      { role: "user", content: "Give me list of skill set" },
      { role: "assistant", content: "Python, Javascript…" },
    ];
    expect(retrievalQuery("Tell me more about Skills", history))
      .toBe("Give me list of skill set Tell me more about Skills");
  });

  it("leaves a question that stands on its own alone", () => {
    const long = "Tell me more about the Tata Ultra Marathon he ran at Lonavala in February 2026, and how it went";
    expect(retrievalQuery(long, [{ role: "user", content: "earlier" }])).toBe(long);
  });

  it("is a no-op without history", () => {
    expect(retrievalQuery("what books?", [])).toBe("what books?");
  });
});
