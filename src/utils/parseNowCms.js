import { parse } from "yaml";

const SECTION_KEYS = [
  "blogs",
  "running",
  "books",
  "events",
  "projects",
  "stats",
  "website",
  "certificates",
  "misc",
];

const MONTH_ORDER = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseFrontMatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  return match ? parse(match[1]) : {};
}

// CMS files store sections flat; components expect them nested under `sections`
function nestSections(flat) {
  const { month, year, isCurrent, ...rest } = flat;
  const sections = SECTION_KEYS.reduce((acc, key) => {
    if (rest[key] !== undefined) acc[key] = rest[key];
    return acc;
  }, {});
  return { month, year, isCurrent: !!isCurrent, sections };
}

function urlOf(mod) {
  return mod?.default ?? mod;
}

export async function loadNowMeta() {
  // eslint-disable-next-line import/no-webpack-loader-syntax,global-require
  const url = urlOf(require("../cms-content/now/meta.md"));
  const text = await fetch(url).then((r) => r.text());
  return parseFrontMatter(text);
}

export async function loadNowMonths() {
  const ctx = require.context("../cms-content/now/months", false, /\.md$/);
  const months = await Promise.all(
    ctx.keys().map(async (key) => {
      const url = urlOf(ctx(key));
      const text = await fetch(url).then((r) => r.text());
      return nestSections(parseFrontMatter(text));
    }),
  );
  return months.sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    if (b.year !== a.year) return b.year - a.year;
    return MONTH_ORDER.indexOf(b.month) - MONTH_ORDER.indexOf(a.month);
  });
}
