import {
  buildJudgeState, deterministicFindings, estimateTokens, JUDGE_QUESTIONS,
  mapJudgeAnswers, normaliseAnswers, STATE_LIMITS, toGatewayQuestions, toNativeQuestions,
} from "./askJudge";

// A recorded Jev response, in the shape its docs publish. Every test below runs
// against this rather than the network, so the whole mapping layer is verifiable
// before any API key exists.
const goodAnswers = {
  grounding: { score: 1.92, probabilities: [0.02, 0.09, 0.89], confidence: 0.88 },
  contradiction: { noul: 0.04 },
  retrieval: { score: 1.85, probabilities: [0.03, 0.12, 0.85], confidence: 0.84 },
  disposition: {
    choice: "answered_supported",
    probabilities: {
      answered_supported: 0.91,
      answered_unsupported: 0.05,
      refused_wrongly: 0.02,
      refused_correctly: 0.02,
    },
    confidence: 0.9,
  },
  citations: { noul: 0.93 },
};

const withAnswers = (patch) => ({ ...goodAnswers, ...patch });

const sources = [{ entity_type: "trek", title: "Ghangad", url: "/treks/4", image: "/i/g.jpg" }];

describe("buildJudgeState", () => {
  it("clips every field to the documented limits and numbers the extracts", () => {
    const state = buildJudgeState({
      question: "q".repeat(900),
      answer: "a".repeat(9000),
      extracts: Array.from({ length: 20 }, (_, i) => ({
        type: "trek", title: `t${i}`, text: "x".repeat(4000),
      })),
    });
    expect(state.question.length).toBeLessThanOrEqual(STATE_LIMITS.question + 1);
    expect(state.answer.length).toBeLessThanOrEqual(STATE_LIMITS.answer + 1);
    expect(state.extracts).toHaveLength(STATE_LIMITS.extracts);
    expect(state.extracts[0].n).toBe(1);
    expect(state.extracts[0].text.length).toBeLessThanOrEqual(STATE_LIMITS.extract + 1);
    // State plus the longest question has to sit under Jev's 32k-token limit.
    expect(estimateTokens(state)).toBeLessThan(32000);
  });

  it("mentions the reader's filters only when there were some", () => {
    expect(buildJudgeState({ question: "q", answer: "a" }).note).toBeUndefined();
    expect(buildJudgeState({ question: "q", answer: "a", scoped: "books" }).note)
      .toContain("books");
  });

  it("leaves out everything the rubric does not bear on", () => {
    const state = buildJudgeState({ question: "q", answer: "a", extracts: [{ type: "book", title: "t", text: "b" }] });
    expect(Object.keys(state).sort()).toEqual(["answer", "extracts", "question"]);
    expect(Object.keys(state.extracts[0]).sort()).toEqual(["n", "text", "title", "type"]);
  });
});

describe("deterministicFindings", () => {
  it("costs no model call to catch a link the archive never supplied", () => {
    const answer = "He climbed [Ghangad](https://evil.example.com/x).";
    expect(deterministicFindings({ answer, sources })).toContain("bad-link");
  });

  it("passes an answer that only links what it was given", () => {
    const answer = "He climbed [Ghangad](/treks/4) [1].";
    expect(deterministicFindings({ answer, sources })).not.toContain("bad-link");
  });

  it("notes an answer that had nothing retrieved behind it", () => {
    expect(deterministicFindings({ answer: "Nothing found.", sources: [] }))
      .toContain("no-sources");
  });
});

