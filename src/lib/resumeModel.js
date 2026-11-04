// The /resume page's derived numbers, in one pure module.
//
// The resume tables store dates as people type them ("February 2024 - Present",
// "May 23, 2026", "30-10-2026", "2024"), and the projects table is the richest
// evidence the site has of what the skills list claims. Everything that reads
// across the two — durations, groupings, "used in N projects", the stack the
// projects ship with that the skills list does not name yet — is computed here
// so the page renders data and never re-derives it in a component.

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
];

const monthIndex = (word) => {
  if (!word) return -1;
  return MONTHS.indexOf(String(word).slice(0, 3).toLowerCase());
};

/**
 * One loosely typed date → { y, m } (m is 0-11, null when only a year is known),
 * or null. Accepts "February 2024", "Feb 2024", "May 23, 2026", "30-10-2026",
 * "2026-10-30", "2024".
 */
export function parseLooseDate(input) {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (m) return { y: Number(m[1]), m: Number(m[2]) - 1 };
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return { y: Number(m[3]), m: Number(m[2]) - 1 };
  m = s.match(/^([A-Za-z]+)\.?\s+(?:\d{1,2},?\s+)?(\d{4})$/);
  if (m && monthIndex(m[1]) >= 0) return { y: Number(m[2]), m: monthIndex(m[1]) };
  m = s.match(/^(\d{4})$/);
  if (m) return { y: Number(m[1]), m: null };
  return null;
}

const toMonths = (d) => d.y * 12 + (d.m ?? 0);

/** "February 2024 - Present" → { start, end, current }. end is null when current. */
export function parseDaterange(range) {
  const parts = String(range || "").split(/\s+[-–—]\s+|\s+to\s+/i);
  const start = parseLooseDate(parts[0]);
  const rawEnd = (parts[1] || "").trim();
  const current = /present|now|current/i.test(rawEnd);
  const end = current ? null : parseLooseDate(rawEnd);
  return { start, end, current };
}

/** Whole months between two parsed dates, inclusive of the first month. */
export function monthsBetween(start, end, now = new Date()) {
  if (!start) return null;
  const last = end || { y: now.getFullYear(), m: now.getMonth() };
  return Math.max(1, toMonths(last) - toMonths(start) + 1);
}

/** 38 → "3 yrs 2 mos", 11 → "11 mos", 12 → "1 yr". */
export function durationLabel(months) {
  if (!months) return "";
  const y = Math.floor(months / 12);
  const mo = months % 12;
  const ys = y ? `${y} yr${y > 1 ? "s" : ""}` : "";
  const ms = mo ? `${mo} mo${mo > 1 ? "s" : ""}` : "";
  return [ys, ms].filter(Boolean).join(" ");
}

export const POSITION_GROUPS = [
  { key: "work", label: "Professional experience" },
  { key: "research", label: "Fellowship & research" },
  { key: "campus", label: "Leadership & community" },
];

/**
 * Which part of the resume a position belongs in. A fellowship or research
 * title is research; a role that began before the first full-time job is
 * campus leadership; everything else is work.
 */
export function classifyPosition(pos, jobStart) {
  if (/fellow|research/i.test(`${pos.position} ${pos.company}`)) return "research";
  const { start } = parseDaterange(pos.daterange);
  if (start && jobStart && toMonths(start) < toMonths(jobStart)) return "campus";
  return "work";
}

// The earliest start among roles that read like a job title, used to decide
// what came before it. Falls back to the earliest start of any role.
function firstJobStart(positions) {
  const jobLike = positions
    .filter((p) => /engineer|developer|analyst|architect|consultant/i.test(p.position || ""))
    .map((p) => parseDaterange(p.daterange).start)
    .filter(Boolean)
    .sort((a, b) => toMonths(a) - toMonths(b));
  return jobLike[0] || null;
}

/**
 * Positions with parsed dates and durations, grouped, newest first within each
 * group. Empty groups are dropped.
 */
