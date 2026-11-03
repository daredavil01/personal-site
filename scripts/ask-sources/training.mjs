// Training — one chunk per month of Strava activities (0038), not one per
// activity: "how far did I run in March 2025?" and "what was my longest ride?"
// are month-shaped questions, and two thousand near-identical "Morning Run"
// chunks would crowd every other type out of retrieval.
//
// Only public activities: the indexer runs with the service key, which
// bypasses the RLS that hides private, followers-only and hidden ones.
//
// Strava's API agreement forbids training AI models on its data. Retrieval is
// not training, but this is the most sensitive use of the data on the site, so
// it has an off switch: ASK_SKIP_TRAINING=1 makes the source return nothing,
// and the next `npm run ask:index` removes every training chunk.

import { FAMILY_LABELS, sportFamily, totalsByMonth } from "../../src/lib/training.js";
import { formatDistance, formatDuration, sportLabel } from "../../src/lib/strava.js";

const COLUMNS = "id,name,sport_type,date,start_date,distance,moving_time,total_elevation_gain,"
  + "average_speed,workout_type,sport_id,private,visibility,visible";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December"];
const monthLabel = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

const isPublic = (r) => r.visible !== false && !r.private && (r.visibility || "everyone") === "everyone";

const toClient = (r) => ({
  id: r.id,
  name: r.name,
  sport: r.sport_type,
  date: r.date,
  startDate: r.start_date,
  distance: r.distance || 0,
  movingTime: r.moving_time || 0,
  elevationGain: r.total_elevation_gain || 0,
  workoutType: r.workout_type,
  sportId: r.sport_id,
});

const line = (a) => `${a.name} (${sportLabel(a.sport)}, ${a.date}, ${[formatDistance(a.distance), formatDuration(a.movingTime)].filter(Boolean).join(", ")}) /training/${a.id}`;

export default {
  type: "training",
  load: async (ctx) => {
    if (process.env.ASK_SKIP_TRAINING === "1") return [];
    try {
      return await ctx.fetchAll("strava_activities", COLUMNS);
    } catch (err) {
      // Before 0038 is applied there is no table: keep whatever chunks exist.
      throw Object.assign(err, { keep: /strava_activities/.test(err.message || "") });
    }
  },
  toChunks: (rows, { compose, syntheticId }) => {
    const list = rows.filter(isPublic).map(toClient).filter((r) => r.date);
    return totalsByMonth(list).map((m) => {
      const inMonth = list.filter((r) => r.date.startsWith(m.month));
      const notable = [...inMonth].sort((a, b) => b.distance - a.distance).slice(0, 8);
      const races = inMonth.filter((r) => r.sportId || r.workoutType === 1 || r.workoutType === 11);
      const label = monthLabel(m.month);
      return {
        entity_type: "training",
        entity_id: syntheticId(`training:${m.month}`),
        chunk_index: 0,
        title: `Training in ${label}`,
        url: `/training?year=${m.month.slice(0, 4)}`,
        chunk_date: `${m.month}-01`,
        tags: [],
        image_url: null,
        body: compose([
          ["Strava training log", label],
          ["Activities", String(m.count)],
          ["Distance", formatDistance(m.distance)],
          ["Moving time", formatDuration(m.movingTime)],
          ["Elevation gain", m.elevationGain ? `${Math.round(m.elevationGain)} m` : null],
          ["By sport", m.families
            .map((f) => `${FAMILY_LABELS[f.family] || f.family}: ${f.count}, ${formatDistance(f.distance)}`)
            .join("; ")],
          ["Races", races.length ? races.map(line).join("; ") : null],
          ["Longest", notable.length ? notable.map(line).join("; ") : null],
          ["Sports", [...new Set(inMonth.map((r) => sportFamily(r.sport)))].join(", ")],
        ]),
      };
    });
  },
};
