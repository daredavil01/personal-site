import { supabase } from "../supabaseClient";
import createResource from "./_crud";

export const MONTH_ORDER = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "September" + 2026 → "2026-09", the issue's URL slug. */
export function monthSlug(month, year) {
  const index = MONTH_ORDER.indexOf(month);
  if (index < 0 || !year) return null;
  return `${year}-${String(index + 1).padStart(2, "0")}`;
}

// --- Months (one row per month) ------------------------------------------
// Each row is also a newsletter issue (0032): published ones are read at
// /newsletter/<slug>, the current one is what /now shows.
export const nowMonths = createResource({
  table: "now_months",
  order: [{ column: "year", ascending: false }],
  fromRow: (r) => ({
    id: r.id,
    month: r.month,
    year: r.year,
    isCurrent: !!r.is_current,
    sections: r.sections ?? {},
    slug: r.slug || monthSlug(r.month, r.year),
    headline: r.headline ?? "",
    note: r.note ?? "",
    poll: r.poll ?? null,
    publishedAt: r.published_at ?? null,
    cardUrl: r.card_url ?? null,
  }),
  toRow: (v) => ({
    month: v.month,
    year: Number(v.year),
    is_current: !!v.isCurrent,
    sections: v.sections ?? {},
    slug: monthSlug(v.month, Number(v.year)),
    headline: v.headline || null,
    note: v.note || null,
    poll: v.poll?.q ? v.poll : null,
    published_at: v.publishedAt || null,
    card_url: v.cardUrl || null,
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
