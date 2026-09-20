import {
  applyFilters, EMPTY_FILTERS, isStaleGrade, lowConfidenceIds, regradeIds, sliceBatches,
  summariseExchanges,
  toChats, toEvalsJsonl, toExchanges, ungradedIds,
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

// --- the automatic judge (migration 0022) -----------------------------------

const graded = (id, extra) => msg(id, 9, 1, "assistant", "2026-09-19T10:00:00Z", {
  evalTags: [], evalAuto: {}, evalSource: null, ...extra,
});

describe("judge-graded rows", () => {
  const auto = graded(101, {
    evalSource: "auto",
    evalVerdict: "fail",
    evalScore: 2,
    evaluatedAt: "2026-09-19T11:00:00Z",
    evalAuto: { verdict: "fail", score: 2, confidence: 0.42, rubric: "r1" },
  });
  const byHand = graded(102, {
    evalSource: "human",
    evalVerdict: "pass",
    evalScore: 4,
    evaluatedAt: "2026-09-19T11:05:00Z",
    // A row the judge graded first and the owner then re-graded differently.
    evalAuto: { verdict: "fail", score: 2, confidence: 0.91, rubric: "r1" },
  });
  const ungraded = graded(103);
  const exchanges = toExchanges([msg(100, 9, 0, "user", "2026-09-19T09:59:00Z"), auto, byHand, ungraded]);

  it("filters by who graded it", () => {
    expect(applyFilters(exchanges, { ...EMPTY_FILTERS, evalSource: "auto" })
      .map((e) => e.answer.id)).toEqual([101]);
    expect(applyFilters(exchanges, { ...EMPTY_FILTERS, evalSource: "human" })
      .map((e) => e.answer.id)).toEqual([102]);
  });

  it("filters to the rows the judge was unsure about", () => {
    expect(applyFilters(exchanges, { ...EMPTY_FILTERS, confidence: "low" })
      .map((e) => e.answer.id)).toEqual([101]);
    // An ungraded row has no confidence, so it is in neither band.
    expect(applyFilters(exchanges, { ...EMPTY_FILTERS, confidence: "high" })
      .map((e) => e.answer.id)).toEqual([102]);
  });

  it("filters to the rows where the judge and the owner disagreed", () => {
    expect(applyFilters(exchanges, { ...EMPTY_FILTERS, evaluation: "disagreed" })
      .map((e) => e.answer.id)).toEqual([102]);
  });

  it("counts hand and machine grades separately and measures agreement", () => {
    const s = summariseExchanges(exchanges);
    expect(s.evaluatedAuto).toBe(1);
    expect(s.evaluatedByHand).toBe(1);
    expect(s.lowConfidence).toBe(1);
    // One row re-graded by hand, and the verdicts differed.
    expect(s.agreement).toEqual({ n: 1, agreed: 0, rate: 0 });
  });

  // Versions. The log this was written against was graded entirely by the
  // fallback rung at rubric r1, so both halves of "stale" matter here.
  const R2 = { rubric: "r2", model: "jev-1.13.0" };

  it("calls a grade stale when the rubric or the rung that made it has moved", () => {
    expect(isStaleGrade(auto, R2)).toBe(true);
    expect(isStaleGrade(auto, { rubric: "r1", model: "jev-1.13.0" })).toBe(true);
    expect(isStaleGrade(auto, { rubric: "r1" })).toBe(false);
    // Never graded at all is not stale — it is ungraded, and a different button.
    expect(isStaleGrade(ungraded.answer ? ungraded : { evalAuto: {} }, R2)).toBe(false);
  });

  it("filters to grades an older rubric produced", () => {
    expect(applyFilters(exchanges, { ...EMPTY_FILTERS, stale: "yes" }, R2)
      .map((e) => e.answer.id)).toEqual([101, 102]);
    expect(applyFilters(exchanges, { ...EMPTY_FILTERS, stale: "no" }, R2)
      .map((e) => e.answer.id)).toEqual([103]);
    // With no version in hand the page has no opinion about what current means.
    expect(applyFilters(exchanges, { ...EMPTY_FILTERS, stale: "yes" }, {})).toHaveLength(0);
  });

  it("counts out-of-date grades apart from ungraded ones", () => {
    expect(summariseExchanges(exchanges, R2).stale).toBe(2);
    expect(summariseExchanges(exchanges, R2).evaluated).toBe(2);
  });

  it("re-grades every answer, including the one the owner graded", () => {
    // The hand-graded row is the most valuable one in the set: re-grading it
    // writes eval_auto alone, and that is where the agreement number comes from.
    expect(regradeIds(exchanges).sort()).toEqual([101, 102, 103]);
  });

  it("reports no agreement number until something has been re-graded", () => {
    const only = toExchanges([msg(100, 9, 0, "user", "2026-09-19T09:59:00Z"), auto]);
    expect(summariseExchanges(only).agreement).toBeNull();
  });

  it("picks the newest ungraded answers, capped, for a run", () => {
    expect(ungradedIds(exchanges, 10)).toEqual([103]);
    expect(ungradedIds(exchanges, 0)).toEqual([]);
  });

  it("picks only the judge's own low-confidence rows to explain", () => {
    expect(lowConfidenceIds(exchanges)).toEqual([101]);
  });

  it("slices a run into requests the endpoint will accept", () => {
    expect(sliceBatches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    // A nonsense size must not loop forever.
    expect(sliceBatches([1, 2], 0)).toEqual([[1], [2]]);
  });

  it("carries a joinable id and the machine record into the evals export", () => {
    const line = JSON.parse(toEvalsJsonl(exchanges).split("\n")[0]);
    expect(line.message_id).toBe(101);
    expect(line.eval_source).toBe("auto");
    expect(line.eval_auto.rubric).toBe("r1");
  });
});
