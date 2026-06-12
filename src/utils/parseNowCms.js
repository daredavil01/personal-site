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
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
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

// import.meta.glob is a Vite compile-time macro: each match resolves to the
// served URL of the markdown file, fetched and parsed at runtime. Jest maps
// this module to parseNowCms.jest-stub.js (see jest.config.js) because the
// CommonJS test runtime cannot evaluate import.meta.
const MONTH_URLS = import.meta.glob("../cms-content/now/months/*.md", {
  query: "?url",
  import: "default",
  eager: true,
});

const META_URLS = import.meta.glob("../cms-content/now/meta.md", {
  query: "?url",
  import: "default",
  eager: true,
});

export async function loadNowMeta() {
  const url = Object.values(META_URLS)[0];
  const text = await fetch(url).then((r) => r.text());
  return parseFrontMatter(text);
}

export async function loadNowMonths() {
  const months = await Promise.all(
    Object.values(MONTH_URLS).map(async (url) => {
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
