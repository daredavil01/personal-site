import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link, useParams } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import { LoadingBlock, ErrorBlock } from "../components/common/AsyncStates";
import TagLinks from "../components/common/TagLinks";
import RouteShape from "../components/Training/RouteShape";
import DayStory from "../components/Training/DayStory";
import { SampleRibbon } from "../components/Training/shared";
import "../components/Training/training.css";
import { buildTrainingMeta } from "../data/pageMeta";
import { getActivity } from "../lib/api/training";
import { isDemoId } from "../lib/trainingDemoId";
import {
  activityUrl, formatDistance, formatDuration, formatEffortSpeed, isPaceSport, sportLabel,
} from "../lib/strava";

// /training/:id — one Strava activity: the numbers, splits per km, laps, best
// efforts and the (end-trimmed) route, all from the export's GPS file, plus
// every other activities.csv column under "More from Strava". A private or hidden activity
// is refused by RLS, so it reads as "not found" to everyone but the owner.

const toolLink = "inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors no-underline";
const th = "px-3 py-2 font-label text-[10px] uppercase tracking-widest text-stone-400 text-left";
const td = "px-3 py-2 text-sm tabular-nums whitespace-nowrap";

const BackLink = () => (
  <Link to="/training" className={toolLink}>
    <span className="material-symbols-outlined text-sm">arrow_back</span> All training
  </Link>
);

const Stat = ({ label, value }) => (value ? (
  <div className="p-4 rounded-xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900">
    <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 mb-1">{label}</p>
    <p className="font-headline text-2xl text-stone-900 dark:text-stone-100 mb-0 tabular-nums">{value}</p>
  </div>
) : null);

Stat.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.node };
Stat.defaultProps = { value: null };

