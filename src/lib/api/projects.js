import createResource from "./_crud";
import { toStorageUrl } from "../supabaseClient";

// Note: the public Projects component reads `desc`; the DB column is `description`.
const projects = createResource({
  table: "projects",
  order: [
    { column: "sort_order", ascending: true },
    { column: "id", ascending: true },
  ],
  fromRow: (r) => ({
    id: r.id,
    title: r.title,
    subtitle: r.subtitle ?? undefined,
    link: r.link,
    image: toStorageUrl(r.image),
    date: r.date,
    desc: r.description,
    sortOrder: r.sort_order,
  }),
  toRow: (v) => ({
    title: v.title,
    subtitle: v.subtitle || null,
    link: v.link,
    image: v.image,
    date: v.date,
    description: v.desc,
    sort_order: Number(v.sortOrder ?? 0),
  }),
});

export const getProjects = projects.list;
export default projects;
