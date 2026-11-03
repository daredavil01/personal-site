import { supabase } from "../supabaseClient";
import createResource from "./_crud";
import { activityUrl } from "../strava";

// Strava activities (0038_training.sql). Rows arrive from a Strava bulk export
// (`npm run strava:import`); the /admin form edits only the site-owned
// columns — visible, the /sports race link and tags.
//
// Not in ContentContext: a training log runs to thousands of rows. The list
// page reads the light columns once (listActivities), the route view reads
// the polylines separately, and a detail page reads one full row.

// What the list, heatmap and stats need. No jsonb, no polyline.
export const LIST_COLUMNS = [
  "id", "name", "sport_type", "workout_type", "start_date", "start_date_local", "date",
  "distance", "moving_time", "elapsed_time", "total_elevation_gain", "average_speed",
  "average_heartrate", "max_heartrate", "suffer_score", "kudos_count", "pr_count",
  "achievement_count", "trainer", "commute", "gear_id", "sport_id", "visible", "private",
  "visibility", "calories",
].join(",");

const PAGE = 1000; // PostgREST's default max-rows

export const fromActivityRow = (r) => ({
  id: r.id,
  url: activityUrl(r.id),
  name: r.name || "Untitled activity",
  sport: r.sport_type || r.type || "Workout",
  workoutType: r.workout_type,
  startDate: r.start_date,
  startLocal: r.start_date_local,
  date: r.date,
  timezone: r.timezone,
  distance: r.distance ?? 0,
  movingTime: r.moving_time ?? 0,
  elapsedTime: r.elapsed_time ?? 0,
  elevationGain: r.total_elevation_gain ?? 0,
  elevHigh: r.elev_high,
  elevLow: r.elev_low,
  averageSpeed: r.average_speed,
  maxSpeed: r.max_speed,
  averageHeartrate: r.average_heartrate,
  maxHeartrate: r.max_heartrate,
  averageCadence: r.average_cadence,
  averageWatts: r.average_watts,
  maxWatts: r.max_watts,
  weightedAverageWatts: r.weighted_average_watts,
  kilojoules: r.kilojoules,
  calories: r.calories,
  sufferScore: r.suffer_score,
  perceivedExertion: r.perceived_exertion,
  kudos: r.kudos_count ?? 0,
  comments: r.comment_count ?? 0,
  achievements: r.achievement_count ?? 0,
  prs: r.pr_count ?? 0,
  athletes: r.athlete_count,
  trainer: !!r.trainer,
  commute: !!r.commute,
  manual: !!r.manual,
  private: !!r.private,
  visibility: r.visibility,
  gearId: r.gear_id,
  deviceName: r.device_name,
  description: r.description ?? "",
  route: r.route_polyline || null,
  splits: r.splits_metric || [],
  laps: r.laps || [],
  bestEfforts: r.best_efforts || [],
  segmentEfforts: r.segment_efforts || [],
  // Every other activities.csv column (weather, training load, steps, …).
  extra: r.extra || {},
  visible: r.visible !== false,
  sportId: r.sport_id ?? null,
  syncedAt: r.synced_at,
  detailSyncedAt: r.detail_synced_at,
  tags: r.tag_names ?? [],
});

// The admin form: site-owned columns only. A sync never sends these, so an
// edit here survives every re-import.
const base = createResource({
  table: "strava_activities",
  order: [{ column: "start_date", ascending: false }, { column: "id", ascending: false }],
  tagType: "activity",
  fromRow: fromActivityRow,
  toRow: (v) => ({
    visible: v.visible !== false,
    sport_id: v.sportId === "" || v.sportId == null ? null : Number(v.sportId),
  }),
});

/** Every public activity, light columns only, newest first, paged past max-rows. */
export async function listActivities({ columns = LIST_COLUMNS, withTags = true } = {}) {
  const select = withTags ? `${columns},tag_names` : columns;
  const out = [];
  for (let from = 0; ; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase
      .from("strava_activities")
      .select(select)
      .order("start_date", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...data.map(fromActivityRow));
    if (data.length < PAGE) break;
  }
  return out;
}

/** id → public route polyline, for the routes view. */
export async function listRoutes() {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase
      .from("strava_activities")
      .select("id,name,sport_type,workout_type,start_date,date,distance,sport_id,route_polyline,tag_names")
      .not("route_polyline", "is", null)
      .order("start_date", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...data.map(fromActivityRow));
    if (data.length < PAGE) break;
  }
  return out;
}

/** One full row, or null when it does not exist (or is not public). */
export async function getActivity(id) {
  const { data, error } = await supabase
    .from("strava_activities")
    .select("*, tag_names")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromActivityRow(data) : null;
}

/** The activity linked to a /sports race, if any. */
export async function getActivityForRace(sportId) {
  const { data, error } = await supabase
    .from("strava_activities")
    .select("*")
    .eq("sport_id", sportId)
    .order("start_date", { ascending: true })
    .limit(1);
  if (error) throw error;
  return data?.[0] ? fromActivityRow(data[0]) : null;
}

export async function getGear() {
  const { data, error } = await supabase.from("strava_gear").select("*").order("distance", { ascending: false });
  if (error) throw error;
  return data;
}

/** Fastest time at each standard distance, per year (activity_best_efforts RPC). */
export async function getBestEfforts() {
  const { data, error } = await supabase.rpc("activity_best_efforts");
  if (error) throw error;
  return data || [];
}

/** Admin: show/hide or link a race without touching anything else. */
export async function patchActivity(id, patch) {
  const { error } = await supabase.from("strava_activities").update(patch).eq("id", id);
  if (error) throw error;
}

// The factory's list() is one unpaged select, which PostgREST stops at 1,000
// rows; a training log passes that, so the admin list pages like the public one.
const training = { ...base, list: () => listActivities() };
export default training;

/** One month's activities, light columns, for /now's Strava stat group. */
export async function listMonthActivities(ym) {
  const [y, m] = ym.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const { data, error } = await supabase
    .from("strava_activities")
    .select("id,date,distance,moving_time,total_elevation_gain")
    .gte("date", `${ym}-01`)
    .lt("date", next)
    .limit(1000);
  if (error) throw error;
  return data.map(fromActivityRow);
}
