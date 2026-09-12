// Books carry two levels of date certainty and the UI has to respect the
// difference. `date_finished` is a real Postgres date, but for most rows only
// the *year* is known — 0008 seeded a stable placeholder month so the timeline
// has something to sort on, and flagged those rows date_precision = 'year'.
//
// So: never render a month for a row whose precision is 'year'. Showing
// "15 March 2024" when all that is actually known is "2024" is a lie the
// reader has no way to detect.

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const parts = (book) => {
  if (!book?.date_finished) return null;
  const m = String(book.date_finished).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { year: m[1], month: Number(m[2]) - 1, day: Number(m[3]) };
};

/** The year a book was read, as a string, for grouping. */
export const bookYear = (book) => {
  const p = parts(book);
  return p?.year ?? (book?.year ? String(book.year) : null);
};

/** "March 2024" when the month is real, otherwise just "2024". */
export const formatReadDate = (book) => {
  const p = parts(book);
  if (!p) return book?.year ? String(book.year) : "";
  if (book.date_precision !== "day") return p.year;
  return `${MONTHS[p.month]} ${p.year}`;
};

/** Month index 0–11, or null when only the year is known. */
export const readMonth = (book) => {
  const p = parts(book);
  return p && book.date_precision === "day" ? p.month : null;
};

export const MONTH_LABELS = MONTHS.map((m) => m.slice(0, 3));
