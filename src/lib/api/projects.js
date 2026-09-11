import createResource from "./_crud";
import { toStorageUrl, toStorageImages } from "../supabaseClient";

// Note: the public Projects components read `desc`; the DB column is `description`.
//
// Ordering is featured-first, then newest-first. `sort_order` was dropped in
// 0005 — the page sorts by date and re-sorts client-side when the visitor picks
// a different order. Hidden projects never reach anonymous visitors at all: the
// table's RLS select policy is `visible or is_owner()`, so there is nothing to
// filter here.
const projects = createResource({
  table: "projects",
  order: [
    { column: "featured", ascending: false },
    { column: "date", ascending: false, nullsFirst: false },
    { column: "id", ascending: false },
  ],
  tagType: "project",
  fromRow: (r) => ({
    id: r.id,
    title: r.title,
    subtitle: r.subtitle ?? undefined,
    link: r.link,
    image: toStorageUrl(r.image),
    date: r.date,
    desc: r.description,
    slideImages: toStorageImages(r.slide_images),
    techStack: r.tech_stack ?? [],
    highlights: r.highlights ?? [],
    links: r.links ?? [],
    category: r.category ?? undefined,
    status: r.status ?? undefined,
    role: r.role ?? undefined,
    org: r.org ?? undefined,
    featured: !!r.featured,
    visible: r.visible !== false,
    problem: r.problem ?? undefined,
    solution: r.solution ?? undefined,
    outcome: r.outcome ?? undefined,
    tags: r.tag_names ?? [],
  }),
  toRow: (v) => ({
    title: v.title,
    subtitle: v.subtitle || null,
    link: v.link,
    // `date` is a real date column now, which rejects "" — the empty form value.
    date: v.date || null,
    // `image` is nullable now; the cards fall back to the first screenshot.
    image: v.image || null,
    description: v.desc,
    slide_images: v.slideImages ?? [],
    tech_stack: (v.techStack ?? []).map((s) => s.trim()).filter(Boolean),
    highlights: (v.highlights ?? []).filter(Boolean),
    links: (v.links ?? []).filter((l) => l.url),
    category: v.category || null,
    status: v.status || null,
    role: v.role || null,
    org: v.org || null,
    featured: !!v.featured,
    // Defaults to true so a new project isn't born hidden.
    visible: v.visible !== false,
    problem: v.problem || null,
    solution: v.solution || null,
    outcome: v.outcome || null,
  }),
});

export const getProjects = projects.list;
export default projects;
