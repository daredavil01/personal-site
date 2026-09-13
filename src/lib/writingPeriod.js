// Month-to-date and year-to-date for the Writing Ledger, bucketed in IST to
// match how the posts themselves are dated.
//
// Computed at READ time by the /ask worker (and, as an inline copy, by
// public/writing-ledger.html), not only when `npm run blogs:wordcount` runs:
// the JSON on disk is as of the day it was generated, and "this month so far"
// is wrong the next morning. That also lets the nightly job skip committing a
// file whose only change is the date.
//
// Dependency-free by contract — imported by the Pages Function and by Node.

const IST_OFFSET_MINUTES = 5 * 60 + 30;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const pad = (n) => String(n).padStart(2, "0");

/** `posts`: [{ date: "YYYY-MM-DD", words }]. */
// eslint-disable-next-line import/prefer-default-export
export function currentPeriod(posts, now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();
  const day = ist.getUTCDate();

  const thisMonth = `${year}-${pad(month + 1)}`;
  const thisYear = String(year);
  const monthDay = `${pad(month + 1)}-${pad(day)}`;
  const prev = new Date(Date.UTC(year, month - 1, 1));
  const prevMonthKey = `${prev.getUTCFullYear()}-${pad(prev.getUTCMonth() + 1)}`;
  const lastYear = String(year - 1);

  const tally = (keep) => (posts || []).reduce(
    (acc, p) => (p?.date && keep(p.date)
      ? { posts: acc.posts + 1, words: acc.words + (p.words || 0) }
      : acc),
    { posts: 0, words: 0 },
  );
  const pctChange = (current, prior) => (
    prior > 0 ? Math.round(((current - prior) / prior) * 1000) / 10 : null
  );

  const mtd = tally((d) => d.slice(0, 7) === thisMonth);
  const prevMonth = tally((d) => d.slice(0, 7) === prevMonthKey);
  const ytd = tally((d) => d.slice(0, 4) === thisYear);
  // Last year cut at the same month/day — the only fair year-over-year read.
  const priorYtd = tally((d) => d.slice(0, 4) === lastYear && d.slice(5) <= monthDay);
  const daysIntoYear = Math.floor((Date.UTC(year, month, day) - Date.UTC(year, 0, 1)) / 86400000) + 1;

  return {
    asOf: `${thisYear}-${monthDay}`,
    monthToDate: {
      month: thisMonth,
      label: `${MONTH_NAMES[month]} ${year}`,
      posts: mtd.posts,
      words: mtd.words,
      daysElapsed: day,
      wordsPerDay: Math.round(mtd.words / day),
      previousMonth: { month: prevMonthKey, posts: prevMonth.posts, words: prevMonth.words },
      changeVsPreviousMonth: pctChange(mtd.words, prevMonth.words),
    },
    yearToDate: {
      year: thisYear,
      posts: ytd.posts,
      words: ytd.words,
      daysElapsed: daysIntoYear,
      wordsPerDay: Math.round(ytd.words / daysIntoYear),
      priorYearSamePeriod: {
        year: lastYear,
        posts: priorYtd.posts,
        words: priorYtd.words,
        throughDate: `${lastYear}-${monthDay}`,
      },
      changeVsPriorYear: pctChange(ytd.words, priorYtd.words),
    },
  };
}
