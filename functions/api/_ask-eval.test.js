/**
 * @jest-environment node
 *
 * Node, not jsdom: this is a Worker module, and it needs the real Request and
 * Response globals that the jsdom environment does not provide.
 */
// The gate order of the judge endpoint, which is the part that decides whether
// money is spent.
//
// Every case below asserts the same thing twice: the right status, and that
// NOTHING was fetched from a judge host. A refusal that still calls the model is
// the one bug in here that costs real credit, and it would pass a status-only
// test.
//
// A test file under functions/ is normally a mistake, since Pages turns every
// file there into a route. The leading underscore is what exempts this one —
// verified with `wrangler pages functions build`, whose output contains no
// reference to this file. Rename it and it ships.

// eslint-disable-next-line import/extensions
import { onRequestGet, onRequestPost } from "./ask-eval";

const ORIGINAL_FETCH = global.fetch;

const JUDGE_HOSTS = ["api.typesafe.ai", "ai-gateway.vercel.sh"];

const ENV = {
  VITE_SUPABASE_URL: "https://db.example.co",
  VITE_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
};

let calls = [];

/**
 * @param owner   what is_owner() answers: true, false, or "throw"
 * @param settings  overrides merged onto the ask_settings row
 */
const stubFetch = ({ owner = true, settings = {}, rows = [] } = {}) => {
  calls = [];
  global.fetch = jest.fn(async (url, init) => {
    const href = String(url);
    calls.push({ href, method: init?.method || "GET" });
    if (JUDGE_HOSTS.some((h) => href.includes(h))) {
      throw new Error(`the judge was called on a path that must not spend: ${href}`);
    }
    if (href.includes("/rpc/is_owner")) {
      if (owner === "throw") return new Response("boom", { status: 500 });
      return new Response(JSON.stringify(owner), { status: 200 });
    }
    if (href.includes("ask_settings")) {
      return new Response(JSON.stringify([{ auto_eval_enabled: true, ...settings }]), { status: 200 });
    }
    if (href.includes("ask_eval_usage")) {
      return new Response(JSON.stringify([{ input_tokens: 10, graded: 2 }]), { status: 200 });
    }
    if (href.includes("ask_messages")) {
      return new Response(JSON.stringify(rows), { status: 200 });
    }
    if (href.includes("/rpc/ask_eval_budget")) {
      return new Response(JSON.stringify({ allowed: true, remaining: 1000 }), { status: 200 });
    }
    return new Response("[]", { status: 200 });
  });
};

const judgeWasCalled = () => calls.some((c) => JUDGE_HOSTS.some((h) => c.href.includes(h)));

const post = (body, { auth = "Bearer token" } = {}) => onRequestPost({
  env: ENV,
  waitUntil: () => {},
  request: new Request("https://site.example/api/ask-eval", {
    method: "POST",
    headers: auth ? { Authorization: auth, "Content-Type": "application/json" } : {},
    body: JSON.stringify(body),
  }),
});

afterEach(() => { global.fetch = ORIGINAL_FETCH; });

