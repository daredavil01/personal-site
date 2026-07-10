import { isNightHour, resolveTime } from "./timeOfDay";

const at = (hour) => new Date(2026, 6, 9, hour, 30, 0);

describe("timeOfDay", () => {
  it("treats 19:00–06:00 as night, boundaries included/excluded correctly", () => {
    expect(isNightHour(19)).toBe(true); // night starts at 19:00
    expect(isNightHour(23)).toBe(true);
    expect(isNightHour(0)).toBe(true);
    expect(isNightHour(5)).toBe(true);
    expect(isNightHour(6)).toBe(false); // day starts at 06:00
    expect(isNightHour(12)).toBe(false);
    expect(isNightHour(18)).toBe(false);
  });

  it("auto derives from the local clock", () => {
    expect(resolveTime("auto", at(21))).toBe("night");
    expect(resolveTime("auto", at(9))).toBe("day");
  });

  it("explicit preference wins over the clock", () => {
    expect(resolveTime("day", at(23))).toBe("day");
    expect(resolveTime("night", at(9))).toBe("night");
  });

  it("junk preferences fall back to auto", () => {
    expect(resolveTime("dusk", at(9))).toBe("day");
    expect(resolveTime(undefined, at(23))).toBe("night");
  });
});
