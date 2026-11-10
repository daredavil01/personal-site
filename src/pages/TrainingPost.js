import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link, useParams } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import { LoadingBlock, ErrorBlock } from "../components/common/AsyncStates";
import TagLinks from "../components/common/TagLinks";
import {
  ArenaFonts, Fig, Plate, Readout, useSeen,
} from "../components/Arena/Arena";
import RouteShape from "../components/Training/RouteShape";
import DayStory from "../components/Training/DayStory";
import SplitChart from "../components/Training/SplitChart";
import { STAGE_COLORS } from "../components/Training/Swarm";
import { SampleRibbon } from "../components/Training/shared";
import "../components/Training/training.css";
import { buildTrainingMeta } from "../data/pageMeta";
import { getActivity } from "../lib/api/training";
import { sportFamily } from "../lib/training";
import { isDemoId } from "../lib/trainingDemoId";
import {
  activityUrl, formatDistance, formatDuration, formatEffortSpeed, isPaceSport, sportLabel,
} from "../lib/strava";

// /training/:id — one Strava activity (v27). A stage with the route drawing
// itself and the headline numbers; the day replayed (DayStory); the splits as
// bars with the heart-rate line over them; where the heart spent its time
// (the import's 10-bpm bins, no zone model); form, conditions, laps and best
// efforts; and every other activities.csv column under "Everything else".
// A private or hidden activity is refused by RLS, so it reads as "not found"
// to everyone but the owner.

const toolLink = "inline-flex items-center gap-1.5 ar-kicker no-underline text-white/70 hover:text-white transition-colors";
const int = (n) => Math.round(n).toLocaleString("en-GB");
const round = (v) => (v ? Math.round(v) : null);

const BackLink = ({ dark }) => (
  <Link to="/training" className={dark ? toolLink : "inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors no-underline"} style={dark ? { fontSize: "0.64rem" } : undefined}>
    <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_back</span>
    Every session
  </Link>
);
BackLink.propTypes = { dark: PropTypes.bool };
BackLink.defaultProps = { dark: false };

const Table = ({ head, rows }) => (rows.length ? (
  <div className="ar-scroll-x">
    <table className="ar-table">
      <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((cells, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <tr key={i}>{cells.map((c, j) => <td key={head[j]}>{c ?? "—"}</td>)}</tr>
        ))}
      </tbody>
    </table>
  </div>
) : null);
Table.propTypes = {
  head: PropTypes.arrayOf(PropTypes.string).isRequired,
  rows: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.node)).isRequired,
};

