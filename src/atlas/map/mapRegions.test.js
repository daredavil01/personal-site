// Map-hub data invariants: the region table must stay in lockstep with the
// globe domain table (§3), fly-in viewBoxes must never leave the canvas, and
// the route → region mapping feeds ReturnPortal's reverse fly-in (§4.7).

import { DOMAINS } from "../../components/Index/globe/domains";
import {
  REGIONS,
  MAP_ORDER,
  INTRO_VIEW,
  MAP_W,
  MAP_H,
  LAYOUTS,
  regionForPath,
} from "./mapRegions";
import { EGGS } from "../gamification/easterEggs";

describe("REGIONS table", () => {
  it("covers every globe domain exactly once, in the keyboard ring order", () => {
    expect(REGIONS.map((r) => r.key)).toEqual(MAP_ORDER);
    expect([...MAP_ORDER].sort()).toEqual(DOMAINS.map((d) => d.key).sort());
  });

  it("inherits path and color from the domain table (single source of truth)", () => {
    REGIONS.forEach((r) => {
      const domain = DOMAINS.find((d) => d.key === r.key);
      expect(r.path).toBe(domain.path);
      expect(r.color).toBe(domain.color);
    });
  });

  it("keeps every fly-in viewBox inside the canvas", () => {
    REGIONS.forEach(({ viewBox: vb }) => {
      expect(vb.x).toBeGreaterThanOrEqual(0);
      expect(vb.y).toBeGreaterThanOrEqual(0);
      expect(vb.x + vb.w).toBeLessThanOrEqual(MAP_W);
      expect(vb.y + vb.h).toBeLessThanOrEqual(MAP_H);
    });
  });

  it("keeps fly-in boxes at the map aspect ratio", () => {
    REGIONS.forEach(({ viewBox: vb }) => {
      expect(vb.h / vb.w).toBeCloseTo(MAP_H / MAP_W, 5);
    });
  });

  it("keeps the post-dive intro view inside the canvas", () => {
    expect(INTRO_VIEW.x).toBeGreaterThanOrEqual(0);
    expect(INTRO_VIEW.y).toBeGreaterThanOrEqual(0);
    expect(INTRO_VIEW.x + INTRO_VIEW.w).toBeLessThanOrEqual(MAP_W);
    expect(INTRO_VIEW.y + INTRO_VIEW.h).toBeLessThanOrEqual(MAP_H);
  });
});

describe("regionForPath", () => {
  it.each([
    ["/sports", "marathons"],
    ["/sports/12", "marathons"],
    ["/treks/3", "treks"],
    ["/books", "reader"],
    ["/books/9", "reader"],
    ["/projects/2", "creator"],
    ["/resume", "creator"],
    ["/presentations/4", "creator"],
    ["/100-days-to-offload/day-8", "writer"],
    ["/challenges", "writer"],
    ["/micro-blog/abc", "writer"],
    ["/logbook", "writer"],
    ["/about", "person"],
    ["/now", "person"],
    ["/mindmap", "person"],
    ["/interactive-me", "person"],
    ["/ask", "person"],
    ["/tags/forts", "person"],
  ])("%s → %s", (path, region) => {
    expect(regionForPath(path)).toBe(region);
  });

  it("returns null off-region (map, admin, unknown)", () => {
    expect(regionForPath("/")).toBeNull();
    expect(regionForPath("/world")).toBeNull();
    expect(regionForPath("/admin/books")).toBeNull();
    expect(regionForPath("/booksmith")).toBeNull(); // prefix must be a segment
  });
});

describe("portrait layout", () => {
  const { w: W, h: H, regions, introView, lighthouse } = LAYOUTS.portrait;
  const inside = (x, y) => x >= 0 && x <= W && y >= 0 && y <= H;
  const PLAQUE_H = 33;
  // Every plaque on the canvas as [x, y, w, h], the lighthouse's included.
  const plaques = [
    ...regions.map((r) => [r.plaque[0], r.plaque[1], r.plaque[2] * r.plaqueScale, PLAQUE_H * r.plaqueScale]),
    [lighthouse.plaque[0], lighthouse.plaque[1], 200 * lighthouse.plaque[2], PLAQUE_H * lighthouse.plaque[2]],
  ];

  it("is taller than wide and keeps the region order", () => {
    expect(H).toBeGreaterThan(W);
    expect(regions.map((r) => r.key)).toEqual(MAP_ORDER);
  });

  it("keeps every plaque fully on the canvas", () => {
    plaques.forEach(([x, y, w, h]) => {
      expect(inside(x, y) && inside(x + w, y + h)).toBe(true);
    });
  });

  it("never overlaps two plaques", () => {
    plaques.forEach((a, i) => plaques.slice(i + 1).forEach((b) => {
      const apart = a[0] + a[2] <= b[0] || b[0] + b[2] <= a[0]
        || a[1] + a[3] <= b[1] || b[1] + b[3] <= a[1];
      expect(apart).toBe(true);
    }));
  });

  it("keeps fly-in and intro boxes inside the canvas at its aspect ratio", () => {
    [...regions.map((r) => r.viewBox), introView].forEach((vb) => {
      expect(inside(vb.x, vb.y) && inside(vb.x + vb.w, vb.y + vb.h)).toBe(true);
      expect(vb.h / vb.w).toBeCloseTo(H / W, 5);
    });
  });

  it("centres every hotspot on the canvas", () => {
    regions.forEach(({ hit: [x, y, w, h] }) => {
      expect(inside(x + (w / 2), y + (h / 2))).toBe(true);
    });
  });

  it("places every easter egg on the canvas", () => {
    EGGS.forEach((egg) => {
      const [x, y] = LAYOUTS.portrait.eggAt(egg);
      expect(inside(x, y)).toBe(true);
    });
  });

  it("leaves the landscape layout on the original map", () => {
    expect(LAYOUTS.landscape.regions).toBe(REGIONS);
    expect(LAYOUTS.landscape.w).toBe(MAP_W);
    EGGS.forEach((egg) => expect(LAYOUTS.landscape.eggAt(egg)).toBe(egg.at));
  });
});
