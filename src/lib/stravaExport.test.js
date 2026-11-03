import {
  activityFromCsv, bestEffortsOf, csvObjects, detailFromTrack, gearFromCsv, lapsOf, parseCsv,
  parseExportDate, rankBestEfforts, splitsOf, toLocal, toSportType, trackFromGpx, trackFromTcx,
  visibilityOf,
} from "./stravaExport";
import { decodePolyline, haversine } from "./strava";

// The shape of a real activities.csv: repeated headers (display units first,
// raw second), a quoted multi-line description, weather and athlete weight.
const CSV = [
  "Activity ID,Activity Date,Activity Name,Activity Type,Activity Description,Elapsed Time,Distance,Max Heart Rate,Relative Effort,Commute,Activity Private Note,Activity Gear,Filename,Athlete Weight,Elapsed Time,Moving Time,Distance,Max Speed,Average Speed,Elevation Gain,Elevation Low,Elevation High,Max Heart Rate,Average Heart Rate,Calories,Relative Effort,Commute,Weather Temperature,Media",
  "12345678901,\"Feb 22, 2026, 12:45:00 AM\",Pune Half,Run,\"Felt strong,\nthen \"\"cooked\"\"\",7012,\"21.14\",181,95,false,sore knee,Pegasus 40,activities/12345678901.fit.gz,70,7012,6950,21137.4,5.1,3.04,88,540,600,181.0,162.4,1400,95.0,false,24.5,media/a.jpg",
  "222,\"Mar 1, 2026, 1:15:30 PM\",Evening Ride,Virtual Ride,,3600,30.0,,,,,,,,3600,3500,30000,,8.5,10,,,,,,,,,",
].join("\n");

describe("CSV", () => {
  test("quoted commas, quotes and newlines survive", () => {
    const rows = parseCsv("a,b\n\"x, y\",\"he said \"\"hi\"\"\nthere\"\n");
    expect(rows).toEqual([["a", "b"], ["x, y", "he said \"hi\"\nthere"]]);
  });

  test("repeated headers are numbered, not overwritten", () => {
    const [row] = csvObjects(CSV);
    expect(row.Distance).toBe("21.14");
    expect(row["Distance (2)"]).toBe("21137.4");
    expect(row["Max Heart Rate (2)"]).toBe("181.0");
  });
});

describe("dates", () => {
  test("the export's English format is UTC", () => {
    expect(parseExportDate("Feb 22, 2026, 12:45:00 AM")).toBe("2026-02-22T00:45:00.000Z");
    expect(parseExportDate("Mar 1, 2026, 1:15:30 PM")).toBe("2026-03-01T13:15:30.000Z");
    expect(parseExportDate("Dec 31, 2025, 12:05:00 PM")).toBe("2025-12-31T12:05:00.000Z");
    expect(parseExportDate("22 févr. 2026")).toBeNull();
  });

  test("the local day can differ from the UTC day", () => {
    expect(toLocal("2026-02-21T20:00:00.000Z", "Asia/Kolkata")).toEqual({
      local: "2026-02-22T01:30:00", date: "2026-02-22",
    });
  });
});

