import {
  decodePolyline, encodePolyline, formatDistance, formatDuration, formatPace, haversine,
  matchRace, sportLabel, trimRoute,
} from "./strava";

// Google's documented example.
const EXAMPLE = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";
const EXAMPLE_POINTS = [[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]];

describe("polylines", () => {
  test("decodes and encodes Google's example", () => {
    expect(decodePolyline(EXAMPLE)).toEqual(EXAMPLE_POINTS);
    expect(encodePolyline(EXAMPLE_POINTS)).toBe(EXAMPLE);
  });

  test("haversine is about 111 km per degree of latitude", () => {
    expect(haversine([0, 0], [1, 0])).toBeGreaterThan(110000);
    expect(haversine([0, 0], [1, 0])).toBeLessThan(112000);
  });

  test("trimRoute drops every point near either end", () => {
    // Points 1.1 km apart: the start and finish fall away, the middle stays.
    const route = encodePolyline([[18.52, 73.85], [18.53, 73.85], [18.54, 73.85], [18.55, 73.85]]);
    const trimmed = decodePolyline(trimRoute(route, 400));
    expect(trimmed).toEqual([[18.53, 73.85], [18.54, 73.85]]);
  });

  test("a loop from home loses the part that returns to the door", () => {
    const loop = encodePolyline([[18.52, 73.85], [18.54, 73.85], [18.54, 73.87], [18.5201, 73.8501]]);
    const kept = decodePolyline(trimRoute(loop, 400));
    kept.forEach((p) => expect(haversine(p, [18.52, 73.85])).toBeGreaterThan(400));
  });

  test("trimRoute returns null when too little is left", () => {
    expect(trimRoute(encodePolyline([[18.52, 73.85], [18.5205, 73.85]]), 400)).toBeNull();
    expect(trimRoute("", 400)).toBeNull();
    expect(trimRoute(null)).toBeNull();
  });
});

describe("display", () => {
  test("formats", () => {
    expect(formatDuration(3723)).toBe("1:02:03");
    expect(formatDuration(403)).toBe("6:43");
    expect(formatPace(1000 / 312)).toBe("5:12 /km");
    expect(formatDistance(21137)).toBe("21.1 km");
    expect(formatDistance(850)).toBe("850 m");
    expect(formatDistance(0)).toBe("");
    expect(sportLabel("TrailRun")).toBe("Trail Run");
  });
});

describe("matchRace", () => {
  const sports = [
    { id: 1, date: "February 22, 2026", distance: "21 Kms" },
    { id: 2, date: "January 18, 2026", distance: "42 Kms" },
  ];

  test("same day and a close distance", () => {
    expect(matchRace({ date: "2026-02-22", distance: 21137 }, sports)).toBe(1);
    expect(matchRace({ date: "2026-01-18", distance: 42420 }, sports)).toBe(2);
  });

  test("a training run on race day is not the race", () => {
    expect(matchRace({ date: "2026-02-22", distance: 5000 }, sports)).toBeNull();
    expect(matchRace({ date: "2026-03-01", distance: 21100 }, sports)).toBeNull();
  });
});
