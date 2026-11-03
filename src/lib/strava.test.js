import {
  decodePolyline, encodePolyline, formatDistance, formatDuration, formatPace, haversine,
  localParts, matchRace, rateLimitFromHeaders, sportLabel, toDetailRow, toPrivateRow,
  toSummaryRow, trimRoute,
} from "./strava";

// Google's documented example.
const EXAMPLE = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";
const EXAMPLE_POINTS = [[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]];

const SUMMARY = {
  id: 12345678901,
  name: " Morning Run ",
  sport_type: "Run",
  type: "Run",
  workout_type: 1,
  start_date: "2026-02-22T00:45:00Z",
  start_date_local: "2026-02-22T06:15:00Z",
  timezone: "(GMT+05:30) Asia/Kolkata",
  distance: 21137.4,
  moving_time: 6950,
  elapsed_time: 7012,
  total_elevation_gain: 88,
  average_speed: 3.04,
  has_heartrate: true,
  average_heartrate: 162.4,
  kudos_count: 12,
  private: false,
  visibility: "everyone",
  gear_id: "g123",
  upload_id: 999,
  start_latlng: [18.52, 73.85],
  end_latlng: [18.53, 73.86],
  map: { id: "a1", summary_polyline: encodePolyline([[18.52, 73.85], [18.53, 73.85], [18.54, 73.85], [18.55, 73.85]]) },
};

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

describe("rows", () => {
  test("localParts keeps the wall-clock time and its day", () => {
    expect(localParts("2026-02-22T06:15:00Z")).toEqual({ local: "2026-02-22T06:15:00", date: "2026-02-22" });
    expect(localParts(null)).toEqual({ local: null, date: null });
  });

  test("toSummaryRow maps the list item and never carries raw GPS", () => {
    const row = toSummaryRow(SUMMARY, { now: "N" });
    expect(row).toMatchObject({
      id: 12345678901,
      name: "Morning Run",
      sport_type: "Run",
      workout_type: 1,
      date: "2026-02-22",
      start_date_local: "2026-02-22T06:15:00",
      distance: 21137.4,
      moving_time: 6950,
      private: false,
      synced_at: "N",
    });
    expect(row).not.toHaveProperty("start_latlng");
    expect(row).not.toHaveProperty("summary_polyline");
    expect(row).not.toHaveProperty("description");
    expect(row).not.toHaveProperty("visible");
    expect(row).not.toHaveProperty("sport_id");
    expect(typeof row.route_polyline).toBe("string");
  });

  test("every summary row has the same keys (one bulk upsert shape)", () => {
    expect(Object.keys(toSummaryRow({ id: 1 }))).toEqual(Object.keys(toSummaryRow(SUMMARY)));
  });

  test("toDetailRow slims splits, efforts and segments", () => {
    const row = toDetailRow({
      ...SUMMARY,
      description: "Felt good",
      calories: 1400,
      device_name: "Garmin",
      splits_metric: [{ split: 1, distance: 1000, moving_time: 300, elapsed_time: 301, average_speed: 3.3, extra: 1 }],
      best_efforts: [{ name: "5k", distance: 5000, elapsed_time: 1600, moving_time: 1600, pr_rank: 1, athlete: { id: 1 } }],
      segment_efforts: [{
        id: 9, name: "Hill", distance: 500, elapsed_time: 120, segment: { id: 5, start_latlng: [1, 2], average_grade: 4 },
      }],
      laps: [],
      photos: { count: 3 },
    }, { now: "N" });
    expect(row.description).toBe("Felt good");
    expect(row.splits_metric[0]).not.toHaveProperty("extra");
    expect(row.best_efforts[0]).toEqual({
      name: "5k", distance: 5000, elapsed_time: 1600, moving_time: 1600, pr_rank: 1,
    });
    expect(row.segment_efforts[0]).toMatchObject({ segment_id: 5, name: "Hill", average_grade: 4 });
    expect(JSON.stringify(row.segment_efforts)).not.toContain("latlng");
    expect(row.laps).toBeNull();
    expect(row).not.toHaveProperty("photos");
    expect(row.detail_synced_at).toBe("N");
  });

  test("toPrivateRow omits detail-only keys on a summary", () => {
    expect(toPrivateRow(SUMMARY)).toEqual({
      activity_id: 12345678901,
      summary_polyline: SUMMARY.map.summary_polyline,
      start_latlng: [18.52, 73.85],
      end_latlng: [18.53, 73.86],
    });
    const detail = toPrivateRow({ ...SUMMARY, private_note: "knee", map: { polyline: "abc" } }, { detail: true });
    expect(detail).toMatchObject({ polyline: "abc", private_note: "knee" });
  });
});

describe("rate limits", () => {
  const h = (o) => ({ get: (k) => o[k] ?? null });

  test("the tighter of overall and read budgets wins", () => {
    const l = rateLimitFromHeaders(h({
      "X-RateLimit-Limit": "200,2000",
      "X-RateLimit-Usage": "10,100",
      "X-ReadRateLimit-Limit": "100,1000",
      "X-ReadRateLimit-Usage": "95,400",
    }));
    expect(l.left15).toBe(5);
    expect(l.leftDay).toBe(600);
  });

  test("no headers, no answer", () => {
    expect(rateLimitFromHeaders(h({}))).toBeNull();
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
