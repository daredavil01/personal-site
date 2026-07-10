import migrate from "./migrate";
import { defaultState, VISIT_DAYS_CAP } from "./storage";

const NOW = new Date("2026-07-09T10:00:00.000Z");
const NOW_ISO = NOW.toISOString();

describe("migrate", () => {
  it("returns defaults when nothing is stored and there is no legacy state", () => {
    expect(migrate(null, {}, NOW)).toEqual(defaultState());
  });

  it("returns defaults for corrupt / non-object raw values", () => {
    expect(migrate("garbage", {}, NOW)).toEqual(defaultState());
    expect(migrate(42, {}, NOW)).toEqual(defaultState());
    expect(migrate([1, 2], {}, NOW)).toEqual(defaultState());
  });

  it("seeds visitedRegions and stamps from the legacy globe tracker", () => {
    const state = migrate(null, { visitedWorlds: ["reader", "treks"], allCelebrated: false }, NOW);
    expect(state.visitedRegions).toEqual({ reader: NOW_ISO, treks: NOW_ISO });
    expect(state.stamps.reader).toEqual({ first: NOW_ISO, migrated: true });
    expect(state.stamps.treks).toEqual({ first: NOW_ISO, migrated: true });
    expect(state.quests.explorer).toBeUndefined();
  });

  it("seeds the Explorer quest from globe-all-worlds-celebrated", () => {
    const state = migrate(null, { visitedWorlds: [], allCelebrated: true }, NOW);
    expect(state.quests.explorer).toEqual({ done: NOW_ISO, migrated: true });
  });

  it("ignores junk entries in the legacy visited list", () => {
    const state = migrate(null, { visitedWorlds: ["reader", 7, null, ""] }, NOW);
    expect(Object.keys(state.visitedRegions)).toEqual(["reader"]);
  });

  it("passes existing v1 state through untouched (no legacy re-seeding)", () => {
    const existing = {
      ...defaultState(),
      view: "classic",
      sound: true,
      introSeen: true,
      visitedRegions: { creator: "2026-01-01T00:00:00.000Z" },
      stamps: { creator: { first: "2026-01-01T00:00:00.000Z" } },
    };
    const state = migrate(existing, { visitedWorlds: ["reader"], allCelebrated: true }, NOW);
    expect(state.visitedRegions).toEqual({ creator: "2026-01-01T00:00:00.000Z" });
    expect(state.quests.explorer).toBeUndefined();
    expect(state.view).toBe("classic");
    expect(state.sound).toBe(true);
  });

  it("repairs shape drift in stored v1 state", () => {
    const state = migrate(
      { version: 1, view: "bogus", time: "midnight", visitedRegions: "nope", visitDays: [3, "2026-07-01"] },
      {},
      NOW,
    );
    expect(state.view).toBeNull();
    expect(state.time).toBe("auto");
    expect(state.visitedRegions).toEqual({});
    expect(state.visitDays).toEqual(["2026-07-01"]);
  });

  it("caps visitDays at the newest VISIT_DAYS_CAP entries", () => {
    const days = Array.from({ length: 40 }, (_, i) => `2026-06-${String(i + 1).padStart(2, "0")}`);
    const state = migrate({ ...defaultState(), visitDays: days }, {}, NOW);
    expect(state.visitDays).toHaveLength(VISIT_DAYS_CAP);
    expect(state.visitDays[0]).toBe(days[days.length - VISIT_DAYS_CAP]);
    expect(state.visitDays[state.visitDays.length - 1]).toBe(days[days.length - 1]);
  });

  it("treats unknown future versions as absent (defaults + legacy seed)", () => {
    const state = migrate({ version: 99, anything: true }, { visitedWorlds: ["person"] }, NOW);
    expect(state.version).toBe(1);
    expect(state.visitedRegions.person).toBe(NOW_ISO);
  });
});
