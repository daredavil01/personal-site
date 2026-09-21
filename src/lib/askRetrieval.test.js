import {
  applyRerank, retrievalQuery, selectChunks, typesNamed,
} from "./askRetrieval";

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

  // The graded run's worst shape: eight micro-posts answering a trek question,
  // legal under perEntity because each was a different post.
  it("caps one type from taking every slot", () => {
    const pool = Array.from({ length: 8 }, (_, i) => chunk("microblog", i));
    const { picked } = selectChunks({
      chunks: pool, question: "Which forts has he trekked?", limit: 8,
    });
    expect(picked).toHaveLength(3);
  });

  it("lifts the cap for a type the question asked for", () => {
    const pool = Array.from({ length: 8 }, (_, i) => chunk("microblog", i));
    const { picked } = selectChunks({
      chunks: pool, question: "What are the most recent micro posts?", limit: 8,
    });
    expect(picked).toHaveLength(8);
  });

  it("lifts the cap for a type the chips asked for", () => {
    const pool = Array.from({ length: 8 }, (_, i) => chunk("book", i));
    const { picked } = selectChunks({
      chunks: pool, types: ["book"], question: "anything at all", limit: 8,
    });
    expect(picked).toHaveLength(8);
  });

  it("returns fewer than the limit rather than padding", () => {
    const { picked } = selectChunks({
      chunks: [chunk("trek", 1), chunk("trek", 2)], question: "forts", limit: 8,
    });
    expect(picked).toHaveLength(2);
  });
});

describe("typesNamed", () => {
  it("reads inflected English", () => {
    expect(typesNamed("Which forts has he trekked?")).toContain("trek");
    expect(typesNamed("How many marathons has he run?")).toContain("sport");
  });

  it("reads Marathi", () => {
    expect(typesNamed("त्याने कोणते किल्ले सर केले?")).toContain("trek");
    expect(typesNamed("मला पुस्तका विषयी माहिती सांग")).toContain("book");
  });

  it("names nothing for a question about no type in particular", () => {
    expect(typesNamed("What does he think about privacy?")).toEqual([]);
    expect(typesNamed("")).toEqual([]);
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

describe("applyRerank", () => {
  const chunks = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("reorders by the cross-encoder's ranking", () => {
    const out = applyRerank(chunks, [{ id: 2, score: 0.9 }, { id: 0, score: 0.4 }, { id: 1, score: 0.01 }]);
    expect(out.map((c) => c.id)).toEqual(["c", "a", "b"]);
  });

  it("keeps unscored chunks, in their old order, behind the scored ones", () => {
    const out = applyRerank(chunks, [{ id: 2, score: 0.9 }]);
    expect(out.map((c) => c.id)).toEqual(["c", "a", "b"]);
  });

  it("falls open to the original order when the answer is unusable", () => {
    expect(applyRerank(chunks, null).map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(applyRerank(chunks, []).map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(applyRerank(chunks, [{ id: 9 }, { id: -1 }]).map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("ignores a repeated index rather than duplicating a chunk", () => {
    const out = applyRerank(chunks, [{ id: 1 }, { id: 1 }]);
    expect(out.map((c) => c.id)).toEqual(["b", "a", "c"]);
  });
});

describe("borrowed micro-posts", () => {
  const micro = (id, kind) => ({
    ...chunk("microblog", id),
    body: `Micro post: p${id} | Date: 2019-01-01${kind ? ` | Kind: ${kind}` : ""} | words`,
  });

  it("sinks quotes, reblogs and links below his own posts", () => {
    const { picked } = selectChunks({
      chunks: [micro(1, "reblog"), micro(2, "quote"), micro(3, "own"), micro(4, "link")],
      types: [],
      // Names micro-posts, so MAX_PER_TYPE does not truncate the order.
      question: "what do his micro posts say about focus?",
      perEntity: 1,
    });
    expect(picked.map((c) => c.entity_id)).toEqual([3, 1, 2, 4]);
  });

  it("leaves unclassified posts where they were", () => {
    const { picked } = selectChunks({
      chunks: [micro(1, null), micro(2, "reblog"), micro(3, null)],
      types: [],
      question: "what does he think about focus?",
      perEntity: 1,
    });
    expect(picked.map((c) => c.entity_id)).toEqual([1, 3, 2]);
  });

  it("does not sink another type whose body happens to say reblog", () => {
    const blog = { ...chunk("blog", 5), body: "Blog: on the reblog habit | Kind: reblog" };
    const { picked } = selectChunks({
      chunks: [blog, micro(1, "own")],
      types: [],
      question: "what has he written?",
      perEntity: 1,
    });
    expect(picked.map((c) => c.entity_type)).toEqual(["blog", "microblog"]);
  });
});