export function groupPositions(positions = [], now = new Date()) {
  const first = firstJobStart(positions);
  const rows = positions.map((p) => {
    const range = parseDaterange(p.daterange);
    const months = monthsBetween(range.start, range.end, now);
    return {
      ...p,
      ...range,
      months,
      duration: durationLabel(months),
      group: classifyPosition(p, first),
    };
  });
  const key = (r) => (r.current ? Infinity : toMonths(r.end || r.start || { y: 0, m: 0 }));
  return POSITION_GROUPS
    .map((g) => ({
      ...g,
      items: rows.filter((r) => r.group === g.key).sort((a, b) => key(b) - key(a)
        || toMonths(b.start || { y: 0 }) - toMonths(a.start || { y: 0 })),
    }))
    .filter((g) => g.items.length);
}

/** Months of professional work, overlapping roles counted once. */
export function professionalMonths(positions = [], now = new Date()) {
  const groups = groupPositions(positions, now);
  const work = (groups.find((g) => g.key === "work") || { items: [] }).items;
  const covered = new Set();
  work.forEach((r) => {
    if (!r.start) return;
    const end = r.end || { y: now.getFullYear(), m: now.getMonth() };
    for (let k = toMonths(r.start); k <= toMonths(end); k += 1) covered.add(k);
  });
  return covered.size || null;
}

/** Certifications newest first, each with a parsed `when` and `year`. */
export function sortCertifications(certs = []) {
  return certs
    .map((c) => {
      const when = parseLooseDate(c.issuedDate);
      return { ...c, when, year: when ? when.y : null };
    })
    .sort((a, b) => (b.when ? toMonths(b.when) : -1) - (a.when ? toMonths(a.when) : -1));
}

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim();

// The words a skill title can be recognised by: "PostgreSQL/SQLite3/SQL/MySQL"
// answers to each of its parts, "HTML + SASS/SCSS/CSS" to HTML, CSS and SASS,
// "MCP (Model Context Protocol)" to MCP.
export function skillAliases(title) {
  const base = String(title || "").replace(/\(.*?\)/g, " ");
  const parts = base.split(/[/+,]|\band\b/).map((p) => norm(p)).filter(Boolean);
  const all = new Set([norm(base), ...parts]);
  all.forEach((a) => {
    if (a.endsWith(" js")) all.add(a.replace(/ js$/, ""));
    if (a === "amazon web services") all.add("aws");
    if (a === "javascript") all.add("javascript es modules");
  });
  return [...all].filter((a) => a.length > 0);
}

