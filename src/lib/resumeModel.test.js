import {
  parseLooseDate, parseDaterange, monthsBetween, durationLabel, groupPositions,
  professionalMonths, sortCertifications, skillAliases, skillsWithEvidence,
  stackBeyondSkills, splitSkillLine, skillsInText, projectEvidence, groupSkills, resumeText, onePageResume, leadHighlight,
} from "./resumeModel";

const NOW = new Date(2026, 10, 4); // 4 Nov 2026

describe("parseLooseDate", () => {
  it.each([
    ["February 2024", { y: 2024, m: 1 }],
    ["Sep 2017", { y: 2017, m: 8 }],
    ["May 23, 2026", { y: 2026, m: 4 }],
    ["30-10-2026", { y: 2026, m: 9 }],
    ["2026-10-30", { y: 2026, m: 9 }],
    ["2024", { y: 2024, m: null }],
  ])("%s", (input, out) => expect(parseLooseDate(input)).toEqual(out));
  it("rejects nonsense", () => {
    expect(parseLooseDate("")).toBeNull();
    expect(parseLooseDate("someday")).toBeNull();
  });
});

describe("dateranges and durations", () => {
  it("reads Present as current", () => {
    const r = parseDaterange("February 2024 - Present");
    expect(r.current).toBe(true);
    expect(r.end).toBeNull();
    expect(monthsBetween(r.start, r.end, NOW)).toBe(34);
  });
  it("labels durations", () => {
    expect(durationLabel(38)).toBe("3 yrs 2 mos");
    expect(durationLabel(12)).toBe("1 yr");
    expect(durationLabel(1)).toBe("1 mo");
  });
});

const POSITIONS = [
  { company: "Bridgenext", position: "Software Developer", daterange: "February 2024 - Present", points: [] },
  { company: "Emtec Inc.", position: "Software Engineer", daterange: "January 2021 - February 2024", points: [] },
  { company: "RIT MEDIA CELL", position: "Team Lead", daterange: "Sep 2017 - Jun 2019", points: [] },
  { company: "Takshashila", position: "NAST Fellow", daterange: "April 2024 - May 2025", points: [] },
  { company: "VivekVahini", position: "Social Media Manager", daterange: "May 2018 - Jan 2021", points: [] },
];

describe("groupPositions", () => {
  it("splits work, research and campus, newest first", () => {
    const g = groupPositions(POSITIONS, NOW);
    expect(g.map((x) => x.key)).toEqual(["work", "research", "campus"]);
    expect(g[0].items.map((i) => i.company)).toEqual(["Bridgenext", "Emtec Inc."]);
    expect(g[2].items.map((i) => i.company)).toEqual(["VivekVahini", "RIT MEDIA CELL"]);
  });
  it("counts overlapping professional months once", () => {
    // Jan 2021 .. Nov 2026 inclusive, Feb 2024 shared by both roles.
    expect(professionalMonths(POSITIONS, NOW)).toBe(71);
  });
});

it("sorts certifications newest first whatever their date format", () => {
  const out = sortCertifications([
    { name: "a", issuedDate: "May 2022" },
    { name: "b", issuedDate: "30-10-2026" },
    { name: "c", issuedDate: "2024" },
    { name: "d", issuedDate: "May 23, 2026" },
  ]);
  expect(out.map((c) => c.name)).toEqual(["b", "d", "c", "a"]);
});

describe("skills against projects", () => {
  const skills = [
    { title: "PostgreSQL/SQLite3/SQL/MySQL", competency: 4, category: ["Databases"] },
    { title: "React", competency: 3, category: ["Web Development"] },
    { title: "Node.JS", competency: 3, category: ["Web Development"] },
    { title: "Amazon Web Services", competency: 4, category: ["Tools"] },
  ];
  const projects = [
    { id: 1, title: "A", techStack: ["React", "Astro", "Cloudflare Pages"], visible: true },
    { id: 2, title: "B", techStack: ["Astro 7", "Node.js", "Cloudflare Pages"], visible: true },
    { id: 3, title: "Hidden", techStack: ["React", "Astro"], visible: false },
  ];
  it("splits compound titles into aliases", () => {
    expect(skillAliases("PostgreSQL/SQLite3/SQL/MySQL")).toEqual(expect.arrayContaining(["postgresql", "sql", "mysql"]));
    expect(skillAliases("Node.JS")).toEqual(expect.arrayContaining(["node"]));
    expect(skillAliases("Amazon Web Services")).toContain("aws");
  });
  it("attaches visible projects to skills", () => {
    const ev = skillsWithEvidence(skills, projects);
    expect(ev.find((s) => s.title === "React").projects.map((p) => p.id)).toEqual([1]);
    expect(ev.find((s) => s.title === "Node.JS").projects.map((p) => p.id)).toEqual([2]);
    expect(groupSkills(ev)[0].category).toBe("Web Development");
  });
  it("finds the stack the skills list does not name", () => {
    expect(stackBeyondSkills(skills, projects)).toEqual([
      { name: "Astro", count: 2 },
      { name: "Cloudflare Pages", count: 2 },
    ]);
  });
  it("finds skills named in bullets", () => {
    expect(skillsInText(["Built on AWS Lambda with React"], skills)).toEqual(["React", "Amazon Web Services"]);
  });
});

