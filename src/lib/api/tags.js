import createResource from "./_crud";
import { supabase } from "../supabaseClient";

// The central tag table. Which rows carry a tag lives in tag_associations and
// is written through each content resource (see `tagType` in _crud.js); this
// module owns the tags' own metadata plus the cross-entity queries.
// Schema: supabase/migrations/0003_centralized_tags.sql.

export const ENTITY_TYPES = ["book", "blog", "instagram", "microblog", "sport", "trek", "project"];

// Encoded, not slugified — a slug would erase Devanagari names like भटकंती.
export const tagPath = (name) => `/tags/${encodeURIComponent(String(name).toLowerCase())}`;

const fromRow = (r) => ({
  id: r.id,
  name: r.name,
  displayName: r.display_name ?? "",
  color: r.color ?? "",
  description: r.description ?? "",
  category: r.category ?? "",
  counts: r.counts ?? {},
  total: r.total ?? 0,
});

const toRow = (v) => ({
  name: String(v.name ?? "").trim().toLowerCase(),
  display_name: v.displayName || null,
  color: v.color ? v.color.toLowerCase() : null,
  description: v.description || null,
  category: v.category || null,
});

const tags = createResource({ table: "tags", order: [{ column: "name", ascending: true }], fromRow, toRow });

/** Every tag with per-entity-type `counts` and a `total`, most-used first. */
export async function getTagsWithCounts() {
  const { data, error } = await supabase.rpc("tags_with_counts");
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

/** Everything carrying the tag `name`: [{ entityType, entityId, title, subtitle, date }]. */
export async function getTagEntities(name) {
  const { data, error } = await supabase.rpc("tag_entities", { p_name: name });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    entityType: r.entity_type,
    entityId: r.entity_id,
    title: r.title ?? "",
    subtitle: r.subtitle ?? "",
    date: r.date ?? "",
  }));
}

/** Re-point every use of tag `fromId` to `intoId`, then delete `fromId`. */
export async function mergeTags(fromId, intoId) {
  const { error } = await supabase.rpc("merge_tags", { p_from: fromId, p_into: intoId });
  if (error) throw error;
}

/** Upsert tag metadata by name (the TagManager's JSON import). */
export async function upsertTagsByName(list) {
  const rows = list.map(toRow).filter((r) => r.name);
  if (!rows.length) return;
  const { error } = await supabase.from("tags").upsert(rows, { onConflict: "name" });
  if (error) throw error;
}

export default tags;
