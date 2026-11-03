import {
  CLIMB_METRES, fitBeats, poseFor, positionAt, storyOf,
} from "./dayStory";

const split = (n, { speed = 3, stop = 0, climb = 0, hr = 150, distance = 1000 } = {}) => ({
  split: n, distance, moving_time: Math.round(distance / speed), elapsed_time: Math.round(distance / speed) + stop, average_speed: speed, elevation_difference: climb, average_heartrate: hr,
});

const SPLITS = [
  split(1, { speed: 3, hr: 140 }),
  split(2, { speed: 3.4, hr: 150 }), // fastest
  split(3, { speed: 3, stop: 130, hr: 148 }), // the stop
  split(4, { speed: 2.4, climb: 22, hr: 171 }), // climb + heart peak, slow
  split(5, { speed: 3.6, distance: 400, hr: 160 }), // a fast partial km is not "fastest"
];

test("the day's moments, in order along the way", () => {
  const s = storyOf(SPLITS, { sport: "Run", startLocal: "2026-10-31T06:21:10" });
  expect(s.points).toHaveLength(6);
  expect(s.points[5].km).toBeCloseTo(4.4);
  expect(s.points[4].elev).toBe(22);
  const kinds = Object.fromEntries(s.beats.filter((b) => b.kind !== "pace").map((b) => [b.kind, b]));
  expect(kinds.start).toMatchObject({ i: 0, detail: "06:21", pose: "stand" });
  expect(kinds.fastest).toMatchObject({ i: 2, pose: "fast" });
  expect(kinds.stop).toMatchObject({ i: 3, pose: "rest", detail: 130 });
  expect(kinds.climb).toMatchObject({ i: 4, detail: 22, pose: "climb" });
  expect(kinds.heart).toMatchObject({ i: 4, detail: 171 });
  expect(kinds.finish).toMatchObject({ i: 5, pose: "summit" });
  expect(s.beats.map((b) => b.i)).toEqual([...s.beats.map((b) => b.i)].sort((a, b) => a - b));
});

test("a short pause does not sit a pace figure down", () => {
  const s = storyOf([
    split(1), split(2, { stop: 70 }), split(3, { stop: 400 }), split(4, { stop: 900 }), split(5),
  ], { sport: "Hike" });
  const pose = (i) => s.beats.find((b) => b.i === i).pose;
  expect(pose(2)).toBe("hike"); // 70 s of a 403 s km
  expect(pose(3)).toBe("rest"); // 400 s of a 733 s km
  expect(s.beats.find((b) => b.kind === "stop").i).toBe(4);
});

test("pace decides the stride; the sport decides the figure", () => {
  expect(poseFor("run", 3.3, 3)).toBe("fast");
  expect(poseFor("run", 2.5, 3)).toBe("walk");
  expect(poseFor("run", 3, 3)).toBe("run");
  expect(poseFor("hike", 1, 1)).toBe("hike");
  expect(poseFor("ride", 9, 8)).toBe("ride");
});

test("no stop, no climb: no figure for them", () => {
  const s = storyOf([split(1), split(2, { climb: CLIMB_METRES - 1 })], { sport: "Walk" });
  expect(s.beats.some((b) => b.kind === "stop" || b.kind === "climb")).toBe(false);
  expect(storyOf([split(1)])).toBeNull();
  expect(storyOf(null)).toBeNull();
});

test("fitting: start and finish always stay, then by priority", () => {
  const s = storyOf(SPLITS, { sport: "Run" });
  const kept = fitBeats(s.beats, (i) => i * 50, 64);
  expect(kept[0].kind).toBe("start");
  expect(kept[kept.length - 1].kind).toBe("finish");
  kept.slice(1).forEach((b, k) => {
    if (b.priority !== 0 && kept[k].priority !== 0) expect(b.i * 50 - kept[k].i * 50).toBeGreaterThanOrEqual(64);
  });
  expect(kept.some((b) => b.kind === "stop")).toBe(true);
});

test("the replay walks, then waits at the stop", () => {
  const s = storyOf(SPLITS, { sport: "Run" });
  expect(positionAt(s.points, 0).p).toBe(0);
  const end2 = s.points[2].at;
  expect(positionAt(s.points, end2 + 100).p).toBeCloseTo(2 + 100 / 333, 2);
  expect(positionAt(s.points, s.points[3].at - 10)).toEqual({ p: 3, stopped: true });
  expect(positionAt(s.points, 1e9).p).toBe(5);
});