describe("activityFromCsv", () => {
  const [run, ride] = csvObjects(CSV);
  const gearKinds = { "pegasus 40": "shoe" };

  test("maps the raw columns, keeps the rest in extra", () => {
    const { row, privateRow, file } = activityFromCsv(run, { gearKinds, now: "N" });
    expect(row).toMatchObject({
      id: 12345678901,
      name: "Pune Half",
      sport_type: "Run",
      start_date: "2026-02-22T00:45:00.000Z",
      start_date_local: "2026-02-22T06:15:00",
      date: "2026-02-22",
      distance: 21137.4,
      moving_time: 6950,
      elapsed_time: 7012,
      max_heartrate: 181,
      average_heartrate: 162.4,
      suffer_score: 95,
      calories: 1400,
      commute: false,
      manual: false,
      private: false,
      visibility: null,
      gear_id: "shoe:pegasus 40",
      description: "Felt strong,\nthen \"cooked\"",
      extra: { "Weather Temperature": "24.5" },
    });
    expect(privateRow).toEqual({
      activity_id: 12345678901, private_note: "sore knee", extra: { "Athlete Weight": "70" },
    });
    expect(file).toBe("activities/12345678901.fit.gz");
    expect(JSON.stringify(row)).not.toContain("media/a.jpg");
    expect(JSON.stringify(row)).not.toContain("sore knee");
  });

  test("every row has the same keys", () => {
    const a = activityFromCsv(run, { gearKinds }).row;
    const b = activityFromCsv(ride, { gearKinds }).row;
    expect(Object.keys(b)).toEqual(Object.keys(a));
    expect(b).toMatchObject({ sport_type: "VirtualRide", distance: 30000, manual: true, gear_id: null });
  });

  test("a visibility column is honoured when the export has one", () => {
    expect(visibilityOf({ "Activity Visibility": "Only Me" })).toEqual({ private: true, visibility: "only_me" });
    expect(visibilityOf({ Visibility: "followers_only" })).toEqual({ private: false, visibility: "followers_only" });
    expect(visibilityOf({ Visibility: "everyone" })).toEqual({ private: false, visibility: "everyone" });
    expect(visibilityOf({ "Activity Private Note": "x" })).toEqual({ private: false, visibility: null });
  });

  test("sport names match the API's", () => {
    expect(toSportType("E-Bike Ride")).toBe("EBikeRide");
    expect(toSportType("Trail Run")).toBe("TrailRun");
  });
});

test("gear rows", () => {
  const rows = csvObjects("Shoe Name,Shoe Brand,Shoe Model,Shoe Default Sport Types\nPegasus 40,Nike,Pegasus,Run\n");
  expect(gearFromCsv(rows, "shoe", { now: "N" })).toEqual([{
    id: "shoe:pegasus 40", kind: "shoe", name: "Pegasus 40", brand_name: "Nike", model_name: "Pegasus", description: "Run", synced_at: "N",
  }]);
});

// A straight 3.3 km run north at exactly 5:00/km, one point every 10 m.
const steady = (km = 3.3) => {
  const n = Math.round(km * 100);
  return Array.from({ length: n + 1 }, (_, i) => ({
    t: 1000 + i * 3, lat: 18.52 + i * 0.00008993, lng: 73.85, ele: 500 + (i % 10), dist: i * 10, hr: 150,
  }));
};

describe("GPS files", () => {
  test("GPX track points, distance from coordinates", () => {
    const gpx = `<?xml version="1.0"?><gpx><trk><trkseg>
      <trkpt lat="18.5200" lon="73.8500"><ele>560</ele><time>2026-02-22T00:45:00Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>140</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>
      <trkpt lat="18.5210" lon="73.8500"><ele>561</ele><time>2026-02-22T00:45:30Z</time></trkpt>
    </trkseg></trk></gpx>`;
    const { points } = trackFromGpx(gpx);
    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({ lat: 18.52, lng: 73.85, ele: 560, hr: 140, dist: 0 });
    expect(points[1].dist).toBeCloseTo(111, 0);
    expect(points[1].t - points[0].t).toBe(30);
  });

  test("TCX laps and track points", () => {
    const tcx = `<TrainingCenterDatabase><Activities><Activity Sport="Running">
      <Lap StartTime="2026-02-22T00:45:00Z"><TotalTimeSeconds>600</TotalTimeSeconds><DistanceMeters>2000</DistanceMeters>
        <AverageHeartRateBpm><Value>150</Value></AverageHeartRateBpm>
        <Track><Trackpoint><Time>2026-02-22T00:45:00Z</Time><Position><LatitudeDegrees>18.52</LatitudeDegrees><LongitudeDegrees>73.85</LongitudeDegrees></Position><DistanceMeters>0</DistanceMeters><HeartRateBpm><Value>140</Value></HeartRateBpm></Trackpoint>
        <Trackpoint><Time>2026-02-22T00:55:00Z</Time><DistanceMeters>2000</DistanceMeters></Trackpoint></Track></Lap>
      <Lap StartTime="2026-02-22T00:55:00Z"><TotalTimeSeconds>300</TotalTimeSeconds><DistanceMeters>1000</DistanceMeters>
        <Track><Trackpoint><Time>2026-02-22T01:00:00Z</Time><DistanceMeters>3000</DistanceMeters></Trackpoint></Track></Lap>
    </Activity></Activities></TrainingCenterDatabase>`;
    const { points, laps } = trackFromTcx(tcx);
    expect(points.map((p) => p.dist)).toEqual([0, 2000, 3000]);
    expect(points[0].hr).toBe(140);
    expect(laps).toHaveLength(2);
    expect(laps[0]).toMatchObject({ elapsed_time: 600, distance: 2000, average_heartrate: 150 });
    expect(lapsOf(laps)[1]).toMatchObject({ lap_index: 2, distance: 1000, average_speed: 3.333 });
  });
});

