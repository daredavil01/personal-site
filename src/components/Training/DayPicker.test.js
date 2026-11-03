import { notableDays } from "./DayPicker";

const r = (id, date, sport, distance, extra = {}) => ({
  id, date, sport, distance, elevationGain: 0, ...extra,
});

test("each chip a different day, the moments in a fixed order", () => {
  const rows = [
    r(1, "2026-11-02", "Walk", 1500),
    r(2, "2026-11-01", "Run", 35000, { elevationGain: 120 }),
    r(3, "2026-10-20", "Hike", 7000, { elevationGain: 600 }),
    r(4, "2026-10-19", "WeightTraining", 0),
    r(5, "2026-10-18", "Run", 21100, { workoutType: 1 }),
  ];
  expect(notableDays(rows).map((d) => [d.key, d.row.id])).toEqual([
    ["latest", 2], ["climb", 3], ["race", 5], ["gym", 4],
  ]);
  expect(notableDays([])).toEqual([]);
});
