import {
  STORAGE_KEY, LEGACY_VISITED_KEY, LEGACY_CELEBRATED_KEY, PREVIEW_KEY,
  readRaw, readLegacyGlobeKeys, writeState, createDebouncedPersist,
  readPreviewFlag, writePreviewFlag, defaultState,
} from "./storage";

beforeEach(() => {
  window.localStorage.clear();
});

describe("storage", () => {
  it("readRaw returns null when nothing is stored", () => {
    expect(readRaw()).toBeNull();
  });

  it("readRaw round-trips through writeState", () => {
    const state = { ...defaultState(), sound: true };
    writeState(state);
    expect(readRaw()).toEqual(state);
  });

  it("readRaw returns null (not a throw) on corrupt JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    expect(readRaw()).toBeNull();
  });

  it("readLegacyGlobeKeys parses the old globe tracker keys", () => {
    window.localStorage.setItem(LEGACY_VISITED_KEY, JSON.stringify(["reader", "person"]));
    window.localStorage.setItem(LEGACY_CELEBRATED_KEY, "true");
    expect(readLegacyGlobeKeys()).toEqual({ visitedWorlds: ["reader", "person"], allCelebrated: true });
  });

  it("readLegacyGlobeKeys tolerates absent or corrupt legacy keys", () => {
    expect(readLegacyGlobeKeys()).toEqual({ visitedWorlds: null, allCelebrated: false });
    window.localStorage.setItem(LEGACY_VISITED_KEY, "not json");
    expect(readLegacyGlobeKeys().visitedWorlds).toBeNull();
  });

  it("debounced persist batches rapid writes into the last one", () => {
    jest.useFakeTimers();
    const persist = createDebouncedPersist(400);
    persist({ ...defaultState(), sound: false });
    persist({ ...defaultState(), sound: true });
    expect(readRaw()).toBeNull(); // nothing written yet
    jest.advanceTimersByTime(400);
    expect(readRaw().sound).toBe(true);
    jest.useRealTimers();
  });

  it("preview flag round-trips and removes cleanly", () => {
    expect(readPreviewFlag()).toBe(false);
    writePreviewFlag(true);
    expect(readPreviewFlag()).toBe(true);
    expect(window.localStorage.getItem(PREVIEW_KEY)).toBe("1");
    writePreviewFlag(false);
    expect(readPreviewFlag()).toBe(false);
    expect(window.localStorage.getItem(PREVIEW_KEY)).toBeNull();
  });
});