describe("computed detail", () => {
  test("splits per km, with a short last split", () => {
    const s = splitsOf(steady(3.3), 1000);
    expect(s.map((x) => x.split)).toEqual([1, 2, 3, 4]);
    expect(s[0]).toMatchObject({ distance: 1000, elapsed_time: 300, moving_time: 300, average_heartrate: 150 });
    expect(s[3].distance).toBe(300);
  });

  test("best efforts are exact on a steady pace", () => {
    const e = Object.fromEntries(bestEffortsOf(steady(5.2)).map((x) => [x.name, x.elapsed_time]));
    expect(e["1K"]).toBe(300);
    expect(e["5K"]).toBe(1500);
    expect(e["400m"]).toBe(120);
    expect(e["10K"]).toBeUndefined();
  });

  test("a faster middle kilometre is found", () => {
    // 3 s per 10 m, then a 2 s-per-10 m kilometre, then 3 s again.
    const at = (i) => {
      if (i <= 100) return i * 3;
      if (i <= 200) return 300 + (i - 100) * 2;
      return 500 + (i - 200) * 3;
    };
    const pts = steady(3).map((p, i) => ({ ...p, t: 1000 + at(i) }));
    expect(bestEffortsOf(pts).find((x) => x.name === "1K").elapsed_time).toBe(200);
  });

  test("PR ranks are as of the day, not as of today", () => {
    const rows = [
      { start_date: "2026-01-01", best_efforts: [{ name: "5K", elapsed_time: 1600 }] },
      { start_date: "2026-02-01", best_efforts: [{ name: "5K", elapsed_time: 1500 }] },
      { start_date: "2026-03-01", best_efforts: [{ name: "5K", elapsed_time: 1550 }] },
      { start_date: "2026-04-01", best_efforts: [{ name: "5K", elapsed_time: 1700 }] },
    ];
    rankBestEfforts(rows);
    expect(rows.map((r) => r.best_efforts[0].pr_rank)).toEqual([1, 1, 2, null]);
  });

  test("detailFromTrack trims the public route, keeps full GPS private", () => {
    const { detail, gps } = detailFromTrack({ points: steady(3), laps: [] }, { isRun: true, now: "N" });
    const route = decodePolyline(detail.route_polyline);
    route.forEach((p) => {
      expect(haversine(p, gps.start_latlng)).toBeGreaterThan(400);
      expect(haversine(p, gps.end_latlng)).toBeGreaterThan(400);
    });
    expect(gps.start_latlng).toEqual([18.52, 73.85]);
    expect(decodePolyline(gps.polyline).length).toBeGreaterThan(route.length);
    expect(detail.best_efforts.length).toBeGreaterThan(0);
    expect(detail.detail_synced_at).toBe("N");
  });

  test("an indoor file has splits but no route", () => {
    const pts = steady(2).map((p) => ({ ...p, lat: null, lng: null }));
    const { detail, gps } = detailFromTrack({ points: pts, laps: [] });
    expect(detail.route_polyline).toBeNull();
    expect(gps.start_latlng).toBeNull();
    expect(detail.splits_metric).toHaveLength(2);
    expect(detail.best_efforts).toBeNull();
  });
});

