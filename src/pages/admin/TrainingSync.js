import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "./ui/PageHeader";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import ProgressBar from "./ui/ProgressBar";
import { Checkbox } from "./ui/Input";
import { Spinner, ErrorState } from "./ui/Feedback";
import { useToast } from "./ui/ToastContext";
import { Activity, RefreshCw } from "./ui/icons";
import { hairline, mutedText } from "./ui/tokens";
import { supabase } from "../../lib/supabaseClient";
import { syncStrava } from "../../lib/api/stravaSync";
import training, { patchActivity } from "../../lib/api/training";
import { formatDistance, matchRace } from "../../lib/strava";

// The "Sync now" button for /training. The endpoint
// (functions/api/strava-sync.js) holds the Strava secrets; this page drives its
// loop one step at a time. The first backfill is better done by
// `npm run strava:import`, which waits out Strava's 15-minute limit — this
// button stops at it and says how many details are still pending.
//
// Below: activities that look like a /sports race (same day, same distance)
// but are not linked yet, each one press away from being linked.

const dt = (iso) => (iso ? new Date(iso).toLocaleString() : "never");

const TrainingSync = () => {
  const [rows, setRows] = useState(null);
  const [sports, setSports] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [full, setFull] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [list, sportRows] = await Promise.all([
        training.list(),
        supabase.from("sports").select("id,title,date,distance").then(({ data, error }) => {
          if (error) throw error;
          return data;
        }),
      ]);
      setRows(list);
      setSports(sportRows);
    } catch (err) {
      setLoadError(err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const list = rows || [];
    return {
      total: list.length,
      hidden: list.filter((r) => !r.visible || r.private || (r.visibility && r.visibility !== "everyone")).length,
      linked: list.filter((r) => r.sportId).length,
      lastSync: list.reduce((max, r) => (r.syncedAt && r.syncedAt > max ? r.syncedAt : max), ""),
    };
  }, [rows]);

  // Unlinked activities that match exactly one race, and races not yet claimed.
  const suggestions = useMemo(() => {
    if (!rows) return [];
    const claimed = new Set(rows.map((r) => r.sportId).filter(Boolean));
    const open = sports.filter((s) => !claimed.has(s.id));
    return rows
      .filter((r) => !r.sportId)
      .map((r) => ({ activity: r, sportId: matchRace(r, open) }))
      .filter((s) => s.sportId)
      .map((s) => ({ ...s, race: sports.find((x) => x.id === s.sportId) }));
  }, [rows, sports]);

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const summary = await syncStrava({ full, onProgress: setProgress });
      setResult(summary);
      toast.success(`Listed ${summary.listed}, read ${summary.details} in detail.`);
      await load();
    } catch (err) {
      toast.error(`Sync stopped: ${err.message}`);
      await load();
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  const link = async ({ activity, race }) => {
    try {
      await patchActivity(activity.id, { sport_id: race.id });
      toast.success(`Linked "${activity.name}" to ${race.title}.`);
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Strava sync"
        description="Copies every Strava activity into /training: summary, splits, laps, best efforts, segments, gear and totals. No photos and no per-second streams. Visibility, race links and tags are yours and never touched."
        actions={(
          <Button variant="ghost" icon={Activity} onClick={() => navigate("/admin/training")}>Edit activities</Button>
        )}
      />

      <Card title="Sync now">
        {loadError && <ErrorState error={loadError} action={<Button onClick={load}>Retry</Button>} />}
        {!loadError && !rows && <Spinner label="Reading stored activities…" />}
        {rows && (
          <div className="flex flex-col gap-3">
            <p className={`text-sm ${mutedText} mb-0`}>
              {`${stats.total} activities stored (${stats.hidden} not public, ${stats.linked} linked to races). Last synced ${dt(stats.lastSync)}.`}
            </p>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="strava-full" className="flex items-center gap-2 text-sm">
              <Checkbox id="strava-full" checked={full} onChange={(e) => setFull(e.target.checked)} disabled={running} />
              Re-list every activity (catches edits to old ones; costs one call per 200)
            </label>
            <div>
              <Button variant="primary" icon={RefreshCw} loading={running} disabled={running} onClick={run}>
                {running ? "Syncing…" : "Sync now"}
              </Button>
            </div>
            {progress && (
              <ProgressBar
                value={null}
                label={{
                  list: `Listing activities… ${progress.listed}`,
                  athlete: "Reading totals and gear…",
                  detail: `Reading details… ${progress.details}${progress.pending != null ? ` (${progress.pending} pending)` : ""}`,
                  done: "Done",
                }[progress.phase]}
              />
            )}
            {result && (
              <div className={`rounded-md border p-3 text-sm flex flex-col gap-1 ${hairline}`}>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="success">{`${result.listed} listed`}</Badge>
                  <Badge>{`${result.details} detailed`}</Badge>
                  {result.pending > 0 && <Badge tone="warning">{`${result.pending} still pending`}</Badge>}
                  {result.athlete && <Badge>{`${result.athlete.gear} gear`}</Badge>}
                </div>
                {result.stopped === "rate_limit" && (
                  <span className={mutedText}>
                    Strava&apos;s rate limit stopped the detail pass. Press again after the next quarter hour, or run
                    {" "}
                    <code>npm run strava:import</code>
                    , which waits on its own.
                  </span>
                )}
                {result.limits && (
                  <span className={mutedText}>
                    {`Budget left: ${result.limits.left15} this quarter hour, ${result.limits.leftDay} today.`}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {rows && (
        <Card
          title="Races to link"
          description="Activities on the same day and distance as a /sports race. Linking shows the activity's splits on the race page."
        >
          {suggestions.length === 0 ? (
            <p className={`text-sm ${mutedText} mb-0`}>Nothing to link.</p>
          ) : (
            <ul className="flex flex-col gap-2 mb-0">
              {suggestions.map((s) => (
                <li key={s.activity.id} className={`flex flex-wrap items-center gap-3 rounded-md border p-2 ${hairline}`}>
                  <span className="text-sm flex-1 min-w-0 truncate">
                    {`${s.activity.name} · ${formatDistance(s.activity.distance)} · ${s.activity.date}`}
                  </span>
                  <span className={`text-xs ${mutedText}`}>{`→ ${s.race.title}`}</span>
                  <Button size="xs" variant="secondary" onClick={() => link(s)}>Link</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
};

export default TrainingSync;
