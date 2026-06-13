import { supabase } from "../supabaseClient";
import createResource from "./_crud";

const MONTH_ORDER = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// --- Months (one row per month) ------------------------------------------
export const nowMonths = createResource({
  table: "now_months",
  order: [{ column: "year", ascending: false }],
  fromRow: (r) => ({
    id: r.id,
    month: r.month,
    year: r.year,
    isCurrent: !!r.is_current,
    sections: r.sections ?? {},
  }),
  toRow: (v) => ({
    month: v.month,
    year: Number(v.year),
    is_current: !!v.isCurrent,
    sections: v.sections ?? {},
  }),
});

// Same sort order the static markdown loader used: current month first, then
// most-recent year, then latest calendar month.
export async function getNowMonths() {
  const months = await nowMonths.list();
  return months.sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    if (b.year !== a.year) return b.year - a.year;
    return MONTH_ORDER.indexOf(b.month) - MONTH_ORDER.indexOf(a.month);
  });
}

// --- Meta (single row, id = 1) -------------------------------------------
function metaFromRow(r) {
  if (!r) return {};
  return {
    introStory: r.intro_story ?? "",
    categoryLabels: r.category_labels ?? [],
    nownownowUrl: r.nownownow_url ?? "",
    inspiredBy: r.inspired_by ?? null,
    dailyRituals: r.daily_rituals ?? [],
  };
}

export async function getNowMeta() {
  const { data, error } = await supabase
    .from("now_meta")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return metaFromRow(data);
}

export async function updateNowMeta(values) {
  const row = {
    id: 1,
    intro_story: values.introStory ?? "",
    category_labels: values.categoryLabels ?? [],
    nownownow_url: values.nownownowUrl ?? "",
    inspired_by: values.inspiredBy ?? null,
    daily_rituals: values.dailyRituals ?? [],
  };
  const { data, error } = await supabase
    .from("now_meta")
    .upsert(row)
    .select()
    .single();
  if (error) throw error;
  return metaFromRow(data);
}
