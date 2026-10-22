// /llms.txt and /llms-full.txt (https://llmstxt.org).
//
// Both were hand-written files that drifted: "100+ books" when there were 52,
// races "to Full Marathon" after a 50K ultra, and six routes missing. Now
// /llms.txt is built from the identity module, the nav and PAGE_META on every
// request — no network, so it cannot fail and cannot go stale — and
// /llms-full.txt adds one line per row from the live tables.
//
// Pure: the Pages Functions pass the inventory in.

import { SITE_URL, PAGE_META } from "../../data/pageMeta";
import ROUTES from "../../data/routes";
import { IDENTITY, LOCATION_LABEL } from "../../data/identity";
import { KINDS } from "./entities";
import { indexableFixedRoutes } from "./sitemap";
import { clip } from "./text";

// Pages served from public/ that the nav links to but PAGE_META cannot describe.
const STATIC_DESCRIPTIONS = {
  "/writing-ledger":
    "Every blog post published across Substack and WordPress since 2020, counted word by word and rolled up by month, year and platform.",
};

const abs = (path) => `${SITE_URL}${path === "/" ? "" : path}`;

const line = (label, path, description) => `- [${String(label).trim()}](${abs(path)})${description ? `: ${clip(description, 220)}` : ""}`;

const describe = (path) => PAGE_META[path]?.description || STATIC_DESCRIPTIONS[path] || "";

const PROFILE_NAMES = [
  [/^github\.com$/, "GitHub"],
  [/^linkedin\.com$/, "LinkedIn"],
  [/^twitter\.com$/, "X (Twitter)"],
  [/^linktr\.ee$/, "Linktree"],
  [/^card\.sankettambare\.in$/, "Digital card"],
  [/substack\.com$/, "Substack"],
  [/wordpress\.com$/, "WordPress"],
];

const profileName = (url) => {
  const host = url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  return PROFILE_NAMES.find(([rx]) => rx.test(host))?.[1] || host;
};

function header() {
  return [
    `# ${IDENTITY.name}`,
    "",
    `> The personal site and archive of ${IDENTITY.name} — ${IDENTITY.jobTitle.toLowerCase()} at ${IDENTITY.worksFor} in ${LOCATION_LABEL}; endurance runner, fort-trekker and writer in English and Marathi.`,
    "",
    IDENTITY.bio,
    "",
    "## Key facts",
    "",
    `- Name: ${IDENTITY.name} (also "${IDENTITY.alternateName.join('", "')}")`,
    `- Work: ${IDENTITY.jobTitle} at ${IDENTITY.worksFor}`,
    `- Based in: ${LOCATION_LABEL}`,
    `- Education: ${IDENTITY.alumniOf.map((s) => `${s.name}, ${s.detail}`).join("; ")}`,
    `- Interests: ${IDENTITY.knowsAbout.join(", ")}`,
    `- Profiles: ${IDENTITY.sameAs.map((u) => `[${profileName(u)}](${u})`).join(", ")}`,
  ];
}

// The nav's own grouping (src/data/routes.js), restricted to indexable pages,
// then anything indexable the nav does not link to — so every indexable page
// appears exactly once, which the test holds it to.
function sections() {
  const indexable = new Set([...indexableFixedRoutes(), ...Object.keys(STATIC_DESCRIPTIONS)]);
  const seen = new Set(["/"]);
  const out = [];
  const singles = ROUTES.filter((r) => !r.index && !r.subRoutes);
  const groups = [
    { label: "About", items: singles },
    ...ROUTES.filter((r) => r.subRoutes).map((r) => ({ label: r.label, items: r.subRoutes })),
  ];
  groups.forEach(({ label, items }) => {
    const lines = items
      .filter((r) => indexable.has(r.path) && !seen.has(r.path))
      .map((r) => {
        seen.add(r.path);
        return line(PAGE_META[r.path]?.title || r.label, r.path, describe(r.path));
      });
    if (lines.length) out.push("", `## ${label}`, "", ...lines);
  });
  const rest = [...indexable].filter((p) => !seen.has(p));
  if (rest.length) {
    out.push("", "## More pages", "", ...rest.map((p) => line(PAGE_META[p]?.title || p, p, describe(p))));
  }
  return out;
}

export function buildLlmsTxt() {
  return [
    ...header(),
    ...sections(),
    "",
    "## Optional",
    "",
    line("Full inventory", "/llms-full.txt", "Every book, trek, race, project, essay, deck and newsletter issue on the site, one line each, with links."),
    line("agents.md", "/agents.md", "A longer profile of Sanket Tambare and how this site is built."),
    line("Sitemap", "/sitemap.xml", "Every indexable page; items are linked from their sections."),
    line("Feed", "/feed.xml", "RSS of the newest additions."),
    "",
  ].join("\n");
}

const FULL_SECTIONS = [
  { kind: "blog", heading: "Essays (100 Days To Offload)" },
  { kind: "newsletter", heading: "Newsletter issues" },
  { kind: "book", heading: "Books read" },
  { kind: "sport", heading: "Races run" },
  { kind: "trek", heading: "Treks" },
  { kind: "project", heading: "Projects" },
  { kind: "presentation", heading: "Presentations" },
];

/**
 * @param {Record<string, any[]|null>} inventory  loadInventory() output
 */
export function buildLlmsFullTxt(inventory = {}) {
  const out = [...header(), ...sections()];
  FULL_SECTIONS.forEach(({ kind, heading }) => {
    const rows = inventory[kind];
    if (!rows || !rows.length) return;
    const k = KINDS[kind];
    out.push("", `## ${heading}`, "", ...rows.map((row) => {
      const item = k.listItem(row);
      const extra = [item.note, row.description || row.blog_description].filter(Boolean).join(" — ");
      return line(item.text, item.href, extra);
    }));
  });
  const tags = (inventory.tag || []).filter((t) => t.total > 0);
  if (tags.length) {
    out.push("", "## Tags", "", tags.map((t) => `[#${t.display_name || t.name}](${abs(KINDS.tag.listItem(t).href)}) (${t.total})`).join(", "));
  }
  out.push(
    "",
    "## Micro-blog",
    "",
    line("Micro Blog", "/micro-blog", `${describe("/micro-blog")} Too many posts to list here; each has its own page at /micro-blog/<id>.`),
    "",
  );
  return out.join("\n");
}
