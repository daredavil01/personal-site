// Date helpers for the homepage Monthly Digest dashboard.
//
// The four content types store their dates in three different formats, so a single
// normalizer is needed to bucket them into calendar months:
//   - blog  : blog_date "YYYY-MM-DD"
//   - trek  : date      "DD-MM-YYYY"  (day-first — NOT parseable by new Date())
//   - sport : date      "Month DD, YYYY" (parseable by new Date())
//   - micro : date      "YYYY-MM-DD" (Postgres date)
// created_at is used only as a defensive fallback (all date columns are NOT NULL).

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Returns the raw content-date string for an item of the given type.
const rawDate = (item, type) => {
  if (type === "blog") return item.blog_date;
  return item.date; // trek | sport | micro
};

/**
 * Parse an item's content date into a Date, honouring the per-type format.
 * Falls back to created_at when the content date is missing/unparseable.
 * @returns {Date|null}
 */
export function parseContentDate(item, type) {
  const value = rawDate(item, type);

  if (typeof value === "string" && value.trim()) {
    if (type === "trek") {
      const [day, month, year] = value.split("-").map(Number);
      if (day && month && year) return new Date(year, month - 1, day);
    } else {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  if (item.created_at) {
    const d = new Date(item.created_at);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/**
 * Date → "YYYY-MM-DD" using local-time getters.
 * Deliberately not toISOString(), which is UTC and rolls the date backwards for
 * an IST evening — the authored dates are local calendar days.
 */
export function toIsoDate(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today as "YYYY-MM-DD" in the author's local timezone. */
export function todayIso() {
  return toIsoDate(new Date());
}

/** Date → "YYYY-MM" key (local time, matching how the dates are authored). */
export function monthKey(date) {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** "YYYY-MM" → "July 2026". */
export function monthLabel(key) {
  if (!key) return "";
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/**
 * "YYYY-MM" → { start: "YYYY-MM-01", endExclusive: "<first day of next month>" }
 * for half-open Supabase range queries (.gte(start).lt(endExclusive)).
 */
export function monthRange(key) {
  const [y, m] = key.split("-").map(Number);
  const start = `${key}-01`;
  const nextYear = m === 12 ? y + 1 : y;
  const nextMonth = m === 12 ? 1 : m + 1;
  const endExclusive = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { start, endExclusive };
}

/** Convenience: the "YYYY-MM" bucket for an item, or null. */
export function itemMonthKey(item, type) {
  return monthKey(parseContentDate(item, type));
}