/** Seconds at each 10-bpm band, as the import recorded them. */
const HeartBands = ({ bins }) => {
  const [ref, seen] = useSeen(0.3);
  const list = Object.entries(bins || {}).map(([b, s]) => ({ bpm: Number(b), secs: Number(s) })).filter((x) => x.secs > 0).sort((a, b) => a.bpm - b.bpm);
  if (list.length < 2) return null;
  const max = Math.max(...list.map((x) => x.secs));
  const total = list.reduce((a, x) => a + x.secs, 0);
  const peak = list.find((x) => x.secs === max);
  return (
    <figure ref={ref} className={`m-0 ${seen ? "is-seen" : ""}`}>
      <div className="flex items-end gap-1.5 h-32" role="img" aria-label={`Time at each heart rate. Most at ${peak.bpm}–${peak.bpm + 9} bpm: ${formatDuration(peak.secs)}.`}>
        {list.map((x, i) => (
          <span key={x.bpm} className="flex-1 h-full flex flex-col justify-end" title={`${x.bpm}–${x.bpm + 9} bpm: ${formatDuration(x.secs)} (${Math.round((x.secs / total) * 100)}%)`}>
            <span className="ar-vbar block rounded-t-md" style={{ height: `${Math.max(2, (x.secs / max) * 100)}%`, background: "#dc2626", opacity: 0.25 + 0.75 * (i / (list.length - 1)), "--ar-delay": `${i * 60}ms` }} />
          </span>
        ))}
      </div>
      <figcaption className="flex gap-1.5 mt-1.5 text-[10px] tabular-nums" style={{ color: "var(--ar-muted)" }} aria-hidden="true">
        {list.map((x) => <span key={x.bpm} className="flex-1 text-center">{x.bpm}</span>)}
      </figcaption>
      <p className="ar-fig-note mt-3 mb-0">{`Most of it at ${peak.bpm}–${peak.bpm + 9} bpm: ${formatDuration(peak.secs)}, ${Math.round((peak.secs / total) * 100)}% of the recorded time.`}</p>
    </figure>
  );
};
HeartBands.propTypes = { bins: PropTypes.shape({}) };
HeartBands.defaultProps = { bins: null };

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
  const pace = isPaceSport(a.sport);
  const ex = (k) => (a.extra && a.extra[k] != null && a.extra[k] !== "" ? a.extra[k] : null);
  // eslint-disable-next-line no-underscore-dangle
  const stats = a.extra?._stats || {};
  const color = STAGE_COLORS[sportFamily(a.sport)] || STAGE_COLORS.other;
  const longDate = a.date ? new Date(`${a.date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";
  const hasDistance = Number(a.distance) > 0;
  const more = Object.entries(a.extra).filter(([k]) => !k.startsWith("_"));

  // Running dynamics columns only when the watch recorded them.
  const has = (k) => a.splits.some((x) => x[k] != null);
  const cols = [
    ["Km", (x) => x.split],
    ["Time", (x) => formatDuration(x.moving_time)],
    [pace ? "Pace" : "Speed", (x) => speed(x.average_speed)],
    ["Elev.", (x) => (x.elevation_difference != null ? `${Math.round(x.elevation_difference)} m` : null)],
    ["HR", (x) => round(x.average_heartrate)],
    has("average_cadence") && ["Cadence", (x) => round(pace ? x.average_cadence * 2 : x.average_cadence)],
    has("average_watts") && ["Power", (x) => (x.average_watts ? `${round(x.average_watts)} W` : null)],
    has("average_step_length") && ["Stride", (x) => (x.average_step_length ? `${(x.average_step_length / 1000).toFixed(2)} m` : null)],
    has("average_ground_contact") && ["Contact", (x) => (x.average_ground_contact ? `${round(x.average_ground_contact)} ms` : null)],
    has("average_vertical_oscillation") && ["Bounce", (x) => (x.average_vertical_oscillation ? `${(x.average_vertical_oscillation / 10).toFixed(1)} cm` : null)],
  ].filter(Boolean);

  const form = [
    { label: "Cadence", value: round(a.averageCadence) && `${round(pace ? a.averageCadence * 2 : a.averageCadence)} ${pace ? "spm" : "rpm"}`, note: ex("Max Cadence") ? `peaked at ${Math.round(Number(ex("Max Cadence")) * (pace ? 2 : 1))}` : null },
    { label: "Steps", value: stats.steps ? int(stats.steps) : null },
    { label: "Stride", value: ex("Average Step Length (mm)") ? `${(Number(ex("Average Step Length (mm)")) / 1000).toFixed(2)} m` : null },
    { label: "Ground contact", value: ex("Average Ground Contact Time (ms)") ? `${Math.round(ex("Average Ground Contact Time (ms)"))} ms` : null, note: "each foot down" },
    { label: "Bounce", value: ex("Average Vertical Oscillation (mm)") ? `${(Number(ex("Average Vertical Oscillation (mm)")) / 10).toFixed(1)} cm` : null, note: ex("Average Vertical Ratio") ? `vertical ratio ${ex("Average Vertical Ratio")}%` : null },
    { label: "Power", value: round(a.averageWatts) && `${round(a.averageWatts)} W`, note: stats.pMax ? `peaked at ${stats.pMax} W` : null },
    { label: "Effort pace", value: ex("Effort Pace"), note: "adjusted for the hills" },
    { label: "Half split", value: stats.negSplit != null && stats.negSplit !== 0 ? `${Math.abs(stats.negSplit)} s/km` : null, note: stats.negSplit < 0 ? "second half quicker" : "second half slower" },
  ].filter((f) => f.value);
  const conditions = [
    { label: "Temperature", value: stats.tMax != null ? `${stats.tMin}–${stats.tMax} °C` : (ex("Average Temperature") != null ? `${ex("Average Temperature")} °C` : null), note: "at the wrist" }, // eslint-disable-line no-nested-ternary
    { label: "Highest point", value: (stats.altMax ?? a.elevHigh) != null ? `${int(stats.altMax ?? a.elevHigh)} m` : null, note: (stats.altMin ?? a.elevLow) != null ? `lowest ${int(stats.altMin ?? a.elevLow)} m` : null },
    { label: "Descended", value: Number(ex("Elevation Loss")) > 0 ? `${int(ex("Elevation Loss"))} m` : null },
    { label: "Off road", value: Number(ex("Dirt Distance")) > 0 ? formatDistance(Number(ex("Dirt Distance"))) : null, note: "on dirt" },
    { label: "Training load", value: ex("Training Load") ? String(Math.round(ex("Training Load"))) : null },
    { label: "Relative effort", value: round(a.sufferScore) ? String(round(a.sufferScore)) : null },
  ].filter((f) => f.value);

  return (
    <PageShell region="marathons" title={meta.title} description={meta.description} image={meta.image}>
      <ArenaFonts />
      <div className="ar-root tr-root flex flex-col gap-6 w-full">
        <section className="ar-stage" aria-labelledby="act-title">
          <div className="px-5 pt-6 pb-8 md:px-10 md:pt-8 md:pb-10 flex flex-col gap-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <BackLink dark />
              {isDemoId(a.id) ? <SampleRibbon dark /> : (
                <a href={activityUrl(a.id)} target="_blank" rel="noopener noreferrer" className={toolLink} style={{ fontSize: "0.64rem", color: "#FC4C02" }}>
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">open_in_new</span>
                  View on Strava
                </a>
              )}
            </div>

            <div className={`grid gap-8 items-center ${a.route ? "md:grid-cols-[minmax(0,1fr)_minmax(0,300px)]" : ""}`}>
              <div className="flex flex-col gap-4 min-w-0">
                <p className="ar-kicker mb-0 flex flex-wrap items-center gap-x-2 gap-y-1 ar-stage-muted">
                  <span className="inline-flex items-center gap-1.5 text-white">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />
                    {sportLabel(a.sport)}
                  </span>
                  {[longDate, time ? `${time} start` : null, a.deviceName].filter(Boolean).map((x) => <span key={x}>{`· ${x}`}</span>)}
                </p>
                <h1 id="act-title" className="ar-title" style={{ fontSize: "clamp(2.2rem, 6.4cqw, 4.2rem)", lineHeight: 0.94 }}>{a.name}</h1>
                <div className="flex flex-wrap gap-2">
                  {a.sportId && (
                    <Link to={`/sports/${a.sportId}`} className="ar-chip no-underline" style={{ color: "#ffc861", borderColor: "#ffc861" }}>
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">flag</span>
                      The race page
                    </Link>
                  )}
                  {a.trainer && <span className="ar-chip">Indoor</span>}
                  {a.commute && <span className="ar-chip">Commute</span>}
                </div>
                <p className="ar-num mb-0 ar-stage-gold mt-1" style={{ fontSize: "clamp(3.6rem, 12cqw, 6.8rem)" }}>
                  {hasDistance ? (
                    <>
                      {(a.distance / 1000).toFixed(a.distance >= 100000 ? 0 : 1)}
                      <span className="ar-unit">km</span>
                    </>
                  ) : formatDuration(a.movingTime)}
                </p>
                {a.description && <p className="mb-0 text-base leading-relaxed text-white/85 whitespace-pre-line max-w-xl">{a.description}</p>}
              </div>
              {a.route && (
                <figure className="m-0">
                  <div className="aspect-square w-full max-w-[300px] p-4" style={{ color }}>
                    <RouteShape polyline={a.route} label={`Route of ${a.name}`} strokeWidth={3} animate />
                  </div>
                  <figcaption className="ar-kicker ar-stage-muted" style={{ fontSize: "0.56rem" }}>Start and finish trimmed for privacy</figcaption>
                </figure>
              )}
            </div>
          </div>
          <Readout
            items={[
              { label: "Moving time", value: hasDistance ? formatDuration(a.movingTime) : null, note: a.elapsedTime !== a.movingTime ? `${formatDuration(a.elapsedTime)} out of the door` : null },
              { label: pace ? "Pace" : "Speed", value: hasDistance ? speed(a.averageSpeed) : null },
              { label: "Climbed", value: a.elevationGain ? Math.round(a.elevationGain) : null, unit: "m" },
              { label: "Heart rate", value: round(a.averageHeartrate), unit: "bpm", note: a.maxHeartrate ? `peaked at ${round(a.maxHeartrate)}` : null },
              { label: "Steps", value: stats.steps || null },
              { label: "Energy", value: round(a.calories), unit: "kcal" },
            ]}
          />
        </section>

        <TagLinks tags={a.tags} className="px-1" />

        <DayStory activity={a} />

        {a.splits.length > 1 && (
          <Plate kicker="Kilometre by kilometre" title={`${a.splits.length} splits`}>
            <SplitChart splits={a.splits} sport={a.sport} />
            <details className="ar-details mt-5">
              <summary className="ar-chip ar-chip-paper">
                The splits table
                <span className="material-symbols-outlined text-sm transition-transform" aria-hidden="true">expand_more</span>
              </summary>
              <div className="mt-4"><Table head={cols.map((c) => c[0])} rows={a.splits.map((x) => cols.map((c) => c[1](x)))} /></div>
            </details>
          </Plate>
        )}

        <div className={`ar-grid ${stats.hrBins && form.length ? "ar-grid-2" : ""}`}>
          {stats.hrBins && (
            <Plate kicker="Heart" title="Where the heart sat" sub={stats.drift != null ? `Drift ${stats.drift > 0 ? "+" : ""}${stats.drift}%: the second half against the first, pace held equal. Under 5% means it stayed aerobic.` : null}>
              <HeartBands bins={stats.hrBins} />
            </Plate>
          )}
          {form.length > 0 && (
            <Plate kicker="Form" title="How it was run">
              <div className="ar-figs" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                {form.map((f) => <Fig key={f.label} label={f.label} value={f.value} note={f.note} />)}
              </div>
            </Plate>
          )}
        </div>

        {conditions.length > 0 && (
          <Plate kicker="Conditions" title="The day itself">
            <div className="ar-figs ar-figs-wide">{conditions.map((f) => <Fig key={f.label} label={f.label} value={f.value} note={f.note} />)}</div>
          </Plate>
        )}

        {a.laps.length > 1 && (
          <Plate kicker="Laps" title={`${a.laps.length} laps`}>
            <Table
              head={["Lap", "Distance", "Time", pace ? "Pace" : "Speed", "HR"]}
              rows={a.laps.map((l) => [l.lap_index ?? l.name, formatDistance(l.distance), formatDuration(l.moving_time), speed(l.average_speed), round(l.average_heartrate)])}
            />
          </Plate>
        )}

        {a.bestEfforts.length > 0 && (
          <Plate kicker="Inside this session" title="Best efforts" sub="The fastest stretch of each standard distance, found in the GPS track.">
            <div className="ar-figs ar-figs-4">
              {a.bestEfforts.map((e) => <Fig key={e.name} label={e.name} value={formatDuration(e.elapsed_time)} note={e.pr_rank ? `All-time no. ${e.pr_rank}` : null} />)}
            </div>
          </Plate>
        )}

        {a.segmentEfforts.length > 0 && (
          <Plate kicker="Segments" title={`${a.segmentEfforts.length} segments`}>
            <Table
              head={["Segment", "Distance", "Time", "Grade", "Rank"]}
              rows={a.segmentEfforts.map((e) => [e.name, formatDistance(e.distance), formatDuration(e.elapsed_time), e.average_grade != null ? `${e.average_grade}%` : null, e.pr_rank ? `PR #${e.pr_rank}` : null])}
            />
          </Plate>
        )}

        {more.length > 0 && (
          <Plate kicker="Everything else" title={`${more.length} more columns from Strava`}>
            <details className="ar-details">
              <summary className="ar-chip ar-chip-paper">
                Show them
                <span className="material-symbols-outlined text-sm transition-transform" aria-hidden="true">expand_more</span>
              </summary>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mb-0 mt-4">
                {more.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-1.5" style={{ borderBottom: "1px solid var(--ar-line)" }}>
                    <dt className="ar-fig-label">{k}</dt>
                    <dd className="text-sm tabular-nums text-right mb-0 break-words min-w-0" style={{ color: "var(--ar-ink)" }}>{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </Plate>
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