const mentions = (text, alias) => {
  if (!alias) return false;
  const re = new RegExp(`(^|[^a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
  return re.test(text);
};

/** Does a project's stack (or text) name this skill? */
export function projectUsesSkill(project, skill) {
  const stack = (project.techStack || []).map(norm);
  const aliases = skillAliases(skill.title);
  return stack.some((t) => aliases.some((a) => t === a || mentions(t, a)));
}

/**
 * Skills with the projects that use them, grouped by their first category,
 * strongest first. Each skill: { ...skill, projects: [{id,title}], primary }.
 */
export function skillsWithEvidence(skills = [], projects = []) {
  const visible = projects.filter((p) => p.visible !== false);
  return skills.map((s) => ({
    ...s,
    primary: (s.category || [])[0] || "Other",
    projects: visible.filter((p) => projectUsesSkill(p, s)).map((p) => ({ id: p.id, title: p.title })),
  }));
}

// Category order for the skills panel, with everything else after it.
const CATEGORY_ORDER = ["Languages", "Web Development", "Data Engineering", "Data Science", "Databases", "Tools"];

/**
 * The skill set grouped by category. By default a skill appears under every
 * category it carries (for filtering); `primaryOnly` files it once, under its
 * first, so the overview never lists a skill twice.
 */
export function groupSkills(evidenced = [], { primaryOnly = false } = {}) {
  const by = new Map();
  evidenced.forEach((s) => {
    const cats = s.category && s.category.length ? s.category : ["Other"];
    // The primary home is the first category in CATEGORY_ORDER, so "C"
    // (["C", "Languages"]) files under Languages, not a group of one.
    const primary = cats.find((c) => CATEGORY_ORDER.includes(c)) || cats[0];
    (primaryOnly ? [primary] : cats).forEach((c) => {
      if (!by.has(c)) by.set(c, []);
      by.get(c).push(s);
    });
  });
  // A category of one language ("C", "Java", "Python") repeats the Languages
  // group; keep only categories with at least three skills or in the order list.
  return [...by.entries()]
    .filter(([c, list]) => primaryOnly || CATEGORY_ORDER.includes(c) || list.length >= 3)
    .map(([category, list]) => ({
      category,
      skills: [...list].sort((a, b) => b.competency - a.competency || b.projects.length - a.projects.length),
    }))
    .sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a.category);
      const ib = CATEGORY_ORDER.indexOf(b.category);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.category.localeCompare(b.category);
    });
}

/**
 * Technologies the projects ship with that the skills list does not name, most
 * used first: [{ name, count }]. Only those used by at least `min` projects.
 */
export function stackBeyondSkills(skills = [], projects = [], { min = 2, limit = 10 } = {}) {
  const aliases = skills.flatMap((s) => skillAliases(s.title));
  const counts = new Map();
  projects.filter((p) => p.visible !== false).forEach((p) => {
    new Set((p.techStack || []).map((t) => t.trim()).filter(Boolean)).forEach((t) => {
      const n = norm(t);
      if (aliases.some((a) => n === a || mentions(n, a))) return;
      const keyName = t.replace(/\s+\d+$/, ""); // "Astro 7" → "Astro"
      counts.set(keyName, (counts.get(keyName) || 0) + 1);
    });
  });
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .filter((e) => e.count >= min)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Skill titles named in a role's bullets, for the chips under each position. */
export function skillsInText(points = [], skills = []) {
  const text = norm(points.join(" "));
  return skills
    .filter((s) => skillAliases(s.title).some((a) => a.length > 1 && mentions(text, a)))
    .map((s) => s.title);
}

// "Skills: Front-End Development · React.js · …" is a LinkedIn export line, not
// an achievement. It is shown as chips instead of a bullet.
export function splitSkillLine(points = []) {
  const bullets = [];
  const tags = [];
  points.forEach((p) => {
    const m = String(p).match(/^\s*skills?\s*:\s*(.+)$/i);
    if (m) m[1].split(/\s*[·•,|]\s*/).filter(Boolean).forEach((t) => tags.push(t.trim()));
    else bullets.push(p);
  });
  return { bullets, tags };
}

const projectYear = (p) => (p.date ? Number(String(p.date).slice(0, 4)) : null);

/**
 * The projects as resume evidence: featured ones first (the selected work),
 * the rest by year, plus counts. Hidden projects are never included.
 */
export function projectEvidence(projects = [], { selected = 6, now = new Date() } = {}) {
  const visible = projects
    .filter((p) => p.visible !== false)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const featured = visible.filter((p) => p.featured);
  const picks = (featured.length ? featured : visible).slice(0, selected);
  const pickIds = new Set(picks.map((p) => p.id));
  const rest = visible.filter((p) => !pickIds.has(p.id));
  const byYear = [];
  rest.forEach((p) => {
    const y = projectYear(p) || "Undated";
    let row = byYear.find((r) => r.year === y);
    if (!row) { row = { year: y, items: [] }; byYear.push(row); }
    row.items.push(p);
  });
  const live = visible.filter((p) => /live/i.test(p.status || "")).length;
  const orgs = [...new Set(visible.map((p) => p.org).filter(Boolean))];
  const thisYear = now.getFullYear();
  return {
    selected: picks,
    byYear,
    total: visible.length,
    live,
    orgs,
    shippedThisYear: visible.filter((p) => projectYear(p) === thisYear).length,
  };
}

/**
 * The resume as plain text — what "Copy as text" puts on the clipboard, for
 * application forms and ATS parsers that read text and nothing else.
 */
export function resumeText({
  name, headline, contact = [], summary, groups = [], selected = [], skillGroups = [], certifications = [], degrees = [],
}) {
  const lines = [name, headline, contact.join(" | "), "", "SUMMARY", summary, ""];
  groups.forEach((g) => {
    lines.push(g.label.toUpperCase());
    g.items.forEach((p) => {
      lines.push(`${p.position} — ${p.company} (${p.daterange}${p.duration ? `, ${p.duration}` : ""})`);
      splitSkillLine(p.points || []).bullets.forEach((b) => lines.push(`  • ${b}`));
    });
    lines.push("");
  });
  if (selected.length) {
    lines.push("SELECTED PROJECTS");
    selected.forEach((p) => {
      lines.push(`${p.title}${p.subtitle ? ` — ${p.subtitle}` : ""}${p.date ? ` (${String(p.date).slice(0, 4)})` : ""}`);
      (p.highlights || []).slice(0, 2).forEach((h) => lines.push(`  • ${h}`));
      if ((p.techStack || []).length) lines.push(`  Stack: ${p.techStack.join(", ")}`);
    });
    lines.push("");
  }
  if (skillGroups.length) {
    lines.push("SKILLS");
    skillGroups.forEach((g) => lines.push(`${g.category}: ${g.skills.map((s) => s.title).join(", ")}`));
    lines.push("");
  }
  if (certifications.length) {
    lines.push("CERTIFICATIONS");
    certifications.forEach((c) => lines.push(`${c.name} — ${c.source}${c.issuedDate ? ` (${c.issuedDate})` : ""}`));
    lines.push("");
  }
  if (degrees.length) {
    lines.push("EDUCATION");
    degrees.forEach((d) => lines.push(`${d.degree} — ${d.school} (${d.year})`));
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

const yearsOf = (p) => {
  const s = p.start ? p.start.y : null;
  if (!s) return p.daterange || "";
  if (p.current) return `${s}–now`;
  const e = p.end ? p.end.y : null;
  if (!e || e === s) return String(s);
  return `${s}–${String(e).slice(-2)}`;
};

/**
 * What fits on one A4 page, picked from the full model: every professional
 * role with its two strongest bullets, research with one, campus leadership
 * folded into a single line, four selected projects, the skills overview
 * (six per group), the six newest certifications and the degrees. The print
 * layout then scales itself to the page, so this only has to be close.
 */
export function onePageResume({
  groups = [], selected = [], skillGroups = [], certifications = [], degrees = [],
} = {}, {
  bullets = 2, researchBullets = 1, projects = 4, skillsPerGroup = 6, skillGroupsMax = 5, certs = 6,
} = {}) {
  const roles = [];
  let leadership = [];
  groups.forEach((g) => {
    if (g.key === "campus") {
      leadership = g.items.map((p) => ({ title: p.position, org: p.company, years: yearsOf(p) }));
      return;
    }
    g.items.forEach((p) => {
      const { bullets: all } = splitSkillLine(p.points || []);
      roles.push({
        id: p.id,
        group: g.key,
        position: p.position,
        company: p.company,
        daterange: p.daterange,
        duration: p.duration,
        current: !!p.current,
        bullets: all.slice(0, g.key === "research" ? researchBullets : bullets),
      });
    });
  });
  return {
    roles,
    leadership,
    projects: selected.slice(0, projects).map((p) => ({
      id: p.id,
      title: p.title,
      subtitle: p.subtitle || "",
      year: p.date ? String(p.date).slice(0, 4) : "",
      org: p.org || "",
      stack: (p.techStack || []).slice(0, 4),
    })),
    skills: skillGroups.slice(0, skillGroupsMax).map((g) => ({
      category: g.category,
      names: g.skills.slice(0, skillsPerGroup).map((s) => s.title),
    })),
    certifications: certifications.slice(0, certs).map((c) => ({
      name: c.name, source: c.source, year: c.year || (c.issuedDate || ""),
    })),
    moreCertifications: Math.max(0, certifications.length - certs),
    degrees: [...degrees].sort((a, b) => b.year - a.year).map((d) => ({ degree: d.degree, school: d.school, year: d.year })),
  };
}
