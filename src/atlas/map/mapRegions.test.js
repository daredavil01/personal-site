// Map-hub data invariants: the region table must stay in lockstep with the
// globe domain table (§3), fly-in viewBoxes must never leave the canvas, and
// the route → region mapping feeds ReturnPortal's reverse fly-in (§4.7).

import { DOMAINS } from "../../components/Index/globe/domains";
import {
  REGIONS, MAP_ORDER, FULL_VIEW, HOME_VIEW, MAP_W, MAP_H, regionForPath,
} from "./mapRegions";

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

  it("defines the mobile home view zoomed ~1.6× inside the canvas", () => {
    expect(HOME_VIEW.w).toBeCloseTo(FULL_VIEW.w / 1.6, 5);
    expect(HOME_VIEW.x + HOME_VIEW.w).toBeLessThanOrEqual(MAP_W);
    expect(HOME_VIEW.y + HOME_VIEW.h).toBeLessThanOrEqual(MAP_H);
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
    ["/100-days-to-offload/day-8", "writer"],
    ["/challenges", "writer"],
    ["/micro-blog/abc", "writer"],
    ["/about", "person"],
    ["/now", "person"],
    ["/mindmap", "person"],
    ["/interactive-me", "person"],
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
