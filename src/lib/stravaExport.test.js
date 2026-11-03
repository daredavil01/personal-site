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
