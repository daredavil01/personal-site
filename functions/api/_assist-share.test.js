/**
 * @jest-environment node
 *
 * Node, not jsdom: a Worker module needs the real Request and Response.
 */
// The share studio's AI button (task share_design): owner-only, off until its
// switch is on, and the answer filtered back to designs the studio can draw.
// Like _ask-eval.test.js, the underscore keeps Pages from routing this file.

// eslint-disable-next-line import/extensions
import { onRequestPost } from "./assist";

const ORIGINAL_FETCH = global.fetch;
const MODEL_HOST = "generativelanguage.googleapis.com";
const ENV = { VITE_SUPABASE_URL: "https://db.example.co", VITE_SUPABASE_ANON_KEY: "anon", GEMINI_API_KEY: "k" };
const LADDER = [{ name: "gemini", provider: "gemini", model: "gemini-flash-lite-latest", enabled: true }];

let calls = [];
const stub = ({ owner = true, features = { enabled: true, share_suggest: true }, answer = "" } = {}) => {
  calls = [];
  global.fetch = jest.fn(async (url) => {
    const href = String(url);
    calls.push(href);
    if (href.includes("/rpc/is_owner")) return new Response(JSON.stringify(owner), { status: 200 });
    if (href.includes("ask_settings")) {
      return new Response(JSON.stringify([{ tiers: LADDER, assist_tiers: [], ai_features: features }]), { status: 200 });
    }
    if (href.includes(MODEL_HOST)) {
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: answer }] } }] }), { status: 200 });
    }
    return new Response("[]", { status: 200 });
  });
};

const post = (body, auth = "Bearer t") => onRequestPost({
  env: ENV,
  waitUntil: () => {},
  request: new Request("https://site.example/api/assist", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify(body),
  }),
});

const BODY = {
  task: "share_design", kind: "microblog", text: "Quiet night after the race.", lang: "en", hasImage: false, tags: ["running"],
};
const modelCalled = () => calls.some((h) => h.includes(MODEL_HOST));

afterEach(() => { global.fetch = ORIGINAL_FETCH; });

describe("POST /api/assist share_design", () => {
  it("refuses a visitor without calling a model", async () => {
    stub({ owner: false });
    expect((await post(BODY)).status).toBe(403);
    expect((await post(BODY, null)).status).toBe(403);
    expect(modelCalled()).toBe(false);
  });

  it("stays off until share_suggest is switched on", async () => {
    stub({ features: { enabled: true } });
    const res = await post(BODY);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("disabled");
    expect(modelCalled()).toBe(false);
  });

  it("returns only designs built from real ids", async () => {
    stub({
      answer: JSON.stringify({
        designs: [
          { theme: "starfield", layout: "minimal", pairing: "cormorant", why: "a night line" },
          { theme: "invented", layout: "poster", pairing: "site" },
          { theme: "film", layout: "polaroid", pairing: "nope" },
        ],
      }),
    });
    const res = await post(BODY);
    expect(res.status).toBe(200);
    const { designs, tier } = await res.json();
    expect(tier).toBe("gemini");
    expect(designs).toHaveLength(2);
    expect(designs[0].design).toMatchObject({ theme: "starfield", layout: "minimal", pairing: "cormorant" });
    // No photo: a polaroid becomes editorial; an unknown pairing falls back.
    expect(designs[1].design).toMatchObject({ theme: "film", layout: "editorial", pairing: "site" });
  });
});
