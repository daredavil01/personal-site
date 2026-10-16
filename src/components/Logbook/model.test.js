import {
  arcPath, gapLabel, markMix, matchPosts, perThousand, phyllotaxis, pickLine,
  prologueLayouts, rhythmStats, spiralPaths, splitLabel, titleCase, yearTicks, SPIRAL_BOX,
} from "./model";

const post = (id, date, extra = {}) => ({
  id, date, title: `Essay ${id}`, lang: "en", words: 1000, exclaims: 4, tags: [], opening: "", xy: [0.5, 0.5], ...extra,
});

describe("rhythmStats", () => {
  it("averages and finds the longest sentence", () => {
    expect(rhythmStats([10, 20, 30])).toEqual({ avg: 20, longest: 30, n: 3 });
  });

  it("returns nulls, never zeros, for an essay with no rhythm", () => {
    expect(rhythmStats([])).toEqual({ avg: null, longest: null, n: 0 });
  });
});

describe("perThousand", () => {
  it("rounds to one decimal and refuses to divide by nothing", () => {
    expect(perThousand(23, 1000)).toBe(23);
    expect(perThousand(1, 3000)).toBe(0.3);
    expect(perThousand(5, 0)).toBeNull();
  });
});

describe("markMix and spiralPaths", () => {
  it("counts each kind of mark, danda as a full stop", () => {
    expect(markMix(".,,!?।—")).toEqual({ stop: 2, comma: 2, bang: 1, ask: 1, other: 1 });
  });

  it("draws every mark inside the box, one path per kind", () => {
    const punct = ".".repeat(360);
    const { stop, bang } = spiralPaths(punct);
    expect(bang).toBe("");
    const coords = stop.match(/M[\d.]+,[\d.]+/g).map((m) => m.slice(1).split(",").map(Number));
    expect(coords).toHaveLength(360);
    coords.flat().forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(SPIRAL_BOX);
    });
  });
});

describe("phyllotaxis", () => {
  it("keeps every cell inside the square, oldest nearest the centre", () => {
    const cells = phyllotaxis(103, 1000);
    expect(cells).toHaveLength(103);
    cells.forEach((c) => {
      expect(c.cx - c.cell / 2).toBeGreaterThanOrEqual(0);
      expect(c.cx + c.cell / 2).toBeLessThanOrEqual(1000);
    });
    const dist = (c) => Math.hypot(c.cx - 500, c.cy - 500);
    expect(dist(cells[0])).toBeLessThan(dist(cells[102]));
  });
});

describe("letters", () => {
  it("says how far apart two dates are in years and months", () => {
    expect(gapLabel("2020-06-26", "2026-04-07")).toBe("5 years, 10 months");
    expect(gapLabel("2024-01-02", "2025-01-30")).toBe("1 year");
    expect(gapLabel("2026-03-01", "2026-03-20")).toBe("the same month");
  });

  it("draws an arc that starts and ends on the axis", () => {
    const d = arcPath(10, 110, 200, 60);
    expect(d.startsWith("M10.0,200")).toBe(true);
    expect(d.endsWith("110.0,200")).toBe(true);
  });
});

describe("yearTicks", () => {
  it("drops a year label that would crowd the one before it", () => {
    const at = { 2020: 10, 2021: 30, 2022: 90, 2023: 100, 2024: 160 };
    expect(yearTicks([2020, 2021, 2022, 2023, 2024], (y) => at[y], 34).map((t) => t.year)).toEqual([2020, 2022, 2024]);
  });
});

describe("matchPosts", () => {
  const posts = [
    post("a", "2020-01-01", { title: "The calm mind", tags: ["mindfulness"] }),
    post("b", "2021-01-01", { title: "किल्ले जीवधन", tags: ["trek"] }),
    post("c", "2022-01-01", { title: "Social media", opening: "Attention is a currency." }),
  ];

  it("returns null for an empty query so nothing is dimmed", () => {
    expect(matchPosts(posts, "  ")).toBeNull();
  });

  it("matches titles, tags and openings, every word required", () => {
    expect([...matchPosts(posts, "calm")]).toEqual(["a"]);
    expect([...matchPosts(posts, "TREK")]).toEqual(["b"]);
    expect([...matchPosts(posts, "जीवधन")]).toEqual(["b"]);
    expect([...matchPosts(posts, "attention currency")]).toEqual(["c"]);
    expect(matchPosts(posts, "calm currency").size).toBe(0);
  });
});

describe("region names", () => {
  it("title-cases map names and keeps acronyms", () => {
    expect(titleCase("ai & running")).toBe("AI & Running");
    expect(titleCase("book review & artificial intelligence")).toBe("Book Review & Artificial Intelligence");
    expect(titleCase("भटकंती")).toBe("भटकंती");
  });

  it("breaks a long name before its ampersand", () => {
    expect(splitLabel("Digital Wellbeing & Social Media")).toEqual(["Digital Wellbeing", "& Social Media"]);
    expect(splitLabel("Musings")).toEqual(["Musings"]);
  });
});

describe("prologueLayouts", () => {
  const posts = Array.from({ length: 40 }, (_, i) => post(`p${i}`, `202${Math.floor(i / 10)}-0${(i % 9) + 1}-01`, {
    lang: i % 4 ? "en" : "mr", words: 400 + i * 50, xy: [(i % 7) / 6, (i % 5) / 4],
  }));

  it("keeps every dot of every arrangement inside the figure", () => {
    const { layouts } = prologueLayouts(posts, 640, 400);
    expect(layouts).toHaveLength(5);
    layouts.forEach((dots) => {
      expect(dots).toHaveLength(posts.length);
      dots.forEach((d) => {
        expect(d.x - d.r).toBeGreaterThanOrEqual(0);
        expect(d.x + d.r).toBeLessThanOrEqual(640);
        expect(d.y - d.r).toBeGreaterThanOrEqual(0);
        expect(d.y + d.r).toBeLessThanOrEqual(400);
      });
    });
  });

  it("puts Marathi below the midline and English above it", () => {
    const { layouts, mid } = prologueLayouts(posts, 640, 400);
    posts.forEach((p, i) => {
      if (p.lang === "mr") expect(layouts[2][i].y).toBeGreaterThan(mid);
      else expect(layouts[2][i].y).toBeLessThan(mid);
    });
  });
});

describe("pickLine", () => {
  it("draws a year first, so a rare year is as likely as a busy one", () => {
    const lines = [
      ...Array.from({ length: 90 }, (_, i) => ({ id: `n${i}`, y: 2026 })),
      ...Array.from({ length: 10 }, (_, i) => ({ id: `o${i}`, y: 2020 })),
    ];
    const seq = [0.1, 0.5, 0.9, 0.3];
    let k = 0;
    const rand = () => { k += 1; return seq[(k - 1) % seq.length]; };
    const years = Array.from({ length: 200 }, () => pickLine(lines, (l) => l.y, rand).y);
    const old = years.filter((y) => y === 2020).length;
    expect(old).toBeGreaterThan(60);
    expect(pickLine([], (l) => l.y)).toBeNull();
  });
});
