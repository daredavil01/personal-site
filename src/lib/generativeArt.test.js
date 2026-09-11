import { colorForTag, postArt } from "./generativeArt";

describe("postArt", () => {
  it("draws the same picture for the same post", () => {
    expect(postArt({ id: 42, tags: [] })).toEqual(postArt({ id: 42, tags: [] }));
    expect(postArt({ id: 42, tags: [] })).not.toEqual(postArt({ id: 43, tags: [] }));
  });

  it("uses stored tag colors, falling back to a name-derived one", () => {
    const art = postArt({ id: 7, tags: ["life", "youtube"] }, new Map([["life", "#ff0000"]]));
    expect(art.tagged).toBe(true);
    expect(art.palette).toEqual(["#ff0000", colorForTag("youtube")]);
    art.shapes.forEach((s) => expect(art.palette).toContain(s.fill));
  });

  it("gives untagged posts a seeded palette of valid colors", () => {
    const art = postArt({ id: 1618 });
    expect(art.tagged).toBe(false);
    expect(art.palette).toHaveLength(3);
    art.palette.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/));
    expect(art.shapes.length).toBeGreaterThanOrEqual(3);
  });

  it("derives a stable color for Marathi tag names", () => {
    expect(colorForTag("भटकंती")).toMatch(/^#[0-9a-f]{6}$/);
    expect(colorForTag("भटकंती")).toBe(colorForTag("भटकंती"));
  });
});