describe("mapJudgeAnswers", () => {
  it("passes a grounded, supported answer and scores it high", () => {
    const out = mapJudgeAnswers(goodAnswers, { model: "jev-1.13.0" });
    expect(out.verdict).toBe("pass");
    expect(out.score).toBe(5);
    expect(out.tags).toContain("auto");
    expect(out.tags).not.toContain("needs-review");
    expect(out.auto.reason).toBeNull();
    expect(out.notes).toContain("jev-1.13.0");
  });

  it("fails an answer the extracts do not support, and calls it a hallucination", () => {
    const out = mapJudgeAnswers(withAnswers({
      grounding: { score: 0.3, probabilities: [0.7, 0.2, 0.1], confidence: 0.81 },
      disposition: {
        choice: "answered_unsupported",
        probabilities: { answered_unsupported: 0.86 },
        confidence: 0.85,
      },
    }));
    expect(out.verdict).toBe("fail");
    expect(out.tags).toEqual(expect.arrayContaining(["hallucination", "auto"]));
    expect(out.auto.reason).toBe("disposition");
  });

  it("fails a refusal the extracts could have answered, and calls it over-refusal", () => {
    const out = mapJudgeAnswers(withAnswers({
      disposition: {
        choice: "refused_wrongly",
        probabilities: { refused_wrongly: 0.78 },
        confidence: 0.76,
      },
    }));
    expect(out.verdict).toBe("fail");
    expect(out.tags).toContain("over-refusal");
  });

  it("passes a refusal the extracts genuinely could not answer", () => {
    const out = mapJudgeAnswers(withAnswers({
      retrieval: { score: 0.1, probabilities: [0.9, 0.06, 0.04], confidence: 0.87 },
      disposition: {
        choice: "refused_correctly",
        probabilities: { refused_correctly: 0.93 },
        confidence: 0.91,
      },
    }));
    expect(out.verdict).toBe("pass");
    expect(out.tags).toContain("wrong-source");
  });

  it("fails on a contradiction even when everything else looks fine", () => {
    const out = mapJudgeAnswers(withAnswers({ contradiction: { noul: 0.82 } }));
    expect(out.verdict).toBe("fail");
    expect(out.tags).toContain("contradiction");
    expect(out.auto.reason).toBe("contradiction");
  });

  it("fails on a deterministic bad link with no model opinion needed", () => {
    const out = mapJudgeAnswers(goodAnswers, { findings: ["bad-link"] });
    expect(out.verdict).toBe("fail");
    expect(out.tags).toContain("bad-link");
    expect(out.auto.reason).toBe("link");
    // The text itself is the evidence, so this is not a probability.
    expect(out.confidence).toBe(1);
  });

  it("flags a low-confidence verdict for review but still records pass or fail", () => {
    const out = mapJudgeAnswers(withAnswers({
      grounding: { score: 1.4, probabilities: [0.2, 0.4, 0.4], confidence: 0.41 },
      disposition: {
        choice: "answered_supported",
        probabilities: { answered_supported: 0.44 },
        confidence: 0.45,
      },
    }), { minConfidence: 0.7 });
    expect(out.tags).toContain("needs-review");
    expect(["pass", "fail"]).toContain(out.verdict);
  });

  it("reports the confidence of the dimension that decided the verdict", () => {
    const out = mapJudgeAnswers(withAnswers({
      grounding: { score: 0.2, probabilities: [0.8, 0.1, 0.1], confidence: 0.79 },
      disposition: {
        choice: "answered_supported",
        probabilities: { answered_supported: 0.5 },
        confidence: 0.12,
      },
    }));
    expect(out.auto.reason).toBe("grounding");
    expect(out.confidence).toBeCloseTo(0.79);
  });

  it("never writes a score outside the column's 1-5 CHECK", () => {
    const worst = mapJudgeAnswers({
      grounding: { score: 0, confidence: 0.9 },
      retrieval: { score: 0, confidence: 0.9 },
      contradiction: { noul: 1 },
      citations: { noul: 0 },
      disposition: { choice: "answered_unsupported", probabilities: {}, confidence: 0.9 },
    }, { findings: ["bad-link"] });
    expect(worst.score).toBeGreaterThanOrEqual(1);
    expect(worst.score).toBeLessThanOrEqual(5);
    expect(Number.isInteger(worst.score)).toBe(true);
  });

  it("survives a response with dimensions missing entirely", () => {
    const out = mapJudgeAnswers({});
    expect(["pass", "fail"]).toContain(out.verdict);
    expect(out.score).toBeGreaterThanOrEqual(1);
    expect(out.score).toBeLessThanOrEqual(5);
    // Nothing to be confident about, so a human is asked.
    expect(out.tags).toContain("needs-review");
  });

  it("keeps eval_notes inside the 4000-character CHECK", () => {
    expect(mapJudgeAnswers(goodAnswers, { model: "jev-1.13.0" }).notes.length)
      .toBeLessThan(4000);
  });

  it("records every dimension in eval_auto so agreement can be measured later", () => {
    const { auto } = mapJudgeAnswers(goodAnswers, { model: "jev-1.13.0" });
    expect(auto.model).toBe("jev-1.13.0");
    expect(Object.keys(auto.dims).sort()).toEqual([
      "citations", "contradiction", "disposition", "grounding", "retrieval",
    ]);
  });
});

