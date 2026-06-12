import {
  parseTimeToSeconds,
  getPBRaw,
  formatHoursMinutes,
  formatMinutesSeconds,
} from "./raceStats";

describe("parseTimeToSeconds", () => {
  it("parses HH:MM:SS", () => {
    expect(parseTimeToSeconds("01:26:40")).toBe(1 * 3600 + 26 * 60 + 40);
  });

  it("parses MM:SS", () => {
    expect(parseTimeToSeconds("48:12")).toBe(48 * 60 + 12);
  });

  it("returns 0 for empty or malformed input", () => {
    expect(parseTimeToSeconds("")).toBe(0);
    expect(parseTimeToSeconds(undefined)).toBe(0);
    expect(parseTimeToSeconds("abc")).toBe(0);
    expect(parseTimeToSeconds("1:2:3:4")).toBe(0);
  });
});

describe("getPBRaw", () => {
  const races = [
    { distance: "42 Kms", time: "04:30:00" },
    { distance: "42 Kms", time: "04:10:00" }, // faster marathon
    { distance: "21 Kms", time: "01:59:57" },
    { distance: "21K", time: "02:10:00" },
    { distance: "10K", time: "00:48:12" },
    { distance: "5K", time: "00:00:00" }, // zero time ignored
  ];

  it("returns the fastest race matching the distance pattern", () => {
    expect(getPBRaw(races, "42").time).toBe("04:10:00");
    expect(getPBRaw(races, "21").time).toBe("01:59:57");
    expect(getPBRaw(races, "10").time).toBe("00:48:12");
  });

  it("ignores races with a zero/unparseable time", () => {
    expect(getPBRaw(races, "5")).toBeNull();
  });

  it("returns null when no race matches and tolerates empty input", () => {
    expect(getPBRaw(races, "100")).toBeNull();
    expect(getPBRaw([], "42")).toBeNull();
    expect(getPBRaw(undefined, "42")).toBeNull();
  });
});

describe("formatHoursMinutes", () => {
  it("drops seconds from an HH:MM:SS time", () => {
    expect(formatHoursMinutes("01:59:57")).toBe("01:59");
    expect(formatHoursMinutes("4:10:00")).toBe("04:10");
  });

  it("returns two-part times unchanged and falls back to 00:00", () => {
    expect(formatHoursMinutes("48:12")).toBe("48:12");
    expect(formatHoursMinutes(undefined)).toBe("00:00");
  });
});

describe("formatMinutesSeconds", () => {
  it("renders MM:SS when the hours field is zero", () => {
    expect(formatMinutesSeconds("0:48:12")).toBe("48:12");
  });

  it("renders HH:MM when there is an hours component", () => {
    expect(formatMinutesSeconds("01:26:40")).toBe("01:26");
  });

  it("returns two-part times unchanged and falls back to 00:00", () => {
    expect(formatMinutesSeconds("48:12")).toBe("48:12");
    expect(formatMinutesSeconds(undefined)).toBe("00:00");
  });
});
