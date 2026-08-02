import { supabase } from "../supabaseClient";

// Read-only aggregates for the admin overview page. Nothing here writes, and
// nothing here loads whole tables — counts are head-only requests and the
// activity feed takes the newest handful of rows per table.

// `label` is what the overview tile says; `path` is where clicking it lands.
// `titleColumns` are tried in order to name a row in the activity feed.
export const ADMIN_TABLES = [
  { table: "books", label: "Books", path: "/admin/books", titleColumns: ["title"] },
  { table: "sports", label: "Races", path: "/admin/sports", titleColumns: ["title"] },
  { table: "treks", label: "Treks", path: "/admin/treks", titleColumns: ["fort_name"] },
  { table: "projects", label: "Projects", path: "/admin/projects", titleColumns: ["title"] },
  { table: "blogs", label: "100 Days", path: "/admin/blogs", titleColumns: ["blog_title"] },
  { table: "instagram", label: "Instagram", path: "/admin/instagram", titleColumns: ["title"] },
  { table: "microblog", label: "Micro posts", path: "/admin/microblog", titleColumns: ["title", "text"] },
  { table: "now_months", label: "Now months", path: "/admin/now/months", titleColumns: ["month"] },
  { table: "resume_positions", label: "Positions", path: "/admin/resume/experience", titleColumns: ["position", "company"] },
  { table: "resume_degrees", label: "Degrees", path: "/admin/resume/education", titleColumns: ["school"] },
  { table: "resume_certifications", label: "Certifications", path: "/admin/resume/certifications", titleColumns: ["name"] },
  { table: "resume_skills", label: "Skills", path: "/admin/resume/skills", titleColumns: ["title"] },
];

/**
 * Row count per table. `head: true` means Postgres returns the count in a
 * header and no rows cross the wire — cheap enough to run for all 12 on load.
 * A table that errors resolves to `null` rather than failing the whole page.
 */
export async function getTableCounts() {
  const entries = await Promise.all(ADMIN_TABLES.map(async (spec) => {
    const { count, error } = await supabase
      .from(spec.table)
      .select("*", { count: "exact", head: true });
    return [spec.table, error ? null : (count ?? 0)];
  }));
  return Object.fromEntries(entries);
}

const firstNonEmpty = (row, columns) => {
  const hit = columns.map((c) => row[c]).find((v) => v !== null && v !== undefined && v !== "");
  return hit === undefined ? null : String(hit);
};

/**
 * The newest rows across every table, merged and re-sorted by `updated_at`.
 * Each entry is `{ id, table, label, path, title, updatedAt }`.
 */
export async function getRecentActivity(limit = 10) {
  const perTable = Math.min(5, limit);
  const results = await Promise.all(ADMIN_TABLES.map(async (spec) => {
    const { data, error } = await supabase
      .from(spec.table)
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(perTable);
    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id,
      table: spec.table,
      label: spec.label,
      path: spec.path,
      title: firstNonEmpty(row, spec.titleColumns) ?? `#${row.id}`,
      updatedAt: row.updated_at ?? row.created_at ?? null,
    }));
  }));

  return results
    .flat()
    .filter((entry) => entry.updatedAt)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, limit);
}

export default { getTableCounts, getRecentActivity };
