import {
  DEMO_ID_BASE, demoActivities, demoActivity, demoBestEfforts, demoGear, isDemoId,
} from "./trainingDemo";
import { decodePolyline } from "./strava";
import { sportFamily, totals } from "./training";

// The sample log /training shows until the first Strava import: it has to be
// the same for every visitor, look like a real log, and never collide with a
// real activity id.

const rows = demoActivities();

test("deterministic: the same rows every time", () => {
  expect(rows.length).toBeGreaterThan(800);
  expect(rows[0].id).toBe(demoActivities()[0].id);
  expect(totals(rows).distance).toBe(totals(demoActivities()).distance);
});

test("rows are the fromActivityRow shape, newest first, every id a sample id", () => {
  const keys = ["id", "name", "sport", "date", "startDate", "startLocal", "distance", "movingTime", "averageSpeed", "splits", "bestEfforts", "extra", "tags"];
  rows.forEach((r) => keys.forEach((k) => expect(r).toHaveProperty(k)));
  expect(rows.every((r) => isDemoId(r.id))).toBe(true);
  expect(rows.every((r, i) => !i || rows[i - 1].startDate >= r.startDate)).toBe(true);
  expect(isDemoId(DEMO_ID_BASE - 1)).toBe(false);
  expect(isDemoId(17654321098)).toBe(false); // a real-looking Strava id
});

test("a log worth drawing: several sports, routes that decode, splits for runs", () => {
  const families = new Set(rows.map((r) => sportFamily(r.sport)));
  ["run", "ride", "hike", "swim", "walk"].forEach((f) => expect(families.has(f)).toBe(true));
  const withRoute = rows.filter((r) => r.route);
  expect(withRoute.length).toBeGreaterThan(rows.length * 0.8);
  expect(decodePolyline(withRoute[0].route).length).toBeGreaterThan(2);
  expect(rows.filter((r) => r.sport === "Swim").every((r) => !r.route)).toBe(true);
  const long = rows.find((r) => r.sport === "Run" && r.distance > 20000);
  expect(long.splits.length).toBe(Math.floor(long.distance / 1000));
});

test("best efforts get faster year on year; gear mileage adds up", () => {
  const fiveK = demoBestEfforts().filter((e) => e.name === "5K").sort((a, b) => a.year - b.year);
  expect(fiveK.length).toBeGreaterThanOrEqual(3);
  expect(fiveK[fiveK.length - 1].elapsed_time).toBeLessThan(fiveK[0].elapsed_time);
  expect(demoActivity(fiveK[0].activity_id).date.slice(0, 4)).toBe(String(fiveK[0].year));
  const gear = demoGear();
  const used = rows.filter((r) => r.gearId).reduce((s, r) => s + r.distance, 0);
  expect(gear.reduce((s, g) => s + g.distance, 0)).toBe(used);
  expect(demoActivity("nope")).toBeNull();
});
