import {
  factsOf, inventory, zonesOf, VARIABLES,
} from "./trainingFacts";

const row = (id, date, sport, distance, more = {}) => ({
  id,
  date,
  sport,
  distance,
  movingTime: distance / 3 || 1800,
  elapsedTime: (distance / 3 || 1800) + 60,
  elevationGain: 10,
  startLocal: `${date}T06:10:00`,
  averageSpeed: 3,
  maxHeartrate: 170,
  averageCadence: 80,
  calories: 400,
  name: `${sport} ${id}`,
  extra: {
    "Min Heart Rate": 60,
    "Average Temperature": 28,
    _stats: {
      hrBins: { 100: 600, 140: 1200, 160: 300 }, steps: 6000, tMax: 31, tMin: 25, altMax: 600, vMax: 4, streams: ["hr", "speed", "lat"],
    },
  },
  ...more,
});

const ROWS = [
  row(1, "2026-01-04", "Run", 10000),
  row(2, "2026-01-05", "Run", 12000, { averageSpeed: 3.4 }),
  row(3, "2026-01-05", "Walk", 3000, { maxHeartrate: 195 }),
  row(4, "2026-01-06", "WeightTraining", 0, { extra: { Repetitions: 300, "Min Heart Rate": 48 } }),
  row(5, "2026-01-20", "Hike", 7000, { elevationGain: 600 }),
];

test("inventory counts who carries what, by source", () => {
  const inv = inventory(ROWS);
  const by = Object.fromEntries(inv.map((v) => [v.key, v.count]));
  expect(by.distance).toBe(4);
  expect(by.reps).toBe(1);
  expect(by.zones).toBe(4);
  expect(by.sPos).toBe(4);
  expect(by.sPow).toBeUndefined(); // nobody recorded power: not listed
  expect(new Set(VARIABLES.map((v) => v.key)).size).toBe(VARIABLES.length);
});

test("zones are shares of time against the max", () => {
  const z = zonesOf(ROWS, 200);
  expect(z.map((x) => x.from)).toEqual([100, 120, 140, 160, 180]);
  expect(z.reduce((a, x) => a + x.share, 0)).toBeCloseTo(1);
  expect(zonesOf([], 200)).toBeNull();
});

test("facts: grouped, linked, never zero", () => {
  const groups = factsOf(ROWS, { today: "2026-01-21" });
  const g = Object.fromEntries(groups.map((x) => [x.id, x]));
  const f = (id, label) => g[id].facts.find((x) => x.label === label);
  expect(f("volume", "Active days").value).toBe("4");
  expect(f("volume", "Steps").n).toBe(24000);
  expect(f("habits", "Favourite hour").value).toBe("6 am");
  expect(f("habits", "Longest streak").value).toBe("3 days");
  expect(f("habits", "Doubles").value).toBe("1 day");
  expect(f("habits", "Longest break").value).toBe("13 days");
  // A stray activity years earlier does not become the "longest break".
  const withOld = factsOf([row(9, "2024-07-09", "Run", 5000), ...ROWS], { today: "2026-01-21" });
  const habits = withOld.find((x) => x.id === "habits").facts;
  expect(habits.find((x) => x.label === "Longest break").value).toBe("13 days");
  expect(withOld[0].facts.find((x) => x.label === "Active days").detail).toMatch(/plus 1 earlier/);
  expect(f("bests", "Longest").to).toBe("/training/2");
  expect(f("bests", "Biggest climb").to).toBe("/training/5");
  expect(f("bests", "Highest heart rate").value).toBe("195 bpm");
  expect(f("heart", "Lowest recorded").value).toBe("48 bpm");
  expect(f("strength", "Repetitions").value).toBe("300");
  // Nothing recorded power: no power fact, rather than "0 W".
  expect(g.form.facts.find((x) => x.label === "Power")).toBeUndefined();
  groups.forEach((gr) => gr.facts.forEach((x) => expect(String(x.value)).not.toMatch(/^0( |$)/)));
  expect(factsOf([])).toEqual([]);
});

describe("the Engine lens", () => {
  // eslint-disable-next-line global-require
  const { formTrends, stepStats } = require("./trainingFacts");
  const run = (date, steps, cadence, speed) => ({
    id: date, date, sport: "Run", distance: 8000, averageSpeed: speed, averageCadence: cadence, extra: { _stats: { steps } },
  });
  const log = [run("2026-01-05", 9000, 78, 2.5), run("2026-01-20", 11000, 80, 2.6), run("2026-02-03", 10000, 80, 2.7), run("2026-03-09", 12000, 82, 2.8)];

  it("adds up steps and finds the biggest session and month", () => {
    const s = stepStats(log);
    expect(s.total).toBe(42000);
    expect(s.biggest.steps).toBe(12000);
    expect(s.bestMonth).toEqual({ month: "2026-01", steps: 20000 });
    expect(s.families[0]).toMatchObject({ family: "run", share: 1 });
    expect(stepStats([{ date: "2026-01-01", sport: "Run", extra: {} }])).toBeNull();
  });

  it("averages form by month and needs three months", () => {
    const t = formTrends(log);
    const cadence = t.find((x) => x.key === "cadence");
    expect(cadence.series.map((p) => p.value)).toEqual([158, 160, 164]);
    expect(cadence.text).toEqual({ first: "158", last: "164" });
    expect(t.find((x) => x.key === "stride")).toBeUndefined();
    expect(formTrends(log.slice(0, 3))).toEqual([]);
  });
});