describe("files-only exports", () => {
  const {
    activityFromFit, activityFromGpx, defaultName, findDuplicates, sportTypeFromFit,
  } = require("./stravaExport"); // eslint-disable-line global-require

  test("FIT sports map to Strava sport types", () => {
    expect(sportTypeFromFit("running", "generic")).toEqual({ sportType: "Run", trainer: false });
    expect(sportTypeFromFit("running", "trail").sportType).toBe("TrailRun");
    expect(sportTypeFromFit("running", "indoor_running")).toEqual({ sportType: "Run", trainer: true });
    expect(sportTypeFromFit("training", "strength_training").sportType).toBe("WeightTraining");
    expect(sportTypeFromFit("training", "yoga").sportType).toBe("Yoga");
    expect(sportTypeFromFit("walking", null).sportType).toBe("Walk");
    expect(sportTypeFromFit("cycling", "virtual_activity").sportType).toBe("VirtualRide");
    expect(sportTypeFromFit("something_new", null).sportType).toBe("Workout");
  });

  test("names follow Strava's time of day", () => {
    expect(defaultName("Run", 6)).toBe("Morning Run");
    expect(defaultName("Walk", 13)).toBe("Afternoon Walk");
    expect(defaultName("WeightTraining", 18)).toBe("Evening Weight Training");
    expect(defaultName("Yoga", 22)).toBe("Night Yoga");
    expect(defaultName("Hike", 2)).toBe("Night Hike");
  });

  test("a FIT session becomes a full row in IST", () => {
    const fit = {
      sessions: [{
        sport: "running",
        sub_sport: "generic",
        start_time: "2026-10-31T00:51:10.000Z",
        total_elapsed_time: 4234.08,
        total_timer_time: 4200,
        total_distance: 10009.41,
        total_calories: 994,
        avg_heart_rate: 147,
        max_heart_rate: 162,
        avg_cadence: 80,
        total_ascent: 28,
        total_descent: 26,
        avg_speed: 2.364,
        max_speed: 2.95,
        avg_power: 214,
        avg_temperature: 28,
      }],
      file_ids: [{ product_name: "COROS PACE 3" }],
      records: [{ altitude: 566 }, { altitude: 580 }, { altitude: 560 }],
    };
    const { row, privateRow } = activityFromFit(fit, { id: "21962347491", now: "2026-11-03T00:00:00Z" });
    expect(row).toMatchObject({
      id: 21962347491,
      name: "Morning Run",
      sport_type: "Run",
      start_date: "2026-10-31T00:51:10Z",
      start_date_local: "2026-10-31T06:21:10",
      date: "2026-10-31",
      distance: 10009.41,
      moving_time: 4200,
      elapsed_time: 4234,
      total_elevation_gain: 28,
      elev_low: 560,
      elev_high: 580,
      average_heartrate: 147,
      has_heartrate: true,
      average_watts: 214,
      calories: 994,
      device_name: "COROS PACE 3",
      trainer: false,
    });
    expect(row.extra).toMatchObject({ source: "fit", "Average Temperature": 28, "Elevation Loss": 26 });
    expect(privateRow.activity_id).toBe(21962347491);
    expect(activityFromFit({ sessions: [] }, { id: 1 })).toBeNull();
  });

  test("a FIT row has the same keys as a CSV row", () => {
    const csvRow = activityFromCsv({ "Activity ID": "5", "Activity Date": "Feb 22, 2026, 12:45:00 AM", "Activity Type": "Run" }).row;
    const fitRow = activityFromFit({ sessions: [{ sport: "walking", start_time: "2026-01-01T00:00:00Z" }] }, { id: 5 }).row;
    expect(Object.keys(fitRow).filter((k) => !["device_name", "trainer"].includes(k)).sort()).toEqual(Object.keys(csvRow).sort());
  });

  test("a GPX file keeps its Strava name and computes its summary", () => {
    const gpx = `<?xml version="1.0"?><gpx><metadata><time>2024-07-09T00:51:07Z</time></metadata>
      <trk><name>Tuesday Slow Group Run</name><type>running</type><trkseg>
      <trkpt lat="18.5000" lon="73.8000"><ele>570</ele><time>2024-07-09T00:51:07Z</time></trkpt>
      <trkpt lat="18.5045" lon="73.8000"><ele>575</ele><time>2024-07-09T00:54:07Z</time></trkpt>
      <trkpt lat="18.5090" lon="73.8000"><ele>572</ele><time>2024-07-09T00:57:07Z</time></trkpt>
      </trkseg></trk></gpx>`;
    const { row } = activityFromGpx(gpx, { id: 11842427390 });
    expect(row.name).toBe("Tuesday Slow Group Run");
    expect(row.sport_type).toBe("Run");
    expect(row.date).toBe("2024-07-09");
    expect(row.distance).toBeGreaterThan(990);
    expect(row.distance).toBeLessThan(1010);
    expect(row.elapsed_time).toBe(360);
    expect(row.total_elevation_gain).toBe(5);
    expect(row.extra).toEqual({ source: "gpx" });
  });

  test("duplicates: same start and sport under another id, never the same id", () => {
    const existing = [{ id: 1, start_date: "2026-10-31T00:51:10Z", sport_type: "Run" }];
    const cands = [
      { id: 1, start_date: "2026-10-31T00:51:10Z", sport_type: "Run" }, // same row → update
      { id: 2, start_date: "2026-10-31T00:51:40Z", sport_type: "TrailRun" }, // same run, other id
      { id: 3, start_date: "2026-10-31T00:51:20Z", sport_type: "Walk" }, // other sport
      { id: 4, start_date: "2026-10-31T00:53:00Z", sport_type: "Run" }, // 110 s later
      { id: 5, start_date: "2026-11-01T06:00:00Z", sport_type: "Hike" },
      { id: 6, start_date: "2026-11-01T06:00:30Z", sport_type: "Hike" }, // dup within the batch
    ];
    expect(findDuplicates(cands, existing).map((d) => [d.row.id, d.of])).toEqual([[2, 1], [6, 5]]);
  });
});

