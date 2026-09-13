import {
  applyFilters, EMPTY_FILTERS, summariseExchanges, toChats, toEvalsJsonl, toExchanges,
} from "./askConversations";

const msg = (id, conversationId, turnIndex, role, createdAt, extra = {}) => ({
  id,
  conversationId,
  turnIndex,
  role,
  createdAt,
  content: `${role} ${id}`,
  sessionId: `s${conversationId}`,
  tier: role === "assistant" ? "gemini" : null,
  model: null,
  provider: null,
  degraded: false,
  keywordOnly: false,
  totalMs: role === "assistant" ? 1000 * id : null,
  sourceCount: 2,
  sources: [{ entity_type: "book" }],
  tierErrors: [],
  feedback: null,
  feedbackTags: [],
  feedbackComment: null,
  ...extra,
});

// Session 1: two questions a minute apart, then one more two hours later.
// Session 2: one question.
const messages = [
  msg(1, 1, 0, "user", "2026-09-13T10:00:00Z"),
  msg(2, 1, 1, "assistant", "2026-09-13T10:00:05Z", { feedback: 1 }),
  msg(3, 1, 2, "user", "2026-09-13T10:01:00Z"),
  msg(4, 1, 3, "assistant", "2026-09-13T10:01:04Z", {
    feedback: -1, feedbackTags: ["missing data"], feedbackComment: "no ultra", sources: [{ entity_type: "sport" }],
  }),
  msg(5, 1, 4, "user", "2026-09-13T12:30:00Z"),
  msg(6, 1, 5, "assistant", "2026-09-13T12:30:03Z", { degraded: true, tier: "search-only" }),
  msg(7, 2, 0, "user", "2026-09-13T11:00:00Z"),
  msg(8, 2, 1, "assistant", "2026-09-13T11:00:02Z"),
];

describe("conversation log helpers", () => {
  const exchanges = toExchanges(messages);

  it("pairs every answer with the question before it", () => {
    expect(exchanges.map((e) => [e.question, e.answer.id])).toEqual([
      ["user 1", 2], ["user 3", 4], ["user 7", 8], ["user 5", 6],
    ]);
  });

  it("splits a session into separate chats at a long pause, newest chat first", () => {
    const chats = toChats(exchanges);
    expect(chats.map((c) => c.exchanges.map((e) => e.answer.id))).toEqual([[6], [8], [2, 4]]);
  });

  it("filters by feedback, source type and flags", () => {
    expect(applyFilters(exchanges, { ...EMPTY_FILTERS, feedback: "disliked" }).map((e) => e.id)).toEqual([4]);
    expect(applyFilters(exchanges, { ...EMPTY_FILTERS, sourceType: "sport" }).map((e) => e.id)).toEqual([4]);
    expect(applyFilters(exchanges, { ...EMPTY_FILTERS, degraded: "yes" }).map((e) => e.id)).toEqual([6]);
    expect(applyFilters(exchanges, { ...EMPTY_FILTERS, search: "ULTRA" }).map((e) => e.id)).toEqual([4]);
  });

  it("summarises satisfaction, latency and chats", () => {
    const s = summariseExchanges(exchanges);
    expect(s.questions).toBe(4);
    expect(s.chats).toBe(3);
    expect(s.satisfaction).toBe(50);
    expect(s.degraded).toBe(1);
    expect(s.feedbackTags).toEqual({ "missing data": 1 });
    expect(s.latency.max).toBe(8000);
  });

  it("exports only rated or commented exchanges as evals", () => {
    const lines = toEvalsJsonl(exchanges).split("\n").map((l) => JSON.parse(l));
    expect(lines.map((l) => l.rating)).toEqual([1, -1]);
    expect(lines[1].comment).toBe("no ultra");
  });
});
