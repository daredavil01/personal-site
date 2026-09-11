import {
  parseProjectDate, projectYear, formatProjectDate, formatProjectMonth, projectTime,
} from "../../lib/projectDate";

// The column is a real Postgres date since 0005, so there is one format on the
// wire — but it is nullable, and every caller renders unconditionally, so the
// null path is the one that actually breaks pages.
describe("projectDate", () => {
  it("parses an ISO date at local midnight, not UTC", () => {
    const d = parseProjectDate("2026-08-01");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(1);
  });

  it.each([null, undefined, "", "   ", "August 2026", "not a date", "2026-8-1"])(
    "returns null for %p rather than an Invalid Date",
    (value) => {
      expect(parseProjectDate(value)).toBeNull();
      expect(projectYear(value)).toBeNull();
      expect(projectTime(value)).toBeNull();
      expect(formatProjectDate(value)).toBe("");
      expect(formatProjectMonth(value)).toBe("");
    },
  );

  it("extracts the year", () => {
    expect(projectYear("2020-10-20")).toBe("2020");
  });

  it("formats a full date and a month", () => {
    expect(formatProjectDate("2020-11-20")).toBe("November 20, 2020");
    expect(formatProjectMonth("2026-03-01")).toBe("March 2026");
  });

  it("orders by projectTime ascending", () => {
    const dates = ["2026-08-01", "2020-10-20", "2026-03-01"];
    const sorted = [...dates].sort((a, b) => projectTime(a) - projectTime(b));
    expect(sorted).toEqual(["2020-10-20", "2026-03-01", "2026-08-01"]);
  });
});