describe("POST /api/ask-eval gates", () => {
  it("refuses a caller with no token before reading anything", async () => {
    stubFetch();
    const res = await post({ messageIds: [1] }, { auth: null });
    expect(res.status).toBe(403);
    expect(judgeWasCalled()).toBe(false);
    // Not even the settings were read.
    expect(calls.filter((c) => c.href.includes("ask_settings"))).toHaveLength(0);
  });

  it("refuses a caller who is not the owner", async () => {
    stubFetch({ owner: false });
    const res = await post({ messageIds: [1] });
    expect(res.status).toBe(403);
    expect(judgeWasCalled()).toBe(false);
  });

  it("says unavailable, not forbidden, when the owner check cannot run", async () => {
    stubFetch({ owner: "throw" });
    const res = await post({ messageIds: [1] });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("unavailable");
    expect(judgeWasCalled()).toBe(false);
  });

  it("refuses while the feature flag is off", async () => {
    stubFetch({ settings: { auto_eval_enabled: false } });
    const res = await post({ messageIds: [1] }, {});
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("disabled");
    expect(judgeWasCalled()).toBe(false);
  });

  it("refuses when the deployment has no judge key, and says so plainly", async () => {
    stubFetch();
    const res = await post({ messageIds: [1] });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("not configured");
    expect(body.note).toMatch(/AI_GATEWAY_API_KEY|TYPESAFE_API_KEY/);
    expect(judgeWasCalled()).toBe(false);
  });

  it("refuses a batch larger than the per-request cap rather than truncating it", async () => {
    stubFetch({ settings: { auto_eval_request_batch: 2 } });
    const res = await onRequestPost({
      env: { ...ENV, TYPESAFE_API_KEY: "k" },
      waitUntil: () => {},
      request: new Request("https://site.example/api/ask-eval", {
        method: "POST",
        headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: [1, 2, 3, 4] }),
      }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("too many");
    expect(judgeWasCalled()).toBe(false);
  });

  it("refuses an empty request", async () => {
    stubFetch();
    const res = await post({ messageIds: [] });
    expect(res.status).toBe(400);
  });

  it("refuses explaining while that switch is off", async () => {
    stubFetch({ settings: { auto_eval_explain_enabled: false } });
    const res = await post({ messageIds: [1], mode: "explain" });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("disabled");
  });

  it("estimates without calling the judge at all", async () => {
    stubFetch({ rows: [{ id: 1, content: "an answer", source_count: 2, sources: [], types: [] }] });
    const res = await onRequestPost({
      env: { ...ENV, TYPESAFE_API_KEY: "k" },
      waitUntil: () => {},
      request: new Request("https://site.example/api/ask-eval", {
        method: "POST",
        headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: [1], mode: "estimate" }),
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.tokens).toBeGreaterThan(0);
    expect(judgeWasCalled()).toBe(false);
  });

  it("only ever asks the database for ungraded assistant rows", async () => {
    stubFetch({ rows: [] });
    await onRequestPost({
      env: { ...ENV, TYPESAFE_API_KEY: "k" },
      waitUntil: () => {},
      request: new Request("https://site.example/api/ask-eval", {
        method: "POST",
        headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: [1], mode: "estimate" }),
      }),
    });
    const select = calls.find((c) => c.href.includes("ask_messages"));
    expect(select.href).toContain("role=eq.assistant");
    expect(select.href).toContain("evaluated_at=is.null");
  });
});

describe("GET /api/ask-eval", () => {
  const get = (env, auth = "Bearer t") => onRequestGet({
    env,
    request: new Request("https://site.example/api/ask-eval", {
      headers: auth ? { Authorization: auth } : {},
    }),
  });

  it("is owner-only too", async () => {
    stubFetch({ owner: false });
    expect((await get(ENV)).status).toBe(403);
  });

  it("reports the flag, the route and the budget without leaking a key", async () => {
    stubFetch();
    const res = await get({ ...ENV, TYPESAFE_API_KEY: "secret-key" });
    const body = await res.json();
    expect(body.enabled).toBe(true);
    expect(body.configured).toBe(true);
    expect(body.route).toBe("typesafe");
    expect(body.model).toBe("jev-latest");
    expect(body.budget.remaining).toBe(body.budget.cap - 10);
    expect(JSON.stringify(body)).not.toContain("secret-key");
  });

  it("names the gateway model when routed through the gateway", async () => {
    stubFetch();
    const body = await (await get({ ...ENV, AI_GATEWAY_API_KEY: "k" })).json();
    expect(body.route).toBe("gateway");
    expect(body.model).toBe("typesafe-ai/jev");
  });

  it("says it is not configured when no key exists", async () => {
    stubFetch();
    const body = await (await get(ENV)).json();
    expect(body.configured).toBe(false);
    expect(body.route).toBeNull();
  });
});