it("turns a LinkedIn skills line into tags", () => {
  expect(splitSkillLine(["Did a thing.", "Skills: React.js · Python · Java"])).toEqual({
    bullets: ["Did a thing."], tags: ["React.js", "Python", "Java"],
  });
});

it("selects featured projects and buckets the rest by year", () => {
  const ev = projectEvidence([
    { id: 1, title: "F", featured: true, date: "2026-10-01", status: "Live" },
    { id: 2, title: "R", featured: false, date: "2020-01-01", status: "Archived", org: "X" },
    { id: 3, title: "H", featured: true, date: "2026-11-01", visible: false },
  ], { now: NOW });
  expect(ev.selected.map((p) => p.id)).toEqual([1]);
  expect(ev.byYear).toEqual([{ year: 2020, items: [expect.objectContaining({ id: 2 })] }]);
  expect(ev).toEqual(expect.objectContaining({ total: 2, live: 1, orgs: ["X"], shippedThisYear: 1 }));
});

it("writes the resume as plain text", () => {
  const text = resumeText({
    name: "A",
    headline: "B",
    contact: ["x", "y"],
    summary: "S",
    groups: [{ label: "Work", items: [{ position: "Dev", company: "Co", daterange: "2020 - 2021", points: ["Did it", "Skills: React"] }] }],
    certifications: [{ name: "C", source: "D", issuedDate: "2024" }],
  });
  expect(text).toBe("A\nB\nx | y\n\nSUMMARY\nS\n\nWORK\nDev — Co (2020 - 2021)\n  • Did it\n\nCERTIFICATIONS\nC — D (2024)");
});

it("files each skill once in the overview", () => {
  const ev = skillsWithEvidence([
    { title: "Pandas", competency: 5, category: ["Data Engineering", "Data Science"] },
    { title: "Python", competency: 5, category: ["Languages", "Python"] },
  ], []);
  const all = groupSkills(ev, { primaryOnly: true });
  expect(all.flatMap((g) => g.skills.map((s) => s.title))).toEqual(["Python", "Pandas"]);
});

it("cuts a run-on highlight at its first sentence", () => {
  const glued = `${"x ".repeat(80)}first The next part`;
  expect(leadHighlight(glued)).toBe(`${"x ".repeat(80)}first`);
  expect(leadHighlight("Short and whole. Kept As is")).toBe("Short and whole. Kept As is");
});

describe("onePageResume", () => {
  const groups = groupPositions(POSITIONS.map((p, i) => ({
    ...p, id: i + 1, points: ["one", "two", "three", "Skills: React · Python"],
  })), NOW);
  const page = onePageResume({
    groups,
    selected: [1, 2, 3, 4, 5].map((id) => ({ id, title: `P${id}`, date: "2026-01-01", techStack: ["a", "b", "c", "d", "e"] })),
    certifications: sortCertifications([{ name: "Old", issuedDate: "2019" }, ...Array.from({ length: 7 }, (_, i) => ({ name: `C${i}`, issuedDate: `May 202${i % 6}` }))]),
    degrees: [{ degree: "B", school: "S", year: 2021 }, { degree: "G", school: "T", year: 2024 }],
  });
  it("keeps three bullets per job, two for research, none for campus", () => {
    expect(page.roles.map((r) => [r.company, r.bullets.length])).toEqual([
      ["Bridgenext", 3], ["Emtec Inc.", 3], ["Takshashila", 2],
    ]);
    expect(page.leadership).toEqual([
      { title: "Social Media Manager", org: "VivekVahini", years: "2018–21" },
      { title: "Team Lead", org: "RIT MEDIA CELL", years: "2017–19" },
    ]);
  });
  it("leaves skipped projects off the page and fills the slot", () => {
    const sel = [1, 2, 3, 4, 5, 6, 7].map((id) => ({ id, title: `P${id}` }));
    const out = onePageResume({ selected: sel, skip: [" p2 "] });
    expect(out.projects.map((p) => p.id)).toEqual([1, 3, 4, 5]);
  });
  it("keeps every certification and four projects", () => {
    expect(page.projects.map((p) => p.id)).toEqual([1, 2, 3, 4]);
    expect(page.projects[0].stack).toHaveLength(4);
    expect(page.certifications).toHaveLength(8);
    expect(page.moreCertifications).toBe(0);
    const capped = onePageResume({ certifications: [{ name: "a" }, { name: "b" }] }, { certs: 1 });
    expect(capped.moreCertifications).toBe(1);
    expect(page.degrees.map((d) => d.degree)).toEqual(["G", "B"]);
  });
});