describe("everything in the file", () => {
  const {
    profileOf, setsFromFit, profileFromTrack, splitsOf: splits, activityFromFit: fromFit,
  } = require("./stravaExport"); // eslint-disable-line global-require

  // A 2 km run, one point every 10 s at 3.33 m/s, climbing 10 m.
  const pts = Array.from({ length: 61 }, (_, i) => ({
    t: 1000 + i * 10, dist: i * 33.33, ele: 560 + i / 6, hr: 140 + (i % 5), speed: 3.33, cad: 84, watts: 210, step: 1190, gct: 250, vosc: 85, lat: 18.5, lng: 73.8,
  }));

  test("splits carry running dynamics when the watch records them", () => {
    const s = splits(pts);
    expect(s[0]).toMatchObject({
      average_cadence: 84, average_watts: 210, average_step_length: 1190, average_ground_contact: 250, average_vertical_oscillation: 85,
    });
    const bare = splits(pts.map(({ t, dist, ele }) => ({ t, dist, ele })));
    expect(bare[0]).not.toHaveProperty("average_cadence");
  });

  test("the profile is thinned, by distance, and never holds a position", () => {
    const p = profileOf(pts, 20);
    expect(p.by).toBe("distance");
    expect(p.x.length).toBeLessThanOrEqual(20);
    expect(p.x[p.x.length - 1]).toBe(2000);
    expect(p.t[p.t.length - 1]).toBe(600);
    ["e", "h", "v", "c", "w", "s", "g", "o"].forEach((k) => expect(p[k]).toHaveLength(p.x.length));
    expect(JSON.stringify(p)).not.toMatch(/18\.5|73\.8/);
    const still = profileOf(pts.map((q) => ({ t: q.t, dist: 0, hr: q.hr })));
    expect(still.by).toBe("time");
    expect(Object.keys(still).sort()).toEqual(["by", "h", "t", "x"]);
  });

  test("strength sets come through, and summarise into extra", () => {
    const fit = {
      sessions: [{ sport: "training", sub_sport: "strength_training", start_time: "2026-05-20T00:42:38Z" }],
      sets: [
        { set_type: "active", start_time: "2026-05-20T00:43:38Z", duration: 45.2, repetitions: 12, category: ["bench_press"] },
        { set_type: "rest", start_time: "2026-05-20T00:44:23Z", duration: 90 },
        { set_type: "active", start_time: "2026-05-20T00:45:53Z", duration: 40, repetitions: 10, category: ["squat"], weight: 60 },
      ],
    };
    expect(setsFromFit(fit)).toEqual([
      { type: "active", start: 60, duration: 45, reps: 12, category: "bench press", weight: null },
      { type: "rest", start: 105, duration: 90, reps: null, category: null, weight: null },
      { type: "active", start: 195, duration: 40, reps: 10, category: "squat", weight: 60 },
    ]);
    expect(fromFit(fit, { id: 9 }).row.extra).toMatchObject({ Sets: 2, Repetitions: 22, Exercises: "bench press, squat" });
    expect(profileFromTrack({ points: [] }, fit).sets).toHaveLength(3);
    expect(profileFromTrack({ points: [] }, null)).toBeNull();
  });
});

