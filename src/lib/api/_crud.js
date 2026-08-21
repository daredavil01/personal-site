import { supabase } from "../supabaseClient";

// Builds a CRUD resource around a table. `fromRow` maps a DB row to the shape the
// public components already expect; `toRow` maps an admin form back to columns.
// The same mapping serves both the public read pages and the /admin editor.
export default function createResource({
  table,
  fromRow,
  toRow,
  order = [{ column: "id", ascending: true }],
}) {
  // Every table carries trigger-maintained created_at/updated_at, and the
  // selects already pull them, but most fromRow mappers drop them on the floor.
  // Re-attaching them here (rather than in ten mappers) is what lets the admin
  // sort by "recently updated" and build its activity feed. Read-only: toRow is
  // untouched, so nothing new is ever written back.
  const withMeta = (row) => ({
    ...fromRow(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
  });

  async function list() {
    let query = supabase.from(table).select("*");
    order.forEach(({ column, ascending }) => {
      query = query.order(column, { ascending });
    });
    const { data, error } = await query;
    if (error) throw error;
    return data.map(withMeta);
  }

  async function create(values) {
    const { data, error } = await supabase
      .from(table)
      .insert(toRow(values))
      .select()
      .single();
    if (error) throw error;
    return withMeta(data);
  }

  async function update(id, values) {
    const { data, error } = await supabase
      .from(table)
      .update(toRow(values))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return withMeta(data);
  }

  async function remove(id) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
  }

  return { table, fromRow, toRow, list, create, update, remove };
}