describe("JUDGE_QUESTIONS", () => {
  it("asks nothing that needs counting or date ordering", () => {
    const text = JSON.stringify(JUDGE_QUESTIONS).toLowerCase();
    ["how many", "count", "earlier", "later than", "most recent"].forEach((phrase) => {
      expect(text).not.toContain(phrase);
    });
  });

  it("keeps every score inside Jev's 2-10 level range and the choice under 255", () => {
    Object.values(JUDGE_QUESTIONS).forEach((q) => {
      if (q.type === "score") {
        expect(q.criteria.length).toBeGreaterThanOrEqual(2);
        expect(q.criteria.length).toBeLessThanOrEqual(10);
      }
      if (q.type === "choice") {
        expect(Object.keys(q.criteria).length).toBeLessThanOrEqual(255);
      }
      if (q.type === "bool") expect(q.criteria).toBeUndefined();
    });
  });
});

// The two routes to this model are not the same API, and sending one shape to the
// other does not fail loudly — it comes back with fields nothing reads.
describe("the two wire formats", () => {
  it("speaks noul to TypeSafe and boolean to the gateway", () => {
    expect(toNativeQuestions().contradiction).toEqual({
      type: "noul",
      instructions: JUDGE_QUESTIONS.contradiction.instructions,
    });
    const gw = toGatewayQuestions().contradiction;
    expect(gw.type).toBe("boolean");
    expect(Object.keys(gw.criteria).sort()).toEqual(["false", "true"]);
    // Scores and choices are the same on both routes and must not be rewritten.
    expect(toGatewayQuestions().grounding).toEqual(JUDGE_QUESTIONS.grounding);
    expect(toNativeQuestions().disposition).toEqual(JUDGE_QUESTIONS.disposition);
  });

  it("reads a gateway response as readily as a native one", () => {
    const gateway = {
      grounding: { type: "score", score: 1.94, probabilities: { 0: 0.01, 1: 0.05, 2: 0.94 } },
      retrieval: { type: "score", score: 1.8, probabilities: { 0: 0.04, 1: 0.14, 2: 0.82 } },
      contradiction: { type: "boolean", probability: 0.03 },
      citations: { type: "boolean", probability: 0.95 },
      disposition: {
        type: "choice",
        choice: "answered_supported",
        probabilities: { answered_supported: 0.93, answered_unsupported: 0.04 },
      },
    };
    const out = mapJudgeAnswers(gateway, { model: "typesafe-ai/jev" });
    expect(out.verdict).toBe("pass");
    expect(out.score).toBe(5);
    // The gateway reports no confidence field, so it is derived from how peaked
    // the distribution is. If this ever read undefined, nothing would be flagged.
    expect(out.confidence).toBeGreaterThan(0.7);
    expect(out.tags).not.toContain("needs-review");
  });

  it("derives a confidence for every dimension when the route reports none", () => {
    const n = normaliseAnswers({
      grounding: { score: 1, probabilities: { 0: 0.33, 1: 0.34, 2: 0.33 } },
      contradiction: { probability: 0.52 },
    });
    // A flat distribution and a coin-flip probability are both low confidence.
    expect(n.grounding.confidence).toBeLessThan(0.4);
    expect(n.contradiction.confidence).toBeLessThan(0.1);
    expect(n.grounding.levels).toBe(3);
  });

  it("prefers a reported confidence over a derived one", () => {
    const n = normaliseAnswers({
      grounding: { score: 2, probabilities: [0.01, 0.02, 0.97], confidence: 0.55 },
    });
    expect(n.grounding.confidence).toBeCloseTo(0.55);
  });

  it("stamps the rubric version on every row it writes", () => {
    const out = mapJudgeAnswers(goodAnswers, { model: "jev-1.13.0" });
    expect(out.auto.rubric).toBe("r1");
    expect(out.notes).toContain("rubric r1");
  });
});
