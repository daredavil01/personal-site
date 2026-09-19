import {
  runJudgeTiers, rungStatus, usableRungs,
} from "./askJudgeTiers";
import { mapJudgeAnswers, parseJudgeJson } from "./askJudge";

const LADDER = [
  { name: "jev-gateway", provider: "jev", route: "gateway", model: "typesafe-ai/jev", enabled: true },
  { name: "gemini-judge", provider: "gemini", model: "gemini-flash-lite-latest", enabled: true },
  { name: "cf", provider: "workers-ai", model: "@cf/openai/gpt-oss-20b", enabled: true },
  { name: "jev-direct", provider: "jev", route: "typesafe", model: "jev-latest", enabled: true },
];

const names = (rungs) => rungs.map(({ tier }) => tier.name);

describe("which rungs can run", () => {
  it("skips a rung whose key is missing", () => {
    expect(names(usableRungs(LADDER, {}))).toEqual([]);
    expect(names(usableRungs(LADDER, { GEMINI_API_KEY: "k" }))).toEqual(["gemini-judge"]);
    expect(names(usableRungs(LADDER, { AI: {} }))).toEqual(["cf"]);
  });

  it("skips a rung that is switched off", () => {
    const off = LADDER.map((t) => ({ ...t, enabled: t.name !== "gemini-judge" }));
    expect(names(usableRungs(off, { GEMINI_API_KEY: "k", AI: {} }))).toEqual(["cf"]);
  });

  // The whole point of the switch: a metered rung cannot run by accident.
  it("never uses a metered rung unless spending was allowed", () => {
    const env = { TYPESAFE_API_KEY: "k", GEMINI_API_KEY: "g" };
    expect(names(usableRungs(LADDER, env))).toEqual(["gemini-judge"]);
    expect(names(usableRungs(LADDER, env, { allowMetered: true })))
      .toEqual(["gemini-judge", "jev-direct"]);
  });

  it("treats the gateway as credit, the direct endpoint as metered, the rest as free", () => {
    const env = {
      AI_GATEWAY_API_KEY: "a", TYPESAFE_API_KEY: "b", GEMINI_API_KEY: "c", AI: {},
    };
    expect(LADDER.map((t) => rungStatus(t, env).cost))
      .toEqual(["credit", "free", "free", "metered"]);
  });

  it("reports why an unusable rung cannot run", () => {
    expect(rungStatus(LADDER[1], {}).why).toMatch(/GEMINI_API_KEY/);
    expect(rungStatus({ provider: "nonsense" }, {}).why).toMatch(/unknown provider/);
  });
});

describe("walking the ladder", () => {
  const ORIGINAL_FETCH = global.fetch;
  afterEach(() => { global.fetch = ORIGINAL_FETCH; });

  const geminiReply = (body) => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }],
      usageMetadata: { promptTokenCount: 321 },
    }),
  });

  const GOOD = {
    grounding: { score: 2, confidence: 0.8 },
    retrieval: { score: 2, confidence: 0.8 },
    contradiction: { probability: 0.02 },
    citations: { probability: 0.9 },
    disposition: { choice: "answered_supported", confidence: 0.86 },
  };

  it("falls through a failing rung to the next one", async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => {
      calls += 1;
      if (calls === 1) return { ok: false, status: 429, text: async () => "slow down" };
      return geminiReply(GOOD);
    });
    const ladder = [
      { name: "a", provider: "gemini", model: "m1", enabled: true },
      { name: "b", provider: "gemini", model: "m2", enabled: true },
    ];
    const out = await runJudgeTiers({ tiers: ladder, state: { question: "q" }, env: { GEMINI_API_KEY: "k" } });
    expect(out.tier).toBe("b");
    expect(out.errors).toEqual(["a: gemini 429"]);
    expect(out.answers.disposition.choice).toBe("answered_supported");
  });

  it("marks a language-model grade as uncalibrated, and Jev's as calibrated", async () => {
    global.fetch = jest.fn(async () => geminiReply(GOOD));
    const out = await runJudgeTiers({
      tiers: [{ name: "g", provider: "gemini", model: "m", enabled: true }],
      state: { question: "q" },
      env: { GEMINI_API_KEY: "k" },
    });
    expect(out.calibrated).toBe(false);
    expect(out.inputTokens).toBe(321);
    // Which is what puts the warning tag on the row.
    const mapped = mapJudgeAnswers(out.answers, { extraTags: out.calibrated ? [] : ["judge-fallback"] });
    expect(mapped.tags).toContain("judge-fallback");
  });

  it("falls back to Workers AI, which needs no key at all", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 500, text: async () => "down" }));
    const env = {
      GEMINI_API_KEY: "k",
      AI: { run: async () => ({ response: JSON.stringify(GOOD) }) },
    };
    const out = await runJudgeTiers({
      tiers: [
        { name: "g", provider: "gemini", model: "m", enabled: true },
        { name: "cf", provider: "workers-ai", model: "@cf/x", enabled: true },
      ],
      state: { question: "q" },
      env,
    });
    expect(out.tier).toBe("cf");
    expect(out.provider).toBe("workers-ai");
    expect(out.answers.grounding.score).toBe(2);
  });

  it("returns every error when no rung answers, rather than a silent pass", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 503, text: async () => "no" }));
    const out = await runJudgeTiers({
      tiers: [{ name: "g", provider: "gemini", model: "m", enabled: true }],
      state: { question: "q" },
      env: { GEMINI_API_KEY: "k" },
    });
    expect(out.answers).toBeNull();
    expect(out.errors).toHaveLength(1);
  });

  it("does not call anything when no rung is usable", async () => {
    global.fetch = jest.fn(async () => { throw new Error("must not be called"); });
    const out = await runJudgeTiers({ tiers: LADDER, state: {}, env: {} });
    expect(out.answers).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("parsing a text model's reply", () => {
  it("survives a fenced block and a line of preamble", () => {
    const out = parseJudgeJson('Sure, here you go:\n```json\n{"grounding":{"score":1,"confidence":0.6}}\n```');
    expect(out.grounding.score).toBe(1);
    expect(out.grounding.confidence).toBeCloseTo(0.6);
    // Three rungs, so normaliseAnswers scores it out of 2.
    expect(out.grounding.probabilities).toHaveLength(3);
  });

  it("clamps a model that invents a score outside the scale", () => {
    const out = parseJudgeJson('{"grounding":{"score":9,"confidence":4},"contradiction":{"probability":-2}}');
    expect(out.grounding.score).toBe(2);
    expect(out.grounding.confidence).toBe(1);
    expect(out.contradiction.probability).toBe(0);
  });

  it("drops a disposition that is not one of the four options", () => {
    const out = parseJudgeJson('{"disposition":{"choice":"made_it_up","confidence":0.9}}');
    expect(out.disposition.choice).toBeNull();
  });

  it("leaves a missing dimension null rather than inventing a number", () => {
    const out = parseJudgeJson("{}");
    expect(out.grounding.score).toBeUndefined();
    const mapped = mapJudgeAnswers(out);
    // Nothing to be sure about, so a human is asked.
    expect(mapped.tags).toContain("needs-review");
  });

  it("throws on a reply with no JSON in it at all", () => {
    expect(() => parseJudgeJson("I cannot grade this.")).toThrow(/did not return JSON/);
  });
});
