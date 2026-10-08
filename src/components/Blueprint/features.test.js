import { ROUTE_MANIFEST } from "../../data/routeManifest";
import { DEFAULT_ASK_SETTINGS } from "../../data/askConfig";
import {
  COLLECTIONS, FEATURES, LAYERS, fmt, resolve,
} from "./features";
import { circuitSequence } from "./AskCircuit";

const ROUTES = new Set(ROUTE_MANIFEST.map((r) => r.path));
const LAYER_IDS = new Set(LAYERS.map((l) => l.id));

describe("the rooms on the /blueprint plan", () => {
  it("link only to routes that exist", () => {
    FEATURES.filter((f) => f.path).forEach((f) => {
      expect({ room: f.id, route: ROUTES.has(f.path.split("?")[0]) }).toEqual({ room: f.id, route: true });
    });
    COLLECTIONS.forEach((c) => expect(ROUTES.has(c.path)).toBe(true));
  });

  it("have unique ids and room numbers", () => {
    expect(new Set(FEATURES.map((f) => f.id)).size).toBe(FEATURES.length);
    expect(new Set(FEATURES.map((f) => f.no)).size).toBe(FEATURES.length);
  });

  it("only name floors the section draws, and reach at least one", () => {
    FEATURES.forEach((f) => {
      const keys = Object.keys(f.layers);
      expect(keys.length).toBeGreaterThan(0);
      keys.forEach((k) => expect({ room: f.id, floor: LAYER_IDS.has(k) }).toEqual({ room: f.id, floor: true }));
    });
  });

  // The plan is drawn from these rectangles, so a gap or an overlap would be
  // visible as a hole or a double wall.
  it("tile the 960×600 plan exactly", () => {
    const area = FEATURES.reduce((sum, { plan }) => sum + plan.w * plan.h, 0);
    expect(area).toBe(960 * 600);
    FEATURES.forEach((a, i) => FEATURES.slice(i + 1).forEach((b) => {
      const overlap = a.plan.x < b.plan.x + b.plan.w && b.plan.x < a.plan.x + a.plan.w
        && a.plan.y < b.plan.y + b.plan.h && b.plan.y < a.plan.y + a.plan.h;
      expect({ pair: [a.id, b.id], overlap }).toEqual({ pair: [a.id, b.id], overlap: false });
    }));
  });

  it("put every door on one of its own walls", () => {
    FEATURES.filter((f) => f.door).forEach(({ id, plan, door }) => {
      const onWall = door.dir === "h"
        ? (door.y === plan.y || door.y === plan.y + plan.h) && door.x > plan.x && door.x + 30 < plan.x + plan.w
        : (door.x === plan.x || door.x === plan.x + plan.w) && door.y > plan.y && door.y + 30 < plan.y + plan.h;
      expect({ id, onWall }).toEqual({ id, onWall: true });
    });
  });

  it("omit a number it does not have rather than print zero", () => {
    const archives = FEATURES.find((f) => f.id === "archives");
    expect(resolve(archives.area, null)).toBeNull();
    expect(resolve(archives.area, { stats: { booksCount: 51 }, micro: { total: 1668 } })).toBe("1,719 rows");
    expect(fmt(0)).toBeNull();
    expect(fmt(undefined)).toBeNull();
  });
});

describe("the Ask circuit", () => {
  const { tiers } = DEFAULT_ASK_SETTINGS;
  const rungs = (seq) => seq.steps.flatMap((s) => s.nodes).filter((n) => n.startsWith("rung-"));

  it("answers on the first rung when everything is up", () => {
    const seq = circuitSequence({ question: "q", embedDown: false, down: [] });
    expect(seq.answered).toBe(0);
    expect(rungs(seq)).toEqual(["rung-0"]);
  });

  it("falls through every rung that is down, in order", () => {
    const seq = circuitSequence({ question: "q", embedDown: false, down: [0, 1] });
    expect(seq.answered).toBe(2);
    expect(rungs(seq)).toEqual(["rung-0", "rung-1", "rung-2"]);
  });

  it("ends at search-only when every model is down", () => {
    const seq = circuitSequence({ question: "q", embedDown: false, down: tiers.map((_, i) => i) });
    expect(seq.answered).toBe(tiers.length);
    expect(seq.steps.find((s) => s.nodes.includes(`rung-${tiers.length}`)).log).toMatch(/search-only/);
  });

  it("searches keyword-only without an embedding", () => {
    const seq = circuitSequence({ question: "q", embedDown: true, down: [] });
    const search = seq.steps[2];
    expect(search.nodes).not.toContain("semantic");
    expect(search.log).toMatch(/keyword-only/);
  });
});