const Table = ({ title, head, rows }) => (rows.length ? (
  <section className="flex flex-col gap-3">
    <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100 mb-0">{title}</h2>
    <div className="overflow-x-auto border border-stone-100 dark:border-stone-800 rounded-xl">
      <table className="w-full border-collapse">
        <thead className="bg-stone-50 dark:bg-stone-900/60">
          <tr>{head.map((h) => <th key={h} className={th} scope="col">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={i} className="border-t border-stone-100 dark:border-stone-800">
              {cells.map((c, j) => <td key={head[j]} className={td}>{c ?? "—"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
) : null);

Table.propTypes = {
  title: PropTypes.string.isRequired,
  head: PropTypes.arrayOf(PropTypes.string).isRequired,
  rows: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.node)).isRequired,
};

const round = (v) => (v ? Math.round(v) : null);

const TrainingPost = () => {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, activity: null, error: null });

  useEffect(() => {
    let live = true;
    setState({ loading: true, activity: null, error: null });
    if (!/^\d{1,19}$/.test(id)) {
      setState({ loading: false, activity: null, error: null });
      return undefined;
    }
    // A sample row (shown on /training until the first import) is read from
    // the seeded set, never from Supabase.
    const read = isDemoId(id)
      ? import("../lib/trainingDemo").then((m) => m.demoActivity(id))
      : getActivity(id);
    read
      .then((a) => live && setState({ loading: false, activity: a, error: null }))
      .catch((e) => live && setState({ loading: false, activity: null, error: e }));
    return () => { live = false; };
  }, [id]);

  if (state.loading) return <PageShell region="marathons"><LoadingBlock label="Loading activity…" /></PageShell>;
  if (state.error) return <PageShell region="marathons"><ErrorBlock /></PageShell>;

  const a = state.activity;
  if (!a) {
    return (
      <PageShell region="marathons" title="Activity Not Found" noindex>
        <div className="flex flex-col gap-6 w-full max-w-2xl">
          <BackLink />
          <p className="font-body text-stone-500 dark:text-stone-400">Activity not found.</p>
        </div>
      </PageShell>
    );
  }

  const speed = (mps) => formatEffortSpeed(a.sport, mps);
  const meta = buildTrainingMeta({
    name: a.name,
    sport: sportLabel(a.sport),
    date: a.date,
    summary: [formatDistance(a.distance), formatDuration(a.movingTime)].filter(Boolean).join(" · "),
  });
  const time = a.startLocal ? a.startLocal.slice(11, 16) : null;

  return (
    <PageShell region="marathons" title={meta.title} description={meta.description} image={meta.image}>
      <div className="flex flex-col gap-8 w-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BackLink />
          {isDemoId(a.id) ? <SampleRibbon /> : (
            <a href={activityUrl(a.id)} target="_blank" rel="noopener noreferrer" className={`${toolLink} text-[#FC4C02]`}>
              <span className="material-symbols-outlined text-sm">open_in_new</span> View on Strava
            </a>
          )}
        </div>

        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-0.5 rounded-md bg-secondary text-white font-label text-[10px] uppercase tracking-widest font-bold">
              {sportLabel(a.sport)}
            </span>
            {a.sportId && (
              <Link to={`/sports/${a.sportId}`} className="px-2 py-0.5 rounded-md border border-secondary text-secondary font-label text-[10px] uppercase tracking-widest no-underline">
                Race page
              </Link>
            )}
            {a.trainer && <span className="px-2 py-0.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-500 font-label text-[10px] uppercase tracking-widest">Indoor</span>}
            {a.commute && <span className="px-2 py-0.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-500 font-label text-[10px] uppercase tracking-widest">Commute</span>}
          </div>
          <h1 className="font-headline text-4xl md:text-5xl text-stone-900 dark:text-stone-100 mb-0 leading-tight">{a.name}</h1>
          <p className="font-body text-xs text-stone-400 mb-0">
            {[a.date, time, a.deviceName].filter(Boolean).join(" · ")}
          </p>
          {a.description && (
            <p className="font-body text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line mb-0">{a.description}</p>
          )}
          <TagLinks tags={a.tags} />
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Distance" value={formatDistance(a.distance)} />
          <Stat label="Moving time" value={formatDuration(a.movingTime)} />
          <Stat label={isPaceSport(a.sport) ? "Pace" : "Speed"} value={speed(a.averageSpeed)} />
          <Stat label="Elevation" value={a.elevationGain ? `${Math.round(a.elevationGain)} m` : null} />
          <Stat label="Elapsed" value={a.elapsedTime !== a.movingTime ? formatDuration(a.elapsedTime) : null} />
          <Stat label="Avg heart rate" value={round(a.averageHeartrate) && `${round(a.averageHeartrate)} bpm`} />
          <Stat label="Max heart rate" value={round(a.maxHeartrate) && `${round(a.maxHeartrate)} bpm`} />
          <Stat label="Cadence" value={round(a.averageCadence) && `${round(isPaceSport(a.sport) ? a.averageCadence * 2 : a.averageCadence)} ${isPaceSport(a.sport) ? "spm" : "rpm"}`} />
          <Stat label="Power" value={round(a.averageWatts) && `${round(a.averageWatts)} W`} />
          <Stat label="Calories" value={round(a.calories) && `${round(a.calories)} kcal`} />
          <Stat label="Relative effort" value={round(a.sufferScore)} />
          <Stat label="Kudos" value={a.kudos || null} />
        </div>

        <DayStory activity={a} />

        {a.route && a.splits.length < 2 && (
          <section className="flex flex-col gap-2">
            <div className="aspect-[4/3] md:aspect-[2/1] w-full p-4 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 text-secondary">
              <RouteShape polyline={a.route} label={`Route of ${a.name}`} strokeWidth={3} animate />
            </div>
            <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 mb-0">Start and finish trimmed for privacy.</p>
          </section>
        )}

        {(() => {
          // Running dynamics columns only when the watch recorded them.
          const has = (k) => a.splits.some((x) => x[k] != null);
          const cols = [
            ["Km", (x) => x.split],
            ["Time", (x) => formatDuration(x.moving_time)],
            [isPaceSport(a.sport) ? "Pace" : "Speed", (x) => speed(x.average_speed)],
            ["Elev.", (x) => (x.elevation_difference != null ? `${Math.round(x.elevation_difference)} m` : null)],
            ["HR", (x) => round(x.average_heartrate)],
            has("average_cadence") && ["Cadence", (x) => round(isPaceSport(a.sport) ? x.average_cadence * 2 : x.average_cadence)],
            has("average_watts") && ["Power", (x) => (x.average_watts ? `${round(x.average_watts)} W` : null)],
            has("average_step_length") && ["Stride", (x) => (x.average_step_length ? `${(x.average_step_length / 1000).toFixed(2)} m` : null)],
            has("average_ground_contact") && ["Contact", (x) => (x.average_ground_contact ? `${round(x.average_ground_contact)} ms` : null)],
            has("average_vertical_oscillation") && ["Bounce", (x) => (x.average_vertical_oscillation ? `${(x.average_vertical_oscillation / 10).toFixed(1)} cm` : null)],
          ].filter(Boolean);
          return <Table title="Splits" head={cols.map((c) => c[0])} rows={a.splits.map((x) => cols.map((c) => c[1](x)))} />;
        })()}

        {a.laps.length > 1 && (
          <Table
            title="Laps"
            head={["Lap", "Distance", "Time", isPaceSport(a.sport) ? "Pace" : "Speed", "HR"]}
            rows={a.laps.map((l) => [
              l.lap_index ?? l.name,
              formatDistance(l.distance),
              formatDuration(l.moving_time),
              speed(l.average_speed),
              round(l.average_heartrate),
            ])}
          />
        )}

        <Table
          title="Best efforts"
          head={["Distance", "Time", "Rank"]}
          rows={a.bestEfforts.map((e) => [e.name, formatDuration(e.elapsed_time), e.pr_rank ? `PR #${e.pr_rank}` : null])}
        />

        <Table
          title="Segments"
          head={["Segment", "Distance", "Time", "Grade", "Rank"]}
          rows={a.segmentEfforts.map((e) => [
            e.name,
            formatDistance(e.distance),
            formatDuration(e.elapsed_time),
            e.average_grade != null ? `${e.average_grade}%` : null,
            e.pr_rank ? `PR #${e.pr_rank}` : null,
          ])}
        />

        {Object.keys(a.extra).some((k) => !k.startsWith("_")) && (
          <section className="flex flex-col gap-3">
            <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100 mb-0">More from Strava</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-0">
              {Object.entries(a.extra).filter(([k]) => !k.startsWith("_")).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-stone-100 dark:border-stone-800 py-1">
                  <dt className="font-label text-[10px] uppercase tracking-widest text-stone-400">{k}</dt>
                  <dd className="text-sm text-stone-700 dark:text-stone-300 tabular-nums text-right mb-0 break-words min-w-0">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <p className="font-label text-[10px] uppercase tracking-widest mb-0">
          <a href="https://www.strava.com" target="_blank" rel="noopener noreferrer" className="text-[#FC4C02] no-underline font-bold">
            Powered by Strava
          </a>
        </p>
      </div>
    </PageShell>
  );
};

export default TrainingPost;
