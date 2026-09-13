// The résumé: four tables, one chunk per position, degree and certificate,
// plus one chunk for the whole skills matrix. Ids are synthetic because the
// four tables share one entity type and their own ids would collide.

const TABLES = ["resume_positions", "resume_degrees", "resume_certifications", "resume_skills"];

export default {
  type: "resume",
  load: async (ctx) => {
    const [positions, degrees, certifications, skills] = await Promise.all(
      TABLES.map((t) => ctx.fetchAll(t, "*")),
    );
    return { positions, degrees, certifications, skills };
  },
  toChunks: ({ positions, degrees, certifications, skills }, { compose, syntheticId, parseLooseDate }) => {
    const base = { entity_type: "resume", chunk_index: 0, url: "/resume", tags: [], image_url: null };
    const out = [];

    positions.forEach((r) => out.push({
      ...base,
      entity_id: syntheticId(`position:${r.id}`),
      title: `${r.position} at ${r.company}`,
      chunk_date: null,
      body: compose([
        ["Work experience", `${r.position} at ${r.company}`],
        ["Dates", r.daterange],
        ["Company site", r.link],
        [null, (r.points || []).join(" · ")],
      ]),
    }));

    degrees.forEach((r) => out.push({
      ...base,
      entity_id: syntheticId(`degree:${r.id}`),
      title: `${r.degree}, ${r.school}`,
      chunk_date: r.year ? `${r.year}-01-01` : null,
      body: compose([
        ["Education", r.degree],
        ["School", r.school],
        ["Year", r.year],
        ["Link", r.link],
      ]),
    }));

    certifications.forEach((r) => out.push({
      ...base,
      entity_id: syntheticId(`certification:${r.id}`),
      title: r.name,
      chunk_date: parseLooseDate(r.issued_date),
      body: compose([
        ["Certification", r.name],
        ["Issued by", r.source],
        ["Issued", r.issued_date],
        ["Credential", r.link],
      ]),
    }));

    if (skills.length) {
      const byCategory = new Map();
      skills.forEach((s) => {
        (s.category?.length ? s.category : ["Other"]).forEach((cat) => {
          byCategory.set(cat, [...(byCategory.get(cat) || []), `${s.title} (${s.competency}/5)`]);
        });
      });
      out.push({
        ...base,
        entity_id: syntheticId("skills"),
        title: "Skills",
        chunk_date: null,
        body: compose([
          ["Skills", "self-rated competency out of 5"],
          ...[...byCategory].map(([cat, list]) => [cat, list.join(", ")]),
        ]),
      });
    }
    return out;
  },
};
