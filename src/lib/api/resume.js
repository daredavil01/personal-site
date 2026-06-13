import createResource from "./_crud";

const order = [
  { column: "sort_order", ascending: true },
  { column: "id", ascending: true },
];

export const positions = createResource({
  table: "resume_positions",
  order,
  fromRow: (r) => ({
    id: r.id,
    company: r.company,
    position: r.position,
    link: r.link,
    daterange: r.daterange,
    points: r.points ?? [],
    sortOrder: r.sort_order,
  }),
  toRow: (v) => ({
    company: v.company,
    position: v.position,
    link: v.link,
    daterange: v.daterange,
    points: v.points ?? [],
    sort_order: Number(v.sortOrder ?? 0),
  }),
});

export const degrees = createResource({
  table: "resume_degrees",
  order,
  fromRow: (r) => ({
    id: r.id,
    school: r.school,
    degree: r.degree,
    link: r.link,
    year: r.year,
    sortOrder: r.sort_order,
  }),
  toRow: (v) => ({
    school: v.school,
    degree: v.degree,
    link: v.link,
    year: Number(v.year),
    sort_order: Number(v.sortOrder ?? 0),
  }),
});

export const certifications = createResource({
  table: "resume_certifications",
  order,
  fromRow: (r) => ({
    id: r.id,
    name: r.name,
    link: r.link,
    source: r.source,
    issuedDate: r.issued_date,
    sortOrder: r.sort_order,
  }),
  toRow: (v) => ({
    name: v.name,
    link: v.link,
    source: v.source,
    issued_date: v.issuedDate,
    sort_order: Number(v.sortOrder ?? 0),
  }),
});

export const skills = createResource({
  table: "resume_skills",
  order,
  fromRow: (r) => ({
    id: r.id,
    title: r.title,
    competency: r.competency,
    category: r.category ?? [],
    sortOrder: r.sort_order,
  }),
  toRow: (v) => ({
    title: v.title,
    competency: Number(v.competency),
    category: v.category ?? [],
    sort_order: Number(v.sortOrder ?? 0),
  }),
});

// Convenience: load the whole resume in one call (used by the Resume page).
export async function getResume() {
  const [pos, deg, certs, sk] = await Promise.all([
    positions.list(),
    degrees.list(),
    certifications.list(),
    skills.list(),
  ]);
  return {
    positions: pos, degrees: deg, certifications: certs, skills: sk,
  };
}
