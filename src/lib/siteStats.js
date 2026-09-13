// Every number the /stats page shows, computed in one place.
//
// Used by both Stats layouts (StatsAlmanac, StatsClassic), by TagAnalysis, by
// getMicroblogActivity, and — in Node — by the /ask indexer
// (scripts/ask-sources/stats.mjs) and the chatbot context card
// (scripts/build-docs.mjs). One implementation means the chatbot can never
// quote a figure the page disagrees with.
//
// Pure and dependency-free apart from raceStats. Rows may arrive in client
// shape (tags, slideImages) or straight from Postgres (tag_names, slide_images);
// the accessors below accept both.

/* eslint-disable import/extensions */
import {
  formatHoursMinutes,
  formatMinutesSeconds,
  getPBRaw,
} from "../utils/raceStats.js";
/* eslint-enable import/extensions */

export const OFFLOAD_TAG = "100_days_to_offload";
export const TAG_TYPES = ["blog", "book", "microblog", "instagram", "sport", "trek", "project"];
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
// The page's own approximation, kept so the chatbot quotes the same figure.
const PAGES_PER_BOOK = 330;

const tagsOf = (r) => r?.tags || r?.tag_names || r?.blog_tags || [];
const slidesOf = (r) => r?.slideImages || r?.slide_images || [];

