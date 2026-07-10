import { pickBeat, BEATS } from "./guideScript";
import { defaultState } from "../world/storage";

const world = (overrides = {}) => ({ ...defaultState(), ...overrides });

describe("guideScript.pickBeat", () => {
  it("greets a visitor who has reached the hub (both hub paths)", () => {
    expect(pickBeat(world({ introSeen: true }), "/world")?.id).toBe("welcome");
    expect(pickBeat(world({ introSeen: true }), "/")?.id).toBe("welcome");
  });

  it("stays quiet on the hub path until the intro is seen (orbit stage)", () => {
    expect(pickBeat(world({ introSeen: false }), "/world")).toBeNull();
  });

  it("stays quiet on a region page for a fresh visitor with no stamps", () => {
    expect(pickBeat(world(), "/books")).toBeNull();
  });

  it("never repeats an acknowledged beat", () => {
    const w = world({ guide: { welcome: "2026-07-10T00:00:00Z" } });
    expect(pickBeat(w, "/world")).toBeNull();
  });

  it("explains the passport after the first region stamp, only in a region", () => {
    const w = world({ introSeen: true, visitedRegions: { reader: "2026-07-10T00:00:00Z" } });
    expect(pickBeat(w, "/books")?.id).toBe("first-stamp");
    expect(pickBeat(w, "/books/42")?.id).toBe("first-stamp");
    // On the map the welcome beat still outranks it.
    expect(pickBeat(w, "/world")?.id).toBe("welcome");
  });

  it("hints at sound after two regions while sound is off, anywhere", () => {
    const seen = {
      welcome: "2026-07-10T00:00:00Z",
      "first-stamp": "2026-07-10T00:00:00Z",
    };
    const visited = { reader: "x", treks: "y" };
    const w = world({ guide: seen, visitedRegions: visited });
    expect(pickBeat(w, "/treks")?.id).toBe("sound-hint");
    // Sound already on: nothing to say.
    expect(pickBeat(world({ guide: seen, visitedRegions: visited, sound: true }), "/treks")).toBeNull();
  });

  it("teases the easter eggs on the map after three regions, until one is found", () => {
    const seen = {
      welcome: "2026-07-10T00:00:00Z",
      "first-stamp": "2026-07-10T00:00:00Z",
      "sound-hint": "2026-07-10T00:00:00Z",
    };
    const visited = { reader: "x", treks: "y", person: "z" };
    expect(pickBeat(world({ guide: seen, visitedRegions: visited }), "/world")?.id).toBe("egg-hint");
    expect(pickBeat(
      world({ guide: seen, visitedRegions: visited, eggs: { lighthouse: "t" } }),
      "/world",
    )).toBeNull();
  });

  it("stays silent on non-atlas routes like /admin", () => {
    const w = world({ visitedRegions: { reader: "x", treks: "y", person: "z" } });
    expect(pickBeat(w, "/admin")).toBeNull();
  });

  it("has unique ids and a when() on every beat", () => {
    const ids = BEATS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    BEATS.forEach((b) => expect(typeof b.when).toBe("function"));
  });
});
