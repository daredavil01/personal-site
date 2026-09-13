// Every figure on /stats, as searchable prose — one chunk per chapter of the
// page — plus the Writing Ledger totals.
//
// The numbers come from the same hourly /api/stats snapshot the page renders
// (scripts/lib/statsSource.mjs), so the chatbot cannot disagree with the page.
//
// Month-to-date / year-to-date for writing move every day, so they stay out of
// the embedded text and live in the worker's facts card instead. What remains
// changes at most monthly (reading pace, this year's posts per month) or when
// something real happens.

import fs from "fs";
import path from "path";
import { getStatsPayload } from "../lib/statsSource.mjs";

export const LEDGER_JSON = "public/data/writing-ledger.json";

const n = (v) => Number(v || 0).toLocaleString("en-US");
const pairs = (list, unit) => (list || []).map(([k, v]) => `${k} (${v}${unit ? ` ${unit}` : ""})`).join(", ");
const race = (r) => (r ? `${r.time} at ${r.title}${r.date ? `, ${r.date}` : ""}` : null);

export default {
  type: "stats",
  load: async ({ ROOT }) => {
    const abs = path.join(ROOT, LEDGER_JSON);
    if (!fs.existsSync(abs)) {
      throw new Error(`${LEDGER_JSON} is missing — run \`npm run blogs:wordcount\` first`);
    }
    const { payload } = await getStatsPayload();
    return { ledger: JSON.parse(fs.readFileSync(abs, "utf8")), payload };
  },
  toChunks: ({ ledger, payload }, { compose }) => {
    const { stats: s, micro, personal, lists, tags } = payload;
    const base = { entity_type: "stats", chunk_index: 0, chunk_date: null, tags: [], image_url: null };
    const chunk = (id, title, url, parts) => ({ ...base, entity_id: id, title, url, body: compose(parts) });
    const t = ledger.totals || {};
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const themes = tags.filter((x) => x.total > 0 && x.name !== "100_days_to_offload");
    const bridges = themes.filter((x) => Object.values(x.counts).filter((c) => c > 0).length >= 2);

    return [
      chunk(1, "The Writing Ledger", "/writing-ledger.html", [
        ["Writing ledger", "every blog post on Substack and WordPress, counted word by word"],
        ["Total", `${n(t.words)} words across ${n(t.posts)} posts`],
        ["Average", `${n(t.averageWords)} words per post`],
        ["Span", `${t.firstPost} to ${t.latestPost}, ${t.activeMonths} active months`],
        ["Longest post", t.longestPost && `${t.longestPost.title} (${n(t.longestPost.words)} words)`],
        ["Busiest month", t.busiestMonth && `${t.busiestMonth.label}: ${n(t.busiestMonth.words)} words`],
        ["Busiest year", t.busiestYear && `${t.busiestYear.year}: ${n(t.busiestYear.words)} words`],
        ["By year", (ledger.byYear || []).map((y) => `${y.year} ${n(y.words)} words / ${y.posts} posts`).join("; ")],
        ["By platform", (ledger.byPlatform || []).map((p) => `${p.platform} ${n(p.words)} words / ${p.posts} posts`).join("; ")],
        ["Longest posts", (ledger.topPosts || []).slice(0, 5).map((p) => `${p.title} (${n(p.words)})`).join("; ")],
      ]),
      chunk(2, "Micro-blog pulse", "/stats", [
        ["Micro-blog activity", `${n(micro.total)} short posts on ${n(micro.activeDays)} different days`],
        ["Longest posting streak", `${micro.longestStreak} consecutive days`],
        ["Posts per year", pairs(micro.perYear)],
        ["Busiest month", micro.busiestMonth && `${micro.busiestMonth.key} with ${micro.busiestMonth.count} posts`],
      ]),
      chunk(3, "Persona", "/stats", [
        ["Personal facts", personal?.name],
        ["Base", personal?.city],
        ["Born", personal?.birthDate?.slice(0, 10)],
        ["Organisations worked at", s.orgCount],
        ["Education", lists.degrees.map((d) => `${d.degree}, ${d.school} (${d.year})`).join("; ")],
        ["Projects built", s.projectCount],
        ["Featured projects", lists.topProjects.map((p) => p.title).join(", ")],
      ]),
      chunk(4, "Reading stats", "/stats", [
        ["Reading", `${n(s.booksCount)} books read, about ${s.pagesTurnedK.toFixed(1)}k pages turned`],
        ["Reading pace", `${s.readingPace.toFixed(1)} books per month this year`],
        ["Currently reading", s.booksReading],
        ["Top genres", s.topGenres.join(", ")],
        ["Languages", `${s.booksEnglish} English, ${s.booksMarathi} Marathi`],
        ["Books reviewed or written about", s.booksWithReviews],
        ["Books per year", pairs(s.booksPerYearSorted, "books")],
        ["Top book tags", pairs(s.topBookTags)],
      ]),
      chunk(5, "100 Days To Offload stats", "/stats", [
        ["100 Days To Offload", `${s.offloadCount} of 100 posts (${s.offloadPercentage}%), ${Math.max(0, 100 - s.offloadCount)} to go`],
        ["Platforms", pairs(s.topPlatforms, "posts")],
        ["Languages", `${s.blogEnglish} English, ${s.blogMarathi} Marathi`],
        ["Top topics", pairs(s.topBlogTags, "posts")],
        [`Posts per month in ${s.currentYear}`, s.blogMonthCounts.map((c, i) => `${MONTHS[i]} ${c}`).join(", ")],
        ["Busiest month this year", s.blogMonthCounts[s.busiestMonthIndex] > 0 ? MONTHS[s.busiestMonthIndex] : null],
      ]),
      chunk(6, "Running stats", "/stats", [
        ["Endurance", `${s.totalRaces} races, ${n(Math.round(s.totalKmRun))} km raced`],
        ["Marathon personal best", race(s.pbMarathon)],
        ["Half-marathon personal best", race(s.pbHalf)],
        ["10K personal best", race(s.pbTenK)],
        ["Races per year", pairs(s.racesPerYearSorted, "races")],
      ]),
      chunk(7, "Trek stats", "/stats", [
        ["Treks", `${s.totalTreks} treks over ${s.trekYearsActive} years`],
        ["Hard treks", s.hardTreks],
        ["Treks with a blog write-up", s.treksWithBlog],
        ["Latest trek", s.latestTrek],
      ]),
      chunk(8, "Photo archive stats", "/stats", [
        ["Visual archive", `${s.instaPostCount} Instagram collections, ${n(s.totalPhotos)} photos`],
        ["Top photo tags", s.topInstaTags.join(", ")],
      ]),
      chunk(9, "Skills and certifications", "/stats", [
        ["Technical arsenal", s.topSkills.join(", ")],
        ["Certifications", `${s.certCount} in total; latest: ${s.latestCert}`],
      ]),
      chunk(10, "Content tag stats", "/stats", [
        ["Tags", `${themes.length} themes in use, ${n(themes.reduce((a, x) => a + x.total, 0))} tag links`],
        ["Cross-content themes", `${bridges.length}: ${bridges.slice(0, 8).map((x) => x.displayName || x.name).join(", ")}`],
        ["Used only once", `${themes.length ? Math.round((themes.filter((x) => x.total === 1).length / themes.length) * 100) : 0}%`],
        ["Most used", themes.slice(0, 12).map((x) => `${x.displayName || x.name} (${x.total})`).join(", ")],
      ]),
    ];
  },
};
