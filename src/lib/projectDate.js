// Date helpers for projects.
//
// Since 0005 the `date` column is a real Postgres date, which PostgREST
// serializes as "YYYY-MM-DD" — so there is exactly one format to handle, unlike
// the three monthDigest.js has to reconcile. The column is nullable (not every
// project has a meaningful date), so every helper here tolerates null.

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * "2026-08-01" → Date (local midnight), or null.
 * Parsed by hand rather than via `new Date(str)`, which reads a bare ISO date as
 * UTC and lands on the previous day for anyone behind UTC.
 */
export function parseProjectDate(value) {
  const m = ISO.exec(String(value ?? "").trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "2026-08-01" → "2026", or null. */
export function projectYear(value) {
  const m = ISO.exec(String(value ?? "").trim());
  return m ? m[1] : null;
}

/** "2026-08-01" → "August 1, 2026". Empty string when there is no date. */
export function formatProjectDate(value) {
  const date = parseProjectDate(value);
  if (!date) return "";
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** "2026-08-01" → "August 2026". Used where the day adds nothing. */
export function formatProjectMonth(value) {
  const date = parseProjectDate(value);
  if (!date) return "";
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/** Sort comparator helper: epoch ms, or null for undated rows. */
export function projectTime(value) {
  const date = parseProjectDate(value);
  return date ? date.getTime() : null;
}