const countBy = (items, keyOf) => items.reduce((acc, item) => {
  const key = keyOf(item);
  if (key !== null && key !== undefined && key !== "") acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

const topEntries = (counts, n) => Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);

export function parseTrekDate(dateStr) {
  if (!dateStr) return new Date(0);
  const [day, month, year] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Posts per month, per year, and the longest run of consecutive posting days. */
export function microblogActivity(dates) {
  const counts = new Map();
  const days = new Set();
  (dates || []).forEach((date) => {
    if (typeof date !== "string" || date.length < 10) return;
    const key = date.slice(0, 7);
    counts.set(key, (counts.get(key) || 0) + 1);
    days.add(date.slice(0, 10));
  });

  let longestStreak = 0;
  days.forEach((day) => {
    const prev = new Date(`${day}T00:00:00Z`);
    prev.setUTCDate(prev.getUTCDate() - 1);
    if (days.has(prev.toISOString().slice(0, 10))) return; // not a streak start
    let run = 1;
    const cursor = new Date(`${day}T00:00:00Z`);
    for (;;) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      if (!days.has(cursor.toISOString().slice(0, 10))) break;
      run += 1;
    }
    if (run > longestStreak) longestStreak = run;
  });

  const monthCounts = [...counts.entries()].map(([key, count]) => ({ key, count }));
  const perYear = [...monthCounts.reduce((acc, { key, count }) => {
    const year = key.slice(0, 4);
    acc.set(year, (acc.get(year) || 0) + count);
    return acc;
  }, new Map()).entries()];
  const busiestMonth = [...monthCounts].sort((a, b) => b.count - a.count)[0] || null;

  return {
    monthCounts,
    longestStreak,
    perYear,
    total: perYear.reduce((n, [, c]) => n + c, 0),
    activeDays: days.size,
    busiestMonth,
  };
}

/**
 * The tag appendix. `tags` are tags_with_counts rows:
 * { name, displayName | display_name, total, counts: { [entity_type]: n } }.
 */
export function tagAnalysis(tags, { topThemes = 12, typeKeys = TAG_TYPES } = {}) {
  const typesOf = (t) => typeKeys.filter((k) => (t.counts?.[k] || 0) > 0);
  const used = (tags || [])
    .filter((t) => t.total > 0 && t.name !== OFFLOAD_TAG)
    .sort((a, b) => b.total - a.total || String(a.name).localeCompare(String(b.name)));
  const links = used.reduce((n, t) => n + t.total, 0);
  const bridges = used
    .filter((t) => typesOf(t).length >= 2)
    .sort((a, b) => typesOf(b).length - typesOf(a).length || b.total - a.total);
  const perType = typeKeys.map((key) => {
    const withType = used
      .filter((t) => (t.counts?.[key] || 0) > 0)
      .sort((a, b) => b.counts[key] - a.counts[key]);
    return {
      key,
      tags: withType.length,
      links: withType.reduce((n, t) => n + t.counts[key], 0),
      top: withType.slice(0, 3),
    };
  }).filter((type) => type.tags > 0);
  const once = used.filter((t) => t.total === 1).length;

  return {
    used,
    links,
    bridges,
    perType,
    once,
    oncePercent: used.length ? Math.round((once / used.length) * 100) : 0,
    top: used.slice(0, topThemes),
    typesOf,
  };
}

/** Everything the two Stats layouts compute, under the names they already use. */
export function computeSiteStats({
  books = [],
  blogs = [],
  sports = [],
  treks = [],
  instagram = [],
  projects = [],
  resume = {},
  now = new Date(),
} = {}) {
  const {
    positions = [], degrees = [], certifications = [], skills = [],
  } = resume;

  // Reading
  const booksCount = books.length;
  const genreCounts = {};
  books.forEach((b) => {
    if (!b.category) return;
    b.category.split(",").forEach((c) => {
      const cat = c.trim();
      genreCounts[cat] = (genreCounts[cat] || 0) + 1;
    });
  });
  const booksPerYear = countBy(books, (b) => b.year);
  const bookTagCounts = {};
  books.forEach((b) => tagsOf(b).forEach((t) => { bookTagCounts[t] = (bookTagCounts[t] || 0) + 1; }));

  // Writing (the 100 Days To Offload ledger)
  const offloadCount = blogs.length;
  const blogTagCounts = {};
  blogs.forEach((post) => tagsOf(post).forEach((t) => {
    if (t.toLowerCase() !== OFFLOAD_TAG) blogTagCounts[t] = (blogTagCounts[t] || 0) + 1;
  }));
  const currentYear = now.getFullYear();
  const blogMonthCounts = Array(12).fill(0);
  blogs.forEach((post) => {
    const d = new Date(post.blog_date);
    if (d.getFullYear() === currentYear) blogMonthCounts[d.getMonth()] += 1;
  });

  // Endurance
  const pbMarathon = getPBRaw(sports, "42");
  const pbHalf = getPBRaw(sports, "21");
  const pbTenK = getPBRaw(sports, "10");
  const racesPerYear = {};
  sports.forEach((race) => {
    const year = new Date(race.date).getFullYear();
    if (Number.isFinite(year)) racesPerYear[year] = (racesPerYear[year] || 0) + 1;
  });

  // Treks
  const latestTrekRow = [...treks].sort((a, b) => parseTrekDate(b.date) - parseTrekDate(a.date))[0];

  // Capture
  const instaTagCounts = {};
  instagram.forEach((post) => tagsOf(post).forEach((t) => { instaTagCounts[t] = (instaTagCounts[t] || 0) + 1; }));

  return {
    currentYear,

    booksCount,
    pagesTurnedK: (booksCount * PAGES_PER_BOOK) / 1000,
    genreCounts,
    topGenres: topEntries(genreCounts, 3).map((e) => e[0]),
    booksEnglish: books.filter((b) => b.language === "English").length,
    booksMarathi: books.filter((b) => b.language === "Marathi").length,
    booksPerYearSorted: Object.entries(booksPerYear).sort((a, b) => b[0] - a[0]),
    maxBooksInYear: Math.max(...Object.values(booksPerYear), 1),
    topBookTags: topEntries(bookTagCounts, 8),
    booksWithReviews: books.filter((b) => b.blog_link).length,
    booksReading: books.filter((b) => b.status === "reading").length,
    // Books so far divided by the months elapsed this year — the page's "pace".
    readingPace: booksCount / (now.getMonth() + 1 || 1),

    offloadCount,
    offloadPercentage: Math.round((offloadCount / 100) * 100),
    topPlatforms: topEntries(countBy(blogs, (p) => p.blog_platform), 3),
    topBlogTags: topEntries(blogTagCounts, 6),
    blogEnglish: blogs.filter((p) => p.language === "English").length,
    blogMarathi: blogs.filter((p) => p.language === "Marathi").length,
    blogMonthCounts,
    maxBlogMonth: Math.max(...blogMonthCounts, 1),
    busiestMonthIndex: blogMonthCounts.indexOf(Math.max(...blogMonthCounts)),

    topSkills: [...skills].sort((a, b) => b.competency - a.competency).slice(0, 9).map((s) => s.title),
    certCount: certifications.length,
    latestCert: certifications[0]?.name || "AWS Architect Professional",
    orgCount: positions.length,
    degreeCount: degrees.length,
    projectCount: projects.length,

    totalRaces: sports.length,
    totalKmRun: sports.reduce(
      (acc, r) => acc + (parseFloat(String(r.distance || "").replace(/[^\d.]/g, "")) || 0),
      0,
    ),
    pbMarathon,
    pbHalf,
    pbTenK,
    bestMarathonTime: formatHoursMinutes(pbMarathon?.time),
    bestHmTime: formatHoursMinutes(pbHalf?.time),
    bestTenKTime: formatMinutesSeconds(pbTenK?.time),
    racesPerYearSorted: Object.entries(racesPerYear).sort((a, b) => a[0] - b[0]),
    maxRacesInYear: Math.max(...Object.values(racesPerYear), 1),

    totalTreks: treks.length,
    hardTreks: treks.filter((t) => t.endurance_level === "Hard").length,
    treksWithBlog: treks.filter((t) => !!t.blog_link).length,
    trekYearsActive: new Set(treks.map((t) => parseTrekDate(t.date).getFullYear())).size,
    latestTrek: latestTrekRow?.fort_name || "-",

    instaPostCount: instagram.length,
    totalPhotos: instagram.reduce((acc, post) => acc + slidesOf(post).length, 0),
    topInstaTags: topEntries(instaTagCounts, 3).map((e) => e[0]),
  };
}

// Bumped whenever the payload shape changes, so a reader never trusts an
// older deployment's JSON.
export const STATS_VERSION = 1;

const pick = (row, keys) => (row ? Object.fromEntries(keys.map((k) => [k, row[k] ?? null])) : null);
const RACE_FIELDS = ["id", "title", "time", "date", "distance", "place"];

/**
 * The /api/stats payload: every /stats number plus the few short lists the page
 * renders, with no raw rows. Built from loadSiteStatsInput() output. `projects`
 * must already be in the page's display order (the first three are shown).
 */
export function buildStatsPayload({
  microDates = [], tags = [], personal = null, now = new Date(), ...rows
} = {}) {
  const stats = computeSiteStats({ ...rows, now });
  const { resume = {}, projects = [] } = rows;
  return {
    version: STATS_VERSION,
    generatedAt: now.toISOString(),
    personal: personal
      ? { name: personal.name, city: personal.city, birthDate: personal.birthDate }
      : null,
    stats: {
      ...stats,
      pbMarathon: pick(stats.pbMarathon, RACE_FIELDS),
      pbHalf: pick(stats.pbHalf, RACE_FIELDS),
      pbTenK: pick(stats.pbTenK, RACE_FIELDS),
    },
    micro: microblogActivity(microDates),
    lists: {
      degrees: (resume.degrees || []).map((d) => pick(d, ["degree", "school", "year", "link"])),
      topProjects: projects.slice(0, 3).map((p) => pick(p, ["id", "title", "link"])),
    },
    tags: (tags || []).map((t) => ({
      id: t.id,
      name: t.name,
      displayName: t.displayName ?? t.display_name ?? null,
      color: t.color ?? null,
      category: t.category ?? null,
      total: t.total || 0,
      counts: t.counts || {},
    })),
  };
}