describe("deep stats", () => {
  const { deepStatsOf } = require("./stravaExport"); // eslint-disable-line global-require
  // 10 km in 10 s steps: first half 3.33 m/s at 140 bpm, second half 3.0 m/s at 150 bpm.
  const pts = [];
  let d = 0;
  for (let i = 0; i <= 3200; i += 1) {
    const second = d >= 5000;
    pts.push({
      t: i * 10, dist: d, hr: second ? 150 : 140, speed: second ? 3 : 3.33, watts: second ? 200 : 260, ele: 500 + (i % 50), cad: 80,
    });
    d += second ? 30 : 33.3;
    if (d > 10000) break;
  }
  const fit = {
    sessions: [{ total_cycles: 4500, avg_temperature: 30 }],
    laps: [{ avg_temperature: 27 }, { avg_temperature: 34 }],
  };

  test("bins, halves, drift, peaks, steps", () => {
    const s = deepStatsOf({ points: pts }, fit, { sportType: "Run" });
    const binned = Object.values(s.hrBins).reduce((a, b) => a + b, 0);
    expect(binned).toBe((pts.length - 1) * 10);
    expect(Object.keys(s.hrBins).sort()).toEqual(["140", "150"]);
    expect(s.negSplit).toBeGreaterThan(0); // second half slower
    expect(s.drift).toBeGreaterThan(15); // more heart per metre
    expect(s).toMatchObject({
      tMax: 34, tMin: 27, pMax: 260, vMax: 3.33, altMax: 549, altMin: 500, steps: 9000,
    });
    expect(s.streams).toEqual(expect.arrayContaining(["hr", "speed", "cad", "ele", "watts"]));
    expect(s.streams).not.toContain("lat");
  });

  test("a walk has no drift; nothing without a track", () => {
    const s = deepStatsOf({ points: pts }, fit, { sportType: "Walk" });
    expect(s.drift).toBeUndefined();
    expect(s.steps).toBe(9000);
    expect(deepStatsOf({ points: [] })).toBeNull();
    expect(deepStatsOf({ points: pts }, null, { sportType: "WeightTraining" }).steps).toBeUndefined();
  });
});
